"use client"

import React from "react"

import { usePlayerStore } from "@/components/hooks/use-player"

export interface UseFullscreenReturn {
  /** Whether the player root element is currently fullscreen. */
  isFullscreen: boolean
  /** Whether the browser supports the Fullscreen API. */
  supported: boolean
  /** Exit fullscreen if active. */
  exit: () => Promise<void>
  /** Enter fullscreen on the player root. */
  enter: () => Promise<void>
  /** Toggle fullscreen on the player root. */
  toggle: () => Promise<void>
}

export function useFullscreen(): UseFullscreenReturn {
  const containerRef = usePlayerStore((state) => state.containerRef)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const supported =
    typeof document !== "undefined" && Boolean(document.fullscreenEnabled)

  React.useEffect(() => {
    if (!containerRef) return

    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef)
    }

    document.addEventListener("fullscreenchange", onChange)
    document.addEventListener("webkitfullscreenchange", onChange)

    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      document.removeEventListener("webkitfullscreenchange", onChange)
    }
  }, [containerRef])

  const enter = React.useCallback(async () => {
    const el = containerRef
    if (!el || !supported) return
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else {
        const webkitEl = el as HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void>
        }
        await webkitEl.webkitRequestFullscreen?.()
      }
    } catch {
      // Ignore fullscreen request failures (e.g. permission/gesture).
    }
  }, [containerRef, supported])

  const exit = React.useCallback(async () => {
    if (!supported) return
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      }
      // Safari (<15) resolves the promise on the element instead of document.
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>
      }
      if (!document.fullscreenElement) await doc.webkitExitFullscreen?.()
    } catch {
      // Ignore exit failures.
    }
  }, [supported])

  const toggle = React.useCallback(() => {
    return isFullscreen ? exit() : enter()
  }, [exit, enter, isFullscreen])

  return { isFullscreen, supported, enter, exit, toggle }
}
