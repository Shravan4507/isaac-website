import { useEffect, useRef, useMemo, useState } from 'react'
import constellationsData from '../../../data/constellations/constellations.json'
import starsData from '../../../data/constellations/stars.json'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'
import './Constellation.css'

interface ConstellationData {
  id: string
  abbreviation: string
  latinName: string
  englishName: string
  starIds: number[]
  lines: number[][]
}

interface StarData {
  hip: number
  rightAscension: number
  declination: number
  distance: number
  magnitude: number
}

interface Star3D {
  id: number
  x: number // X coordinate (-30 to 30)
  y: number // Y coordinate (-30 to 30)
  z: number // Z coordinate (-20 to 20) for 3D depth
  magnitude: number // Star size multiplier
}

interface Connection {
  from: number
  to: number
}

// Map a value from one range to another
function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return (outMin + outMax) / 2
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

export default function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(true)
  const perfTier = usePerformanceTier()

  const constellations = constellationsData as ConstellationData[]

  // Select a random constellation once on mount (so it is stable for the session)
  const chosenConstellation = useMemo(() => {
    if (constellations.length === 0) return null
    const randomIndex = Math.floor(Math.random() * constellations.length)
    return constellations[randomIndex]
  }, [constellations])

  // Build star lookup map once
  const starMap = useMemo(() => {
    const map = new Map<number, StarData>()
    for (const star of starsData as StarData[]) {
      map.set(star.hip, star)
    }
    return map
  }, [])

  // Process stars and lines into 3D structure for projection
  const { stars3D, connections } = useMemo(() => {
    if (!chosenConstellation) {
      return { stars3D: [], connections: [] }
    }

    const stars = chosenConstellation.starIds
      .map((id) => starMap.get(id))
      .filter(Boolean) as StarData[]

    if (stars.length === 0) {
      return { stars3D: [], connections: [] }
    }

    // Handle RA wrapping
    let ras = stars.map((s) => s.rightAscension)
    const rawRange = Math.max(...ras) - Math.min(...ras)
    let raWrapped = false
    if (rawRange > 12) {
      ras = ras.map((ra) => (ra < 12 ? ra + 24 : ra))
      raWrapped = true
    }

    const decs = stars.map((s) => s.declination)
    const dists = stars.map((s) => s.distance)

    const minRA = Math.min(...ras)
    const maxRA = Math.max(...ras)
    const minDec = Math.min(...decs)
    const maxDec = Math.max(...decs)
    const minDist = Math.min(...dists)
    const maxDist = Math.max(...dists)

    const stars3D: Star3D[] = stars.map((star) => {
      let ra = star.rightAscension
      if (raWrapped && ra < 12) ra += 24

      // Map RA/Dec to x/y centered in [-30, 30] space
      const x = mapRange(ra, minRA, maxRA, 30, -30)
      const y = mapRange(star.declination, minDec, maxDec, 30, -30)

      // Map distance to z centered in [-20, 20] space
      const z = minDist === maxDist ? 0 : mapRange(star.distance, minDist, maxDist, -20, 20)

      // Magnitude multiplier (brighter stars are larger)
      const clampedMag = Math.max(-1, Math.min(7, star.magnitude))
      const magnitudeVal = mapRange(clampedMag, -1, 7, 2.5, 1.0)

      return {
        id: star.hip,
        x,
        y,
        z,
        magnitude: magnitudeVal
      }
    })

    const connections: Connection[] = []
    chosenConstellation.lines.forEach((polyline) => {
      for (let i = 0; i < polyline.length - 1; i++) {
        connections.push({
          from: polyline[i],
          to: polyline[i + 1]
        })
      }
    })

    return { stars3D, connections }
  }, [chosenConstellation, starMap])

  // Observe container visibility to pause calculations when out of viewport
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.02 }
    )
    observer.observe(container)
    return () => {
      observer.unobserve(container)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || stars3D.length === 0 || !isInView) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    let angleY = 0 // Horizontal rotation angle
    let time = 0

    // FPS control throttle for low performance devices
    const fpsLimit = perfTier === 'high' ? 60 : 30
    const frameInterval = 1000 / fpsLimit
    let lastFrameTime = 0

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
    const twinkleSpeeds = stars3D.map(() => 0.03 + Math.random() * 0.03)
    const twinkleOffsets = stars3D.map(() => Math.random() * Math.PI * 2)

    const render = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(render)

      // Throttle rendering if limit is set
      const elapsed = timestamp - lastFrameTime
      if (elapsed < frameInterval) {
        return
      }
      lastFrameTime = timestamp - (elapsed % frameInterval)

      time += 0.04
      angleY += 0.006 // Rotate Y-axis (Spin)
      const angleX = 0.4 + Math.sin(time * 0.1) * 0.1 // Slight pitch wobble for full 3D feel

      ctx.clearRect(0, 0, width, height)

      // Scale multiplier to fit coords
      const baseScale = Math.min(width, height) * 0.01

      // 3D camera parameters
      const cameraDistance = 100 // Perspective camera depth distance

      // Project 3D points to 2D
      const projectedStars = stars3D.map((star, idx) => {
        // 1. Rotate Y-axis (Yaw)
        const cosY = Math.cos(angleY)
        const sinY = Math.sin(angleY)
        const x1 = star.x * cosY - star.z * sinY
        const z1 = star.x * sinY + star.z * cosY

        // 2. Rotate X-axis (Pitch tilt)
        const cosX = Math.cos(angleX)
        const sinX = Math.sin(angleX)
        const y2 = star.y * cosX - z1 * sinX
        const z2 = star.y * sinX + z1 * cosX

        // 3. Perspective Projection
        const scaleFactor = cameraDistance / (cameraDistance + z2)

        const pxX = width / 2 + x1 * scaleFactor * baseScale
        const pxY = height / 2 + y2 * scaleFactor * baseScale

        return {
          id: star.id,
          pxX,
          pxY,
          depth: z2,
          scaleFactor,
          magnitude: star.magnitude,
          idx
        }
      })

      // Sort projected stars by depth (painter's algorithm)
      const starMapObj = new Map(projectedStars.map(s => [s.id, s]))

      // Draw Connections (Lines)
      connections.forEach(conn => {
        const fromStar = starMapObj.get(conn.from)
        const toStar = starMapObj.get(conn.to)
        if (fromStar && toStar) {
          const avgScale = (fromStar.scaleFactor + toStar.scaleFactor) / 2
          const baseAlpha = 0.12
          const depthAlpha = baseAlpha * Math.pow(avgScale, 2.5)

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

        if (perfTier === 'high') {
          // Glow effect via CPU filters (High Spec Devices)
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur = Math.max(1, 8 * star.scaleFactor)
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.5 + 0.5 * star.scaleFactor)})`
          ctx.beginPath()
          ctx.arc(star.pxX, star.pxY, finalRadius, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Glow effect via concentric geometry paths (Low Spec Devices)
          // Draw outer halo glow
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.2, 0.15 * star.scaleFactor)})`
          ctx.beginPath()
          ctx.arc(star.pxX, star.pxY, finalRadius * 3, 0, Math.PI * 2)
          ctx.fill()

          // Draw star core
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.7 + 0.3 * star.scaleFactor)})`
          ctx.beginPath()
          ctx.arc(star.pxX, star.pxY, finalRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      if (perfTier === 'high') {
        ctx.shadowBlur = 0
        ctx.shadowColor = 'transparent'
      }
    }

    // Pass starting timestamp to the loop
    animationFrameId = requestAnimationFrame((timestamp) => {
      lastFrameTime = timestamp
      render(timestamp)
    })

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [stars3D, connections, isInView, perfTier])

  return (
    <div ref={containerRef} className="constellation-widget-container">
      <canvas ref={canvasRef} className="constellation-canvas" />
      {chosenConstellation && (
        <div className="constellation-widget-label">
          <span className="constellation-widget-title">{chosenConstellation.englishName}</span>
          <span className="constellation-widget-subtitle">{chosenConstellation.latinName}</span>
        </div>
      )}
    </div>
  )
}
