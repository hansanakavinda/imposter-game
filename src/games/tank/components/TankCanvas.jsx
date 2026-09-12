import React, { useRef } from 'react'
import { getCanvasSize, pointerToWorld } from '../utils/arenaGeometry'
import useArenaRenderer from '../hooks/useArenaRenderer'

export default function TankCanvas({
  tanks,
  bullets,
  obstacles,
  barrels,
  crates,
  pings,
  mySlotId,
  score,
  targetScore,
  roundStatus, // 'playing', 'round_win', 'match_over'
  roundWinner,
  is2v2,
  isPortrait = false,
  onCanvasPointerMove,
  onCanvasPointerDown,
  onCanvasContextMenu,
}) {
  const canvasRef = useRef(null)

  useArenaRenderer(canvasRef, {
    tanks,
    bullets,
    obstacles,
    barrels,
    crates,
    pings,
    mySlotId,
    score,
    targetScore,
    roundStatus,
    roundWinner,
    is2v2,
    isPortrait,
  })

  // Mouse / Touch event coordinates translated into virtual (1000x650) space.
  // The inverse transform lives in arenaGeometry next to its forward twin.
  const getArenaCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    return pointerToWorld(clientX, clientY, canvas.getBoundingClientRect(), isPortrait)
  }

  const handlePointerMove = (e) => {
    if (onCanvasPointerMove) {
      onCanvasPointerMove(getArenaCoords(e))
    }
  }

  const handlePointerDown = (e) => {
    if (e.button === 2) {
      // Right click -> Radar Ping
      e.preventDefault()
      if (onCanvasContextMenu) {
        onCanvasContextMenu(getArenaCoords(e))
      }
    } else if (onCanvasPointerDown) {
      onCanvasPointerDown(getArenaCoords(e))
    }
  }

  return (
    <div
      className={`relative flex items-center justify-center select-none overflow-hidden touch-none ${
        isPortrait
          ? 'w-full h-full max-h-[100dvh] mx-auto'
          : 'w-full max-w-5xl mx-auto rounded-2xl'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={getCanvasSize(isPortrait).width}
        height={getCanvasSize(isPortrait).height}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => {
          e.preventDefault()
          if (onCanvasContextMenu) {
            onCanvasContextMenu(getArenaCoords(e))
          }
        }}
        className={`block object-contain cursor-crosshair rounded-slab border border-edge shadow-lift-3 bg-well ${
          isPortrait
            ? 'h-full w-auto max-w-full max-h-[100dvh] aspect-[650/1000]'
            : 'w-full h-auto aspect-[1000/650]'
        }`}
      />
    </div>
  )
}
