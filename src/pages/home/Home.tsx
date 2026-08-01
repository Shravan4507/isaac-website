import { useState, useEffect } from 'react'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'
import Constellation from '../../components/constellation/Constellation'
import EventsCarousel from '../../components/events-carousel/EventsCarousel'
import Footer from '../../components/footer/footer'
import './Home.css'

export default function Home() {
  const perfTier = usePerformanceTier()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isaac_logged_in') === 'true')
  }, [])

  return (
    <div className="home-page-container">
      {/* Main Content Area */}
      <main className="home-main-content">
        <div className="video-container">
          {perfTier === 'high' ? (
            <video
              src="/videos/Mars-Rotation.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="mars-video"
            />
          ) : (
            <video
              src="/videos/Mars-Rotation-low.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="mars-video"
            />
          )}
        </div>

        {/* Hero Content Overlay */}
        <div className="home-hero-overlay">
          <h1 className="home-hero-heading">Every civilization looks up.</h1>
          <h2 className="home-hero-subheading">Some search for answers. Others search for meaning.</h2>
          <p className="home-hero-description">
            ISAAC brings together astronomy clubs across India to explore the universe through collaboration, research, education, and discovery. Because every great journey begins with curiosity.
          </p>
          <div className="home-hero-actions">
            <a href="/clubs" className="home-action-btn">Explore Clubs</a>
            {isLoggedIn ? (
              <a href="/dashboard" className="home-action-btn primary">Go to Dashboard</a>
            ) : (
              <a href="/login" className="home-action-btn primary">Join ISAAC</a>
            )}
          </div>
        </div>
      </main>

      {/* Our Mission Section */}
      <section id="mission" className="mission-section">
        <div className="mission-container">
          <div className="mission-header">
            <span className="mission-tagline">OUR PURPOSE</span>
            <h2 className="mission-title">Our Mission</h2>
          </div>

          <div className="mission-grid">
            <div className="mission-pillar">
              <span className="pillar-num">CONNECT</span>
              <h3 className="pillar-title">✦ Connect</h3>
              <p className="pillar-desc">
                Bringing astronomy clubs across India into one collaborative network.
              </p>
            </div>

            <div className="mission-pillar">
              <span className="pillar-num">LEARN</span>
              <h3 className="pillar-title">☉ Learn</h3>
              <p className="pillar-desc">
                Open access to articles, research, learning paths and educational resources.
              </p>
            </div>

            <div className="mission-pillar">
              <span className="pillar-num">EXPLORE</span>
              <h3 className="pillar-title">☽ Explore</h3>
              <p className="pillar-desc">
                Workshops, observations, competitions and national astronomy events.
              </p>
            </div>

            <div className="mission-pillar">
              <span className="pillar-num">CONTRIBUTE</span>
              <h3 className="pillar-title">✧ Contribute</h3>
              <p className="pillar-desc">
                Publish articles, share projects, and help the community grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <h3 className="stat-number">50+</h3>
            <p className="stat-label">Member Clubs</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number">400+</h3>
            <p className="stat-label">Student Members</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number">12+</h3>
            <p className="stat-label">Events Organized</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number">6+</h3>
            <p className="stat-label">Months Old</p>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="quote-section">
        <div className="quote-container">
          <p className="quote-text">“Somewhere, something incredible is waiting to be known”</p>
          <span className="quote-author">— Carl Sagan</span>
        </div>
      </section>

      <section id="why-join" className="why-join-section">
        <div className="why-join-container">
          {/* Left Column: Header + Points 3 & 4 */}
          <div className="why-join-col-left">
            <div className="why-join-left-header">
              <h2 className="why-join-title">
                Why Join <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="why-join-title-logo" />
              </h2>
              <p className="why-join-tagline">Because curiosity grows stronger together.</p>
              <p className="why-join-subtitle">
                Join a nationwide community of astronomy clubs, students, educators, and researchers working together to explore the universe, share knowledge, organize meaningful events, and inspire scientific discovery.
              </p>
            </div>

            <div className="why-join-row row-03">
              <span className="why-join-num">03</span>
              <div className="why-join-content">
                <h3 className="why-join-row-title">Collaborate</h3>
                <p className="why-join-row-desc">
                  Work together on projects, outreach programs, observations, competitions, and national initiatives.
                </p>
              </div>
            </div>

            <div className="why-join-row row-04">
              <span className="why-join-num">04</span>
              <div className="why-join-content">
                <h3 className="why-join-row-title">Contribute</h3>
                <p className="why-join-row-desc">
                  Publish your research, share educational resources, showcase projects, and help grow India's astronomy community.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Points 1 & 2 */}
          <div className="why-join-col-right">
            <div className="why-join-row row-01">
              <span className="why-join-num">01</span>
              <div className="why-join-content">
                <h3 className="why-join-row-title">Connect</h3>
                <p className="why-join-row-desc">
                  Build meaningful connections with astronomy clubs and like-minded enthusiasts from across India.
                </p>
              </div>
            </div>

            <div className="why-join-row row-02">
              <span className="why-join-num">02</span>
              <div className="why-join-content">
                <h3 className="why-join-row-title">Learn</h3>
                <p className="why-join-row-desc">
                  Access curated resources, articles, research papers, workshops, and learning opportunities.
                </p>
              </div>
            </div>

            {/* Interactive Constellation Widget */}
            <Constellation />
          </div>
        </div>
      </section>

      {/* Latest Events Section */}
      <section id="events" className="events-section">
        <div className="events-section-header">
          <h2 className="events-section-title">Latest Events</h2>
          <p className="events-section-subtitle">Stay updated with nationwide events, workshops, and campaigns.</p>
        </div>
        <EventsCarousel />
      </section>

      {/* Global Footer */}
      <Footer />
    </div>
  )
}
