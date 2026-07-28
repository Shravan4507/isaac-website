import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import './Clubs.css'
import { clubsData, type ClubData } from '../../dataset/clubsData'

const STOCK_IMAGES = [
  '/images/astrophotography.webp',
  '/images/star-party.webp',
  '/images/Our-Mission-bg.webp',
  '/images/Moon-Hero.webp'
]

export const getStateColor = (state: string): string => {
  const s = state.toLowerCase()
  if (s.includes('maharashtra')) return '#a855f7'
  if (s.includes('karnataka')) return '#22c55e'
  if (s.includes('tamil nadu')) return '#ea580c'
  if (s.includes('west bengal')) return '#3b82f6'
  if (s.includes('delhi')) return '#ec4899'
  if (s.includes('odisha')) return '#06b6d4'
  if (s.includes('uttarakhand')) return '#eab308'
  return '#9ca3af'
}

export default function Clubs() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maptilersdk.Map | null>(null)
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activePopupRef = useRef<maptilersdk.Popup | null>(null)
  const isSpinningRef = useRef(false)

  const [activeStyle, setActiveStyle] = useState<'cosmos' | 'satellite' | 'streets'>(() => {
    const saved = localStorage.getItem('isaac_map_style')
    if (saved === 'cosmos' || saved === 'satellite' || saved === 'streets') {
      return saved
    }
    return 'cosmos'
  })
  const [mapError, setMapError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState<number>(0)

  // Filtering & Modal states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const changeMapStyle = (styleKey: 'cosmos' | 'satellite' | 'streets') => {
    try {
      if (!mapRef.current) return
      setActiveStyle(styleKey)
      localStorage.setItem('isaac_map_style', styleKey)

      let styleUri: any = maptilersdk.MapStyle.DATAVIZ.DARK
      if (styleKey === 'satellite') {
        styleUri = maptilersdk.MapStyle.SATELLITE
      } else if (styleKey === 'streets') {
        styleUri = maptilersdk.MapStyle.STREETS.DARK
      }

      mapRef.current.setStyle(styleUri)
    } catch (err: any) {
      console.error("Failed to swap style:", err)
      setMapError(`Style load failed: ${err.message || err}`)
    }
  }

  const handleResetMap = () => {
    if (activePopupRef.current) {
      activePopupRef.current.remove()
      activePopupRef.current = null
    }
    setMapError(null)
    setActiveStyle('cosmos')
    localStorage.setItem('isaac_map_style', 'cosmos')
    setResetKey(prev => prev + 1)
  }

  // Clear search query and zoom back out
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedClubId(null)

    if (activePopupRef.current) {
      activePopupRef.current.remove()
      activePopupRef.current = null
    }

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [78.9629, 20.5937],
        zoom: 2.3,
        essential: true,
        duration: 1500
      })
    }
  }

  const handleSelectClub = (club: ClubData) => {
    if (!mapRef.current) return
    const { longitude, latitude } = club

    setSelectedClubId(club.id)

    // Close any existing popup
    if (activePopupRef.current) {
      activePopupRef.current.remove()
      activePopupRef.current = null
    }

    const stateColor = getStateColor(club.state)

    // Create custom space-themed map popup (acting as location-pointing toast)
    const popup = new maptilersdk.Popup({
      offset: 15,
      closeButton: false,
      closeOnClick: false,
      className: 'club-map-popup'
    }).setHTML(`
      <div class="popup-card">
        <div class="popup-header" style="border-bottom-color: ${stateColor}33">
          ${club.verified ? `<span class="popup-verified-badge" style="color: ${stateColor}">✓ Verified Chapter</span>` : ''}
          <h3 class="popup-club-name">${club.club}</h3>
          <p class="popup-institution">${club.institution}</p>
        </div>
        <div class="popup-body">
          <p class="popup-location">📍 ${club.city}, ${club.state}</p>
          ${club.description ? `<p class="popup-desc">${club.description}</p>` : ''}
        </div>
        <div class="popup-footer">
          ${club.website ? `<a href="${club.website}" target="_blank" rel="noopener noreferrer" class="popup-action-btn" style="--btn-color: ${stateColor}">Contact</a>` : ''}
          ${club.instagram ? `<a href="${club.instagram}" target="_blank" rel="noopener noreferrer" class="popup-action-btn" style="--btn-color: ${stateColor}">Instagram</a>` : ''}
        </div>
      </div>
    `)
    .setLngLat([longitude, latitude])
    .addTo(mapRef.current)

    activePopupRef.current = popup

    // Smoothly fly camera to lock onto coordinates at MAX zoom (level 12.5)
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 12.5,
      essential: true,
      duration: 2000
    })
  }

  // Filter clubs list based on Search
  const filteredClubs = clubsData.filter((club) => {
    return (
      club.club.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.state.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  useEffect(() => {
    if (!mapContainerRef.current) return

    let map: maptilersdk.Map | null = null
    let animationFrameId: number
    let resizeInterval: ReturnType<typeof setInterval>

    try {
      const apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY'
      maptilersdk.config.apiKey = apiKey

      const indiaCenter: [number, number] = [78.9629, 20.5937]

      let initialStyleUri: any = maptilersdk.MapStyle.DATAVIZ.DARK
      if (activeStyle === 'satellite') {
        initialStyleUri = maptilersdk.MapStyle.SATELLITE
      } else if (activeStyle === 'streets') {
        initialStyleUri = maptilersdk.MapStyle.STREETS.DARK
      }

      map = new maptilersdk.Map({
        container: mapContainerRef.current,
        style: initialStyleUri,
        center: indiaCenter,
        zoom: 2.3,
        minZoom: 1.5,
        maxZoom: 18,
        projection: 'globe',
        navigationControl: false,
        geolocateControl: false,
      })

      mapRef.current = map

      class CalibrateControl implements maptilersdk.IControl {
        private _container: HTMLDivElement | undefined

        onAdd(map: maptilersdk.Map) {
          this._container = document.createElement('div')
          this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
          
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'map-calibrate-ctrl-btn'
          button.title = 'Calibrate Map View'
          button.style.width = '40px'
          button.style.height = '40px'
          button.style.background = 'transparent'
          button.style.border = 'none'
          button.style.display = 'flex'
          button.style.alignItems = 'center'
          button.style.justifyContent = 'center'
          button.style.cursor = 'pointer'
          button.style.color = '#ffffff'
          button.style.padding = '0'

          button.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 8.88 9.88 16.24 7.76"></polygon>
            </svg>
          `
          
          button.onclick = () => {
            map.flyTo({
              center: [78.9629, 20.5937],
              zoom: 2.3,
              pitch: 0,
              bearing: 0,
              essential: true,
              duration: 1500
            })
          }
          
          this._container.appendChild(button)
          return this._container
        }

        onRemove() {
          if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container)
          }
        }
      }

      const geolocate = new maptilersdk.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: false
      })

      const nav = new maptilersdk.NavigationControl({ showCompass: false })

      map.addControl(geolocate, 'bottom-right')
      map.addControl(nav, 'bottom-right')
      map.addControl(new CalibrateControl(), 'bottom-right')

      // Close popups when user clicks blank areas of map
      map.on('click', (e) => {
        const target = e.originalEvent.target as HTMLElement
        if (target.closest('.maplibregl-popup') || target.closest('.maplibregl-ctrl')) {
          return
        }
        if (activePopupRef.current) {
          activePopupRef.current.remove()
          activePopupRef.current = null
        }
        setSelectedClubId(null)
      })

      map.on('error', (e: any) => {
        console.error("MapTiler internal error:", e)
        if (e?.error?.message?.includes('webgl') || e?.error?.message?.includes('context lost')) {
          setMapError("WebGL context error encountered.")
        }
      })

      map.on('webglcontextlost', () => {
        console.warn("WebGL Context Lost")
        setMapError("Graphics context lost. Tap re-initialize to recover.")
      })

      map.on('style.load', () => {
        try {
          if (map) {
            map.setProjection({ type: 'globe' })
            ;(map as any).setFog(null)
          }
        } catch (err) {
          console.error("Error setting globe projection:", err)
        }
      })

      // Globe spin logic
      const secondsPerRevolution = 240
      const maxSpinZoom = 5
      const slowSpinZoom = 3
      let userInteracting = false
      let lastFrameTime = 0

      function spinGlobe(now: number) {
        try {
          if (!mapRef.current) return
          const zoom = mapRef.current.getZoom()
          const hasActivePopup = activePopupRef.current !== null

          if (!userInteracting && zoom < maxSpinZoom && !hasActivePopup) {
            const dt = lastFrameTime > 0 ? Math.min((now - lastFrameTime) / 1000, 0.1) : 1 / 60
            lastFrameTime = now

            let degreesPerSecond = 360 / secondsPerRevolution
            if (zoom > slowSpinZoom) {
              const zoomFactor = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom)
              degreesPerSecond *= zoomFactor
            }

            const center = mapRef.current.getCenter()
            center.lng += degreesPerSecond * dt

            isSpinningRef.current = true
            mapRef.current.easeTo({
              center,
              duration: 0,
              easing: (t) => t
            })
            isSpinningRef.current = false
          } else {
            lastFrameTime = now
          }
        } catch (err) {
          console.error("Spin error:", err)
        }
      }

      const animate = (now: number) => {
        spinGlobe(now)
        animationFrameId = requestAnimationFrame(animate)
      }

      const handleMovestart = () => {
        if (isSpinningRef.current) return
        userInteracting = true
      }

      map.on('mousedown', handleMovestart)
      map.on('touchstart', handleMovestart)
      map.on('mouseup', () => {
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
        interactionTimeoutRef.current = setTimeout(() => {
          userInteracting = false
        }, 3000)
      })
      map.on('touchend', () => {
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
        interactionTimeoutRef.current = setTimeout(() => {
          userInteracting = false
        }, 3000)
      })
      map.on('wheel', () => {
        userInteracting = true
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
        interactionTimeoutRef.current = setTimeout(() => {
          userInteracting = false
        }, 3000)
      })

      map.on('load', () => {
        if (map) {
          map.resize()
          animationFrameId = requestAnimationFrame(animate)
        }
      })

      const resizeObserver = new ResizeObserver(() => {
        try {
          if (mapRef.current) mapRef.current.resize()
        } catch (err) {
          console.error("Resize error:", err)
        }
      })
      resizeObserver.observe(mapContainerRef.current)

      resizeInterval = setInterval(() => {
        try { if (mapRef.current) mapRef.current.resize() } catch {}
      }, 100)

      setTimeout(() => clearInterval(resizeInterval), 1500)

      return () => {
        cancelAnimationFrame(animationFrameId)
        clearInterval(resizeInterval)
        resizeObserver.disconnect()
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current)
        }
        if (activePopupRef.current) {
          activePopupRef.current.remove()
          activePopupRef.current = null
        }
        if (map) {
          map.remove()
          mapRef.current = null
        }
      }
    } catch (err: any) {
      console.error("Map initialization failed:", err)
      setMapError(`Map failed to start: ${err.message || err}`)
    }
  }, [resetKey])

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  return (
    <div className="clubs-page-container">
      {mapError ? (
        <div className="map-error-panel">
          <div className="error-glass-card">
            <h3 className="error-title">📡 CONNECTION INTERRUPTED</h3>
            <p className="error-desc">{mapError}</p>
            <button className="error-reset-btn" onClick={handleResetMap}>
              Re-initialize Interface
            </button>
          </div>
        </div>
      ) : null}

      {!mapError && (
        <div className="clubs-layout-inner">
          {/* Sidebar Background Grid Element (Desktop only) */}
          <div className="sidebar-bg" />

          {/* Header Panel */}
          <div className="sidebar-header-group">
            <span className="sidebar-tag">CLUBS</span>
            <h2 className="sidebar-title">Our Network Across India and Beyond</h2>
            <p className="sidebar-desc">
              Explore astronomy and astrophysics clubs from institutions across India and connect with a community that reaches for the stars.
            </p>
            <div className="search-wrapper">
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
                placeholder="Search a club or institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn" 
                  onClick={handleResetFilters}
                  title="Clear search query"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(240, 240, 250, 0.4)',
                    cursor: 'pointer',
                    padding: '0 4px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile View Specific Map Style Selector (sits below search bar) */}
            <div className="mobile-style-selector-container">
              <div className="map-style-selector">
                <button
                  className={`style-btn ${activeStyle === 'cosmos' ? 'active' : ''}`}
                  onClick={() => changeMapStyle('cosmos')}
                >
                  Cosmos
                </button>
                <button
                  className={`style-btn ${activeStyle === 'satellite' ? 'active' : ''}`}
                  onClick={() => changeMapStyle('satellite')}
                >
                  Satellite
                </button>
                <button
                  className={`style-btn ${activeStyle === 'streets' ? 'active' : ''}`}
                  onClick={() => changeMapStyle('streets')}
                >
                  Streets
                </button>
              </div>
            </div>
          </div>

          {/* Map Display Panel */}
          <div className="map-wrapper-relative">
            {/* Desktop View Specific Map Style Selector (sits on top of map) */}
            <div className="desktop-style-selector-container">
              <div className="map-style-selector">
                <button
                  className={`style-btn ${activeStyle === 'cosmos' ? 'active' : ''}`}
                  onClick={() => changeMapStyle('cosmos')}
                >
                  Cosmos
                </button>
                <button
                  className={`style-btn ${activeStyle === 'satellite' ? 'active' : ''}`}
                  onClick={() => changeMapStyle('satellite')}
                >
                  Satellite
                </button>
                <button
                  className={`style-btn ${activeStyle === 'streets' ? 'active' : ''}`}
                  onClick={() => changeMapStyle('streets')}
                >
                  Streets
                </button>
              </div>
            </div>

            {/* Globe Canvas Container */}
            <div
              ref={mapContainerRef}
              className={`map-container ${activeStyle === 'satellite' ? 'satellite-mode' : ''}`}
            />
          </div>

          {/* Clubs List Section */}
          <div className="clubs-list-section">
            <div className="list-header">
              <span className="list-title">ALL CLUBS ({filteredClubs.length})</span>
            </div>

            <div className="clubs-list-scroll">
              {filteredClubs.map((club) => {
                const stateColor = getStateColor(club.state)
                const isSelected = selectedClubId === club.id
                return (
                  <div
                    key={club.id}
                    className={`club-list-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectClub(club)}
                  >
                    <div className="club-card-left">
                      <span className="club-indicator-dot" style={{ backgroundColor: stateColor }} />
                      <div className="club-meta">
                        <span className="club-card-name">{club.club}</span>
                        <span className="club-card-institution">{club.shortName || club.institution}</span>
                      </div>
                    </div>
                    <span className="club-card-arrow">
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
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </span>
                  </div>
                )
              })}
            </div>

            <button className="view-all-clubs-btn" onClick={() => setIsModalOpen(true)}>
              VIEW ALL CLUBS <span className="btn-arrow-symbol">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay Modal Grid of Clubs */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-left">
                <h2 className="modal-title">All member astronomy clubs</h2>
                <p className="modal-subtitle">A synergy network of student astronomical communities across India</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <svg 
                  viewBox="0 0 24 24" 
                  width="22" 
                  height="22" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body-scroll">
              <div className="clubs-grid">
                {clubsData.map((club, idx) => {
                  const stateColor = getStateColor(club.state)
                  const stockImage = STOCK_IMAGES[idx % STOCK_IMAGES.length]
                  return (
                    <div key={club.id} className="club-modal-card">
                      <div className="card-image-wrapper">
                        <img src={stockImage} alt="Club Cover" className="card-bg-img" />
                        <span className="card-state-tag" style={{ backgroundColor: stateColor }}>
                          {club.state}
                        </span>
                      </div>
                      <div className="card-details">
                        <h3 className="card-club-title">{club.club}</h3>
                        <p className="card-club-college">{club.institution}</p>
                        <p className="card-club-place">📍 {club.city}, {club.country}</p>
                        <p className="card-club-desc">{club.description}</p>

                        <div className="card-actions-row">
                          <div className="card-socials">
                            {club.website && (
                              <a 
                                href={club.website} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="social-link" 
                                title="Website / Contact"
                              >
                                <svg 
                                  viewBox="0 0 24 24" 
                                  width="15" 
                                  height="15" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  fill="none" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="2" y1="12" x2="22" y2="12"></line>
                                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                </svg>
                              </a>
                            )}
                            {club.instagram && (
                              <a 
                                href={club.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="social-link" 
                                title="Instagram"
                              >
                                <svg 
                                  viewBox="0 0 24 24" 
                                  width="15" 
                                  height="15" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  fill="none" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                >
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                </svg>
                              </a>
                            )}
                          </div>

                          <button 
                            className="card-map-zoom-btn"
                            onClick={() => {
                              setIsModalOpen(false)
                              handleSelectClub(club)
                            }}
                          >
                            Locate <span className="action-arrow">→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
