"use client"

import { useEffect, useState } from "react"
import { ArrowsInSimple, ArrowsOutSimple } from "@phosphor-icons/react"

import { Button } from "@/components/video-player/components/button"
import { usePlayerStore } from "@/components/hooks/use-player"

/**
 * Fullscreen toggle. Uses the player's root container element (exposed on the
 * player store) so the whole player frame goes fullscreen, not just the raw
 * <video> element.
 */
export function FullscreenControl() {
  const containerRef = usePlayerStore((state) => state.containerRef)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggle = () => {
    if (!containerRef) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void containerRef.requestFullscreen?.()
    }
  }

  return (
    <Button
      className="cursor-pointer"
      size="icon"
      variant="glass"
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
    >
      {isFullscreen ? (
        <ArrowsInSimple weight="bold" />
      ) : (
        <ArrowsOutSimple weight="bold" />
      )}
    </Button>
  )
}
