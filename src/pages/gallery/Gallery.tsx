import { useState, useEffect } from 'react'
import DriftWall, { type DriftWallItem } from '../../components/drift-wall/DriftWall'
import MorphSlider, { type MorphItem } from '../../components/morph-slider/MorphSlider'
import './Gallery.css'

const ASTRONOMY_GALLERY_ITEMS: DriftWallItem[] = [
  { image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop', title: 'Milky Way Core Over Ladakh' },
  { image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop', title: 'Deep Space Nebula' },
  { image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1200&auto=format&fit=crop', title: 'Orbital Planet Horizon' },
  { image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop', title: 'Stargazing Night Camp' },
  { image: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=1200&auto=format&fit=crop', title: 'Solar Eclipse Atmosphere' },
  { image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200&auto=format&fit=crop', title: 'Cosmic Stellar Nursery' },
  { image: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=1200&auto=format&fit=crop', title: 'Astrophotography Telescope Rig' },
  { image: 'https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?q=80&w=1200&auto=format&fit=crop', title: 'Star Trails over Observatory' },
  { image: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?q=80&w=1200&auto=format&fit=crop', title: 'Andromeda Spiral Arms' },
  { image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1200&auto=format&fit=crop', title: 'Hanle High-Altitude Skies' },
  { image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop', title: 'Celestial Aurora Borealis' },
  { image: 'https://images.unsplash.com/photo-1504333638930-c8787321eee0?q=80&w=1200&auto=format&fit=crop', title: 'Dark Sky Reserve Expedition' },
  { image: 'https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?q=80&w=1200&auto=format&fit=crop', title: 'Cosmic Dust Pillars' },
  { image: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=1200&auto=format&fit=crop', title: 'Spiti Valley Starlight' },
  { image: 'https://images.unsplash.com/photo-1465101169830-435181776985?q=80&w=1200&auto=format&fit=crop', title: 'Lunar Crater Close-up' }
]

export default function Gallery() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [modalData, setModalData] = useState<{
    isOpen: boolean
    items: MorphItem[]
    startIndex: number
  }>({
    isOpen: false,
    items: [],
    startIndex: 0
  })

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleTileClick = (clickedItem: DriftWallItem, colIndex: number) => {
    const numCols = isMobile ? 3 : 5
    const columnItems = ASTRONOMY_GALLERY_ITEMS.filter((_, i) => i % numCols === colIndex)
    const morphItems: MorphItem[] = columnItems.map(it => ({
      image: it.image,
      caption: it.title
    }))

    const clickedIndex = Math.max(0, columnItems.findIndex(it => it.image === clickedItem.image))

    setModalData({
      isOpen: true,
      items: morphItems,
      startIndex: clickedIndex
    })
  }

  return (
    <div className="gallery-page-container">
      {/* Full-Screen Drift Wall */}
      <div className="gallery-fullscreen-wall">
        <DriftWall
          items={ASTRONOMY_GALLERY_ITEMS}
          columns={isMobile ? 3 : 5}
          tileWidth={isMobile ? 160 : 230}
          tileHeight={isMobile ? 110 : 150}
          gap={isMobile ? 14 : 20}
          tilt={isMobile ? 8 : 12}
          turn={0}
          perspective={isMobile ? 900 : 1200}
          depth={isMobile ? 80 : 140}
          speed={isMobile ? 22 : 38}
          direction={isMobile ? 'left' : 'up'}
          variance={0.45}
          parallax={0}
          lift={isMobile ? 72 : 72}
          fade={0}
          dim={1}
          overlayColor="#02020500"
          radius={isMobile ? 4 : 4}
          roll={0}
          pauseOnHover={false}
          grayscale={false}
          onTileClick={handleTileClick}
        />
      </div>

      {/* MorphSlider Modal Overlay */}
      {modalData.isOpen && (
        <div className="gallery-modal-overlay" onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}>
          <div className="gallery-modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="gallery-modal-close"
              aria-label="Close modal"
              onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
            >
              ✕
            </button>
            <div className="gallery-modal-slider-wrapper">
              <MorphSlider
                items={modalData.items}
                startIndex={modalData.startIndex}
                transition="melt"
                intensity={0.55}
                aberration={0.35}
                drift={0.4}
                autoplay={false}
                overlayColor="#000000"
                duration={1.1}
                ease="power2.inOut"
                scale={2.4}
                autoplayDelay={4}
                loop
                radius={4}
                showCaptions={true}
                showControls={true}
                showIndicators={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
