"use client"

import { ArrowsInSimple, ArrowsOutSimple } from "@phosphor-icons/react"

import { Button } from "@/components/video-player/components/button"
import { useFullscreen } from "@/components/hooks/use-fullscreen"

export function FullscreenControl() {
  const { isFullscreen, supported, toggle } = useFullscreen()

  if (!supported) return null

  return (
    <Button
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className="cursor-pointer"
      onClick={() => toggle()}
      size="icon"
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      variant="glass"
    >
      {isFullscreen ? (
        <ArrowsInSimple weight="bold" />
      ) : (
        <ArrowsOutSimple weight="bold" />
      )}
    </Button>
  )
}
