import { useState, useEffect, useRef } from 'react'
import './EventsCarousel.css'

interface EventItem {
  id: number
  title: string
  date: string
  location: string
  desc: string
  image: string
}

const EVENTS_DATA: EventItem[] = [
  {
    id: 1,
    title: 'National Star Party',
    date: 'Oct 12 - 14, 2026',
    location: 'Hanle, Ladakh',
    desc: 'Join astronomy clubs from across India for stargazing and scientific observations under the pristine dark skies of Ladakh.',
    image: '/images/star-party.png',
  },
  {
    id: 2,
    title: 'Astrophotography Masterclass',
    date: 'Nov 14, 2026',
    location: 'Virtual Session',
    desc: 'Master deep-sky capture, calibration, stacking, and post-processing techniques using advanced image editing software.',
    image: '/images/astrophotography.png',
  },
  {
    id: 3,
    title: 'ISAAC Newsletter Release',
    date: 'Dec 01, 2026',
    location: 'Online Publication',
    desc: 'Check out the winter newsletter highlighting project updates, observation logs, and astrophotography submissions from member clubs.',
    image: '/images/ISAAC_nl1_coverpage 1.png',
  },
]

export default function EventsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const N = EVENTS_DATA.length

  const autoPlayTimerRef = useRef<number | null>(null)
  const resumeTimeoutRef = useRef<number | null>(null)

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % N)
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + N) % N)
  }

  const startAutoPlay = () => {
    stopAutoPlay()
    autoPlayTimerRef.current = window.setInterval(() => {
      handleNext()
    }, 8000)
  }

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }
  }

  const resetAutoPlayWithDelay = () => {
    stopAutoPlay()
    resumeTimeoutRef.current = window.setTimeout(() => {
      startAutoPlay()
    }, 5000) // 5 seconds delay
  }

  // Setup auto-play on mount
  useEffect(() => {
    startAutoPlay()
    return () => stopAutoPlay()
  }, [])

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="events-carousel-wrapper">
      <div className="events-track">
        {EVENTS_DATA.map((event, idx) => {
          // Calculate offset in looping system
          let offset = idx - activeIndex
          if (offset < -Math.floor(N / 2)) offset += N
          if (offset > Math.floor((N - 1) / 2)) offset -= N

          let cardClass = 'card-hidden'
          if (offset === 0) cardClass = 'card-center'
          else if (offset === -1) cardClass = 'card-left'
          else if (offset === 1) cardClass = 'card-right'

          return (
            <div
              key={event.id}
              className={`event-card ${cardClass}`}
              onClick={() => {
                if (offset === -1) {
                  handlePrev()
                  resetAutoPlayWithDelay()
                } else if (offset === 1) {
                  handleNext()
                  resetAutoPlayWithDelay()
                } else if (offset === 0) {
                  setSelectedEvent(event)
                  stopAutoPlay()
                }
              }}
            >
              <div className="event-card-image-container">
                <img src={event.image} alt={event.title} className="event-card-image" draggable="false" />
                <div className="event-card-overlay" />
                <span className="event-card-date">{event.date}</span>
              </div>

              <div className="event-card-body">
                <span className="event-card-location">✦ {event.location}</span>
                <h3 className="event-card-title">{event.title}</h3>
                <p className="event-card-desc">{event.desc}</p>
                <button 
                  className="event-card-action-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (offset === 0) {
                      setSelectedEvent(event)
                      stopAutoPlay()
                    }
                  }}
                >
                  Learn More <span className="arrow-sym">→</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dots navigation */}
      <div className="carousel-dots">
        {EVENTS_DATA.map((_, idx) => (
          <button
            key={idx}
            className={`carousel-dot ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => {
              setActiveIndex(idx)
              resetAutoPlayWithDelay()
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Overlay Modal */}
      {selectedEvent && (
        <div 
          className="event-modal-overlay" 
          onClick={() => {
            setSelectedEvent(null)
            resetAutoPlayWithDelay()
          }}
        >
          <div className="event-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-image-container">
              <img src={selectedEvent.image} alt={selectedEvent.title} className="event-modal-image" />
              <div className="event-modal-overlay-shading" />
              <span className="event-modal-date">{selectedEvent.date}</span>
            </div>
            <div className="event-modal-body">
              <span className="event-modal-location">✦ {selectedEvent.location}</span>
              <h2 className="event-modal-title">{selectedEvent.title}</h2>
              <p className="event-modal-desc">{selectedEvent.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
