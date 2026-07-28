import { useState, useMemo, useRef, useEffect } from 'react'
import constellationsData from '../../../data/constellations/constellations.json'
import starsData from '../../../data/constellations/stars.json'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'
import './Constellations.css'

interface ConstellationData {
  id: string
  abbreviation: string
  latinName: string
  englishName: string
  nickname: string
  description: string
  mythology: string
  interestingFacts: string[]
  season: string
  hemisphere: string
  area: number | null
  rank: number | null
  centroid: { ra: number; dec: number }
  starIds: number[]
  mainStarIds: number[]
  lines: number[][]
  bestViewingMonths: string[]
  visibility: { north: string | null; south: string | null; bestMonths: string[] }
  deepSkyObjects: string[]
  meteorShowers: string[]
  gallery: string[]
  resources: string[]
  relatedConstellations: string[]
  image: string | null
  wiki: string | null
  iau: string | null
}

interface StarData {
  hip: number
  name: string | null
  bayer: string | null
  flamsteed: number | null
  rightAscension: number
  declination: number
  distance: number
  magnitude: number
  spectralClass: string
  colorIndex: number
  luminosity: number
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

// Star color from B-V color index (spectral appearance)
function getStarColor(colorIndex: number): string {
  if (colorIndex < -0.1) return '#a8c8ff' // Blue
  if (colorIndex < 0.3) return '#eeeeff' // White-blue
  if (colorIndex < 0.6) return '#fff8e7' // Yellow-white
  if (colorIndex < 1.0) return '#ffd2a1' // Orange
  return '#ffaa80' // Red-orange
}

// Star dot radius from apparent magnitude (brighter = lower mag = bigger)
function getStarRadius(magnitude: number): number {
  const clamped = Math.max(-1, Math.min(7, magnitude))
  return mapRange(clamped, -1, 7, 7, 1.5)
}

export default function Constellations() {
  const perfTier = usePerformanceTier()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string>('ori')

  // Pan & Zoom & View mode interactive state (unified to avoid render lag / jumps)
  const [transform, setTransform] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showLines, setShowLines] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  // Star selection and click tracking state
  const [selectedStarHip, setSelectedStarHip] = useState<number | null>(null)
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 })
  const [touchState, setTouchState] = useState<{
    mode: 'none' | 'drag' | 'pinch'
    initialDist: number
    initialZoom: number
    initialPan: { x: number; y: number }
    touchStartPos: { x: number; y: number }
  }>({
    mode: 'none',
    initialDist: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    touchStartPos: { x: 0, y: 0 },
  })

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const constellations = constellationsData as ConstellationData[]

  // Convert screen pixel coordinates to SVG viewBox coordinates.
  // Uses getScreenCTM() which correctly handles preserveAspectRatio
  // letterboxing — the naive (px / width) * viewBoxWidth formula is
  // wrong when the SVG content area doesn't fill its container.
  const screenToSvg = (screenX: number, screenY: number): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(screenX, screenY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y }
  }

  // Native non-passive listener to handle scroll wheel zoom & prevent outer page scroll
  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const svg = svgRef.current
      if (!svg) return

      const ctm = svg.getScreenCTM()
      if (!ctm) return

      // Exact mouse position in SVG viewBox coordinates
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
      const mouseX = pt.x
      const mouseY = pt.y

      const zoomFactor = 1.15
      const direction = e.deltaY < 0 ? 1 : -1

      setTransform((prev) => {
        const newZoom =
          direction > 0
            ? Math.min(prev.zoom * zoomFactor, 12)
            : Math.max(prev.zoom / zoomFactor, 0.6)

        const scaleChange = newZoom / prev.zoom
        const newPanX = mouseX - (mouseX - prev.pan.x) * scaleChange
        const newPanY = mouseY - (mouseY - prev.pan.y) * scaleChange

        return {
          zoom: newZoom,
          pan: { x: newPanX, y: newPanY }
        }
      })
    }

    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheelNative)
    }
  }, [])

  // Build star lookup map once (HIP ID → StarData)
  const starMap = useMemo(() => {
    const map = new Map<number, StarData>()
    for (const star of starsData as StarData[]) {
      map.set(star.hip, star)
    }
    return map
  }, [])

  const selectedConstellation = useMemo(() => {
    return constellations.find((c) => c.id === selectedId) || constellations[0]
  }, [selectedId, constellations])

  const selectedStar = useMemo(() => {
    if (!selectedStarHip) return null
    return starMap.get(selectedStarHip) || null
  }, [selectedStarHip, starMap])

  // Compute SVG map data for the selected constellation
  const mapData = useMemo(() => {
    if (!selectedConstellation) return null

    const stars = selectedConstellation.starIds
      .map((id) => starMap.get(id))
      .filter(Boolean) as StarData[]

    if (stars.length === 0) return null

    // Handle RA wrapping around 0h/24h boundary
    let ras = stars.map((s) => s.rightAscension)
    const rawRange = Math.max(...ras) - Math.min(...ras)
    let raWrapped = false

    if (rawRange > 12) {
      ras = ras.map((ra) => (ra < 12 ? ra + 24 : ra))
      raWrapped = true
    }

    const decs = stars.map((s) => s.declination)

    let minRA = Math.min(...ras)
    let maxRA = Math.max(...ras)
    let minDec = Math.min(...decs)
    let maxDec = Math.max(...decs)

    // Add padding (20% on each side for breathing room)
    const raSpan = maxRA - minRA || 1
    const decSpan = maxDec - minDec || 1
    const pad = 0.2
    minRA -= raSpan * pad
    maxRA += raSpan * pad
    minDec -= decSpan * pad
    maxDec += decSpan * pad

    const svgW = 1000
    const svgH = 600

    // Map each star to SVG coordinates
    const starPositions = stars.map((star) => {
      let ra = star.rightAscension
      if (raWrapped && ra < 12) ra += 24

      // Invert RA so constellations appear as seen from Earth (RA increases right-to-left)
      const x = mapRange(ra, minRA, maxRA, svgW - 50, 50)
      // Invert Dec (higher Dec = higher on screen = lower SVG y)
      const y = mapRange(star.declination, minDec, maxDec, svgH - 50, 50)

      return {
        star,
        x,
        y,
        radius: getStarRadius(star.magnitude),
        color: getStarColor(star.colorIndex),
        isMain: selectedConstellation.mainStarIds.includes(star.hip),
      }
    })

    // Position lookup by HIP for line drawing
    const posMap = new Map<number, { x: number; y: number }>()
    for (const sp of starPositions) {
      posMap.set(sp.star.hip, { x: sp.x, y: sp.y })
    }

    // Build line segments from constellation.lines (each sub-array is a polyline)
    const lineSegments: { x1: number; y1: number; x2: number; y2: number }[] =
      []
    for (const polyline of selectedConstellation.lines) {
      for (let i = 0; i < polyline.length - 1; i++) {
        const from = posMap.get(polyline[i])
        const to = posMap.get(polyline[i + 1])
        if (from && to) {
          lineSegments.push({
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
          })
        }
      }
    }

    return { starPositions, lineSegments, svgW, svgH }
  }, [selectedConstellation, starMap])

  // Named main stars for the info panel
  const mainStars = useMemo(() => {
    if (!selectedConstellation) return []
    return selectedConstellation.mainStarIds
      .map((id) => starMap.get(id))
      .filter(Boolean) as StarData[]
  }, [selectedConstellation, starMap])

  // Map Reset interaction handler
  const handleReset = () => {
    setTransform({ zoom: 1, pan: { x: 0, y: 0 } })
    setSelectedStarHip(null)
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation()
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setDragStart({ x: e.clientX - transform.pan.x, y: e.clientY - transform.pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation()
    if (!isDragging) return
    setTransform((prev) => ({
      ...prev,
      pan: {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }
    }))
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleMapClick = (e: React.MouseEvent) => {
    const distMoved = Math.hypot(
      e.clientX - mouseDownPos.x,
      e.clientY - mouseDownPos.y
    )
    if (distMoved < 5) {
      setSelectedStarHip(null)
    }
  }

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation()
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setMouseDownPos({ x: touch.clientX, y: touch.clientY })
      setDragStart({ x: touch.clientX - transform.pan.x, y: touch.clientY - transform.pan.y })
      setTouchState((prev) => ({ ...prev, mode: 'drag' }))
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

      setTouchState({
        mode: 'pinch',
        initialDist: dist,
        initialZoom: transform.zoom,
        initialPan: { ...transform.pan },
        touchStartPos: {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        },
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation()
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      setTransform((prev) => ({
        ...prev,
        pan: {
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        }
      }))
    } else if (e.touches.length === 2 && touchState.mode === 'pinch') {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const currentDist = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
      )

      if (touchState.initialDist > 0) {
        const scaleFactor = currentDist / touchState.initialDist
        const newZoom = Math.max(
          0.6,
          Math.min(12, touchState.initialZoom * scaleFactor)
        )

        // Use getScreenCTM for correct pinch center in SVG viewBox coords
        const svgPt = screenToSvg(
          touchState.touchStartPos.x,
          touchState.touchStartPos.y
        )
        if (svgPt) {
          const scaleChange = newZoom / touchState.initialZoom
          const newPanX = svgPt.x - (svgPt.x - touchState.initialPan.x) * scaleChange
          const newPanY = svgPt.y - (svgPt.y - touchState.initialPan.y) * scaleChange

          setTransform({
            zoom: newZoom,
            pan: { x: newPanX, y: newPanY }
          })
        }
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation()
    if (e.touches.length < 2) {
      setTouchState((prev) => ({ ...prev, mode: 'none' }))
    }
    if (e.touches.length === 0) {
      setIsDragging(false)
    }
  }

  const filteredConstellations = constellations.filter((c) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      c.englishName.toLowerCase().includes(term) ||
      c.latinName.toLowerCase().includes(term) ||
      c.abbreviation.toLowerCase().includes(term)
    )
  })

  return (
    <div className="constellations-page-container">
      <div className="constellations-split-view">
        {/* Left Section: 32% Width Container */}
        <aside className="constellations-sidebar-card constellations-glass-card">
          <div className="sidebar-card-header">
            <h1 className="sidebar-hero-title">
              Capture the beauty of finding connections
            </h1>

            <div className="constellation-search-box">
              <span className="search-icon-span">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search constellations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="constellation-list">
            {filteredConstellations.map((constellation) => (
              <div
                key={constellation.id}
                className={`constellation-item-card ${selectedId === constellation.id ? 'active' : ''
                  }`}
                onClick={() => {
                  setSelectedId(constellation.id)
                  setTransform({ zoom: 1, pan: { x: 0, y: 0 } })
                  setIsDragging(false)
                  setSelectedStarHip(null)
                }}
              >
                <span className="constellation-english-name">
                  {constellation.englishName}
                </span>
                <span className="constellation-latin-sub">
                  {constellation.latinName} ({constellation.abbreviation})
                </span>
              </div>
            ))}

            {filteredConstellations.length === 0 && (
              <div className="no-results-msg">
                No constellations match "{searchTerm}"
              </div>
            )}
          </div>
        </aside>

        {/* Right Section: 68% Width Main Content (Split 60% Top / 40% Bottom) */}
        <main className="constellations-main-content">
          {/* ── Top: Constellation Star Map ── */}
          <div ref={mapContainerRef} className="constellations-glass-card main-content-top">
            {mapData && (
              <svg
                ref={svgRef}
                className="constellation-svg-map"
                viewBox={`0 0 ${mapData.svgW} ${mapData.svgH}`}
                preserveAspectRatio="xMidYMid meet"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleMapClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
              >
                <defs>
                  <filter
                    id="starGlow"
                    x="-100%"
                    y="-100%"
                    width="300%"
                    height="300%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="4"
                      result="blur"
                    />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter
                    id="lineGlow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="2"
                      result="blur"
                    />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Apply zoom and pan transform */}
                <g transform={`translate(${transform.pan.x}, ${transform.pan.y}) scale(${transform.zoom})`}>
                  {/* Constellation connecting lines */}
                  {showLines &&
                    mapData.lineSegments.map((seg, i) => (
                      <g key={`line-group-${i}`}>
                        {perfTier === 'high' ? (
                          <line
                            x1={seg.x1}
                            y1={seg.y1}
                            x2={seg.x2}
                            y2={seg.y2}
                            stroke="rgba(255, 255, 255, 0.25)"
                            strokeWidth="1.2"
                            filter="url(#lineGlow)"
                          />
                        ) : (
                          <>
                            {/* Fast double-line glow representation */}
                            <line
                              x1={seg.x1}
                              y1={seg.y1}
                              x2={seg.x2}
                              y2={seg.y2}
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="3.5"
                            />
                            <line
                              x1={seg.x1}
                              y1={seg.y1}
                              x2={seg.x2}
                              y2={seg.y2}
                              stroke="rgba(255, 255, 255, 0.35)"
                              strokeWidth="1.0"
                            />
                          </>
                        )}
                      </g>
                    ))}

                  {/* Star dots */}
                  {mapData.starPositions.map((sp) => {
                    const isSelectedStar = selectedStarHip === sp.star.hip
                    const isClickable = !!(
                      sp.star.name ||
                      sp.star.bayer ||
                      sp.star.flamsteed
                    )

                    return (
                      <g
                        key={sp.star.hip}
                        onClick={(e) => {
                          e.stopPropagation()
                          const distMoved = Math.hypot(
                            e.clientX - mouseDownPos.x,
                            e.clientY - mouseDownPos.y
                          )
                          if (distMoved < 5 && isClickable) {
                            setSelectedStarHip((prev) =>
                              prev === sp.star.hip ? null : sp.star.hip
                            )
                          }
                        }}
                        style={{ cursor: isClickable ? 'pointer' : 'inherit' }}
                      >
                        {/* Selected pulse animation */}
                        {isSelectedStar && (
                          <circle
                            cx={sp.x}
                            cy={sp.y}
                            r={sp.radius * 4.5}
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            className="active-star-pulse"
                          />
                        )}

                        {/* Outer glow halo */}
                        <circle
                          cx={sp.x}
                          cy={sp.y}
                          r={sp.radius * (isSelectedStar ? 4 : 3)}
                          fill={isSelectedStar ? '#a855f7' : sp.color}
                          opacity={isSelectedStar ? 0.35 : (perfTier === 'high' ? 0.08 : 0.15)}
                        />

                        {/* Core star body */}
                        <circle
                          cx={sp.x}
                          cy={sp.y}
                          r={sp.radius * (isSelectedStar ? 1.4 : 1)}
                          fill={isSelectedStar ? '#ffffff' : sp.color}
                          filter={perfTier === 'high' ? "url(#starGlow)" : undefined}
                        />

                        {/* Star name label (named main stars only) */}
                        {showLabels && sp.isMain && sp.star.name && (
                          <text
                            x={sp.x}
                            y={sp.y - sp.radius - 8}
                            textAnchor="middle"
                            fill={
                              isSelectedStar
                                ? '#ffffff'
                                : 'rgba(255, 255, 255, 0.55)'
                            }
                            fontSize="13"
                            fontFamily="D-Din-Bold, sans-serif"
                          >
                            {sp.star.name}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>
            )}

            {/* Constellations Map Controls Container */}
            <div className="constellations-map-controls-container">
              <div className="map-style-selector">
                <button
                  className="style-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReset()
                  }}
                  title="Reset View"
                >
                  Reset
                </button>
                <button
                  className={`style-btn ${showLines ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowLines((prev) => !prev)
                  }}
                  title="Toggle Lines"
                >
                  Lines
                </button>
                <button
                  className={`style-btn ${showLabels ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowLabels((prev) => !prev)
                  }}
                  title="Toggle Labels"
                >
                  Labels
                </button>
              </div>
            </div>

            {/* Clicked Star Details Card Overlay */}
            {selectedStar && (
              <div className="clicked-star-card">
                <div className="star-card-header">
                  <div className="star-card-title-group">
                    <span className="star-card-name">
                      {selectedStar.name ||
                        selectedStar.bayer ||
                        `HIP ${selectedStar.hip}`}
                    </span>
                    {selectedStar.bayer && selectedStar.name && (
                      <span className="star-card-bayer">({selectedStar.bayer})</span>
                    )}
                  </div>
                  <button
                    className="star-card-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedStarHip(null)
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="star-card-details">
                  <div className="star-card-row">
                    <span className="star-detail-label">Magnitude:</span>
                    <span className="star-detail-val">
                      {selectedStar.magnitude.toFixed(2)} mag
                    </span>
                  </div>
                  <div className="star-card-row">
                    <span className="star-detail-label">Spectral Class:</span>
                    <span className="star-detail-val">
                      {selectedStar.spectralClass || 'N/A'}
                    </span>
                  </div>
                  <div className="star-card-row">
                    <span className="star-detail-label">Distance:</span>
                    <span className="star-detail-val">
                      {(selectedStar.distance * 3.26156).toFixed(1)} ly
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Constellation name watermark */}
            {selectedConstellation && (
              <span className="map-constellation-label">
                {selectedConstellation.englishName}
              </span>
            )}
          </div>

          {/* ── Bottom: Constellation Info Panel ── */}
          <div className="constellations-glass-card main-content-bottom">
            {selectedConstellation && (
              <div className="constellation-info-panel">
                <div className="info-header-row">
                  <div className="info-name-block">
                    <h2 className="info-english-name">
                      {selectedConstellation.englishName}
                    </h2>
                    <span className="info-latin-name">
                      {selectedConstellation.latinName} (
                      {selectedConstellation.abbreviation})
                    </span>
                  </div>

                  <div className="info-tags-row">
                    {selectedConstellation.season && (
                      <span className="info-tag">
                        {selectedConstellation.season}
                      </span>
                    )}
                    {selectedConstellation.hemisphere && (
                      <span className="info-tag">
                        {selectedConstellation.hemisphere}
                      </span>
                    )}
                    <span className="info-tag">
                      {selectedConstellation.starIds.length} Stars
                    </span>
                  </div>
                </div>

                {selectedConstellation.description && (
                  <p className="info-description">
                    {selectedConstellation.description}
                  </p>
                )}

                {mainStars.length > 0 && (
                  <div className="info-main-stars-section">
                    <span className="info-section-label">Notable Stars</span>
                    <div className="info-stars-chips">
                      {mainStars
                        .filter((s) => s.name)
                        .map((star) => (
                          <span key={star.hip} className="info-star-chip">
                            <span className="chip-star-name">{star.name}</span>
                            <span className="chip-star-mag">
                              {star.magnitude.toFixed(1)}m
                            </span>
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {selectedConstellation.mythology && (
                  <div className="info-mythology-section">
                    <span className="info-section-label">Mythology</span>
                    <p className="info-mythology-text">
                      {selectedConstellation.mythology}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
