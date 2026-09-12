import { useEffect, useLayoutEffect, useRef } from 'react'
import drawScene from '../render/drawScene'

/**
 * Drives the arena's requestAnimationFrame loop.
 *
 * The loop is created ONCE per mount. It reads live data through a ref that is
 * refreshed on every render, rather than by re-creating the effect when props
 * change -- the "latest ref" pattern.
 *
 * This is what fixes the frozen animation clock. The old effect listed tanks,
 * bullets, crates and score in its dependency array, and the host replaces all
 * of those ~31x/sec, so the effect tore down and rebuilt roughly every 32ms and
 * `startTime` reset with it. `elapsed` never got past ~32ms, which left every
 * animation keyed to it stuck on its first frame: water ripples, the crate
 * pulse and the recon-drone rotors.
 *
 * Because the loop no longer restarts, this ref IS the only path for fresh
 * data. If it ever stops being updated the battlefield freezes outright, which
 * is a far louder failure than the one being fixed -- worth knowing when
 * touching this.
 */
export default function useArenaRenderer(canvasRef, scene) {
  const sceneRef = useRef(scene)

  // Refreshed after every render, with no dependency array. useLayoutEffect
  // rather than useEffect so it flushes before paint -- a rAF callback can run
  // before a passive effect does, and would then draw a frame-stale scene.
  useLayoutEffect(() => {
    sceneRef.current = scene
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId
    const startTime = performance.now()

    const render = (now) => {
      drawScene(ctx, sceneRef.current, { now, elapsed: now - startTime })
      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [canvasRef])
}
