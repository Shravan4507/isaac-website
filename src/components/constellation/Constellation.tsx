import { useEffect, useRef } from 'react'
import './Constellation.css'

interface Star3D {
  id: number
  x: number // X coordinate (-50 to 50)
  y: number // Y coordinate (-50 to 50)
  z: number // Z coordinate (-50 to 50) for 3D depth
  magnitude: number // Star size multiplier
}

interface Connection {
  from: number
  to: number
}

// Orion constellation stars mapped in 3D space
const ORION_STARS: Star3D[] = [
  { id: 1, x: 0, y: -38, z: 0, magnitude: 1.4 },     // Meissa (Head)
  { id: 2, x: -18, y: -28, z: -15, magnitude: 2.6 },  // Betelgeuse (Shoulder - depth back)
  { id: 3, x: 18, y: -25, z: 15, magnitude: 2.0 },    // Bellatrix (Shoulder - depth front)
  { id: 4, x: -6, y: 0, z: -8, magnitude: 1.8 },      // Alnitak (Belt Left)
  { id: 5, x: 0, y: 0, z: 0, magnitude: 2.0 },       // Alnilam (Belt Center)
  { id: 6, x: 6, y: 0, z: 8, magnitude: 1.8 },       // Mintaka (Belt Right)
  { id: 7, x: -15, y: 30, z: -10, magnitude: 1.9 },   // Saiph (Knee)
  { id: 8, x: 15, y: 28, z: 10, magnitude: 2.8 },     // Rigel (Foot)
]

const ORION_CONNECTIONS: Connection[] = [
  { from: 1, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 6 },
  { from: 4, to: 5 },
  { from: 5, to: 6 },
  { from: 4, to: 7 },
  { from: 6, to: 8 },
  { from: 7, to: 8 },
]

export default function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    let angleY = 0 // Horizontal rotation angle
    let time = 0

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener('resize', resize)

    // Twinkle offsets for stars
    const twinkleSpeeds = ORION_STARS.map(() => 0.03 + Math.random() * 0.03)
    const twinkleOffsets = ORION_STARS.map(() => Math.random() * Math.PI * 2)

    const render = () => {
      time += 0.04
      angleY += 0.006 // Rotate Y-axis (Spin)
      const angleX = 0.4 + Math.sin(time * 0.1) * 0.1 // Slight pitch wobble for full 3D feel

      ctx.clearRect(0, 0, width, height)

      // Scale multiplier to fit coords
      const baseScale = Math.min(width, height) * 0.01

      // 3D camera parameters
      const cameraDistance = 100 // Perspective camera depth distance

      // Project 3D points to 2D
      const projectedStars = ORION_STARS.map((star, idx) => {
        // 1. Rotate around Y-axis (Yaw)
        const cosY = Math.cos(angleY)
        const sinY = Math.sin(angleY)
        const x1 = star.x * cosY - star.z * sinY
        const z1 = star.x * sinY + star.z * cosY

        // 2. Rotate around X-axis (Pitch tilt)
        const cosX = Math.cos(angleX)
        const sinX = Math.sin(angleX)
        const y2 = star.y * cosX - z1 * sinX
        const z2 = star.y * sinX + z1 * cosX

        // 3. Perspective Projection
        // z2 acts as the depth relative to center. If z2 is positive, it's further away.
        const scaleFactor = cameraDistance / (cameraDistance + z2)
        
        const pxX = width / 2 + x1 * scaleFactor * baseScale
        const pxY = height / 2 + y2 * scaleFactor * baseScale

        return {
          id: star.id,
          pxX,
          pxY,
          depth: z2, // Store depth for depth-cueing and sorting
          scaleFactor,
          magnitude: star.magnitude,
          idx
        }
      })

      // Sort projected stars by depth (painter's algorithm) so back lines are drawn first
      // Note: we need original index reference for lines connection
      const starMap = new Map(projectedStars.map(s => [s.id, s]))

      // Draw Connections (Lines)
      ORION_CONNECTIONS.forEach(conn => {
        const fromStar = starMap.get(conn.from)
        const toStar = starMap.get(conn.to)
        if (fromStar && toStar) {
          // Fade line opacity based on depth (average scale factor)
          const avgScale = (fromStar.scaleFactor + toStar.scaleFactor) / 2
          const baseAlpha = 0.12
          const depthAlpha = baseAlpha * Math.pow(avgScale, 2.5) // Higher power increases depth separation contrast

          ctx.strokeStyle = `rgba(240, 240, 250, ${Math.max(0.02, depthAlpha)})`
          ctx.lineWidth = Math.max(0.5, 1 * avgScale)
          ctx.beginPath()
          ctx.moveTo(fromStar.pxX, fromStar.pxY)
          ctx.lineTo(toStar.pxX, toStar.pxY)
          ctx.stroke()
        }
      })

      // Draw Stars
      projectedStars.forEach(star => {
        const twinkle = 0.75 + 0.25 * Math.sin(time * twinkleSpeeds[star.idx] * 5 + twinkleOffsets[star.idx])
        const finalRadius = Math.max(0.2, star.magnitude * star.scaleFactor * twinkle)

        // Depth cueing for shadows & glow
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = Math.max(1, 8 * star.scaleFactor)
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.5 + 0.5 * star.scaleFactor)})`

        ctx.beginPath()
        ctx.arc(star.pxX, star.pxY, finalRadius, 0, Math.PI * 2)
        ctx.fill()
      })

      // Reset shadows
      ctx.shadowBlur = 0
      ctx.shadowColor = 'transparent'

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className="constellation-widget-container">
      <canvas ref={canvasRef} className="constellation-canvas" />
    </div>
  )
}
