import { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import Galaxy from './components/background/Galaxy'
import Home from './pages/home/Home'
import Navbar from './components/navbar/navbar'
import Footer from './components/footer/footer'
import Clubs from './pages/clubs/Clubs'
import About from './pages/about/About'
import Login from './pages/login/Login'
import Onboarding from './pages/onboarding/Onboarding'
import UserProfile from './pages/profile/UserProfile'
import Events from './pages/events/Events'
import Resources from './pages/resources/Resources'
import Gallery from './pages/gallery/Gallery'
import Publications from './pages/publications/Publications'
import Constellations from './pages/constellations/Constellations'
import { usePerformanceTier } from './hooks/usePerformanceTier'
import './App.css'

function App() {
  const logoWrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const welcomeRef = useRef<HTMLDivElement>(null)

  // Keep track of the current URL path for custom SPA routing
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const perfTier = usePerformanceTier()

  // Check if currentPath is a dynamic user profile route
  const getProfileUsername = (path: string): string | null => {
    const segments = path.split('/').filter(Boolean)
    const systemPages = ['home', 'clubs', 'about', 'login', 'onboarding', 'events', 'resources', 'gallery', 'publications', 'constellations']
    if (segments.length === 1 && !systemPages.includes(segments[0])) {
      return segments[0]
    }
    return null
  }

  const profileUsername = getProfileUsername(currentPath)

  // Initialize stage from localStorage
  const [stage, setStage] = useState<'hero' | 'welcome' | 'home'>(() => {
    const path = window.location.pathname
    const isSpecial = path === '/clubs' || 
                      path === '/about' || 
                      path === '/login' || 
                      path === '/onboarding' || 
                      path === '/events' || 
                      path === '/resources' || 
                      path === '/gallery' || 
                      path === '/publications' || 
                      path === '/constellations' || 
                      getProfileUsername(path) !== null
    if (isSpecial) return 'home'
    
    const savedStage = localStorage.getItem('isaac_stage')
    if (savedStage === 'home') return 'home'
    if (savedStage === 'welcome') return 'welcome'
    return 'hero'
  })

  // Synchronize history state and links click interception
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor && anchor.href) {
        const url = new URL(anchor.href)
        if (url.origin === window.location.origin) {
          const path = url.pathname
          
          const isProfile = getProfileUsername(path) !== null
          const isSystem = path === '/clubs' || 
                           path === '/home' || 
                           path === '/about' || 
                           path === '/login' || 
                           path === '/onboarding' || 
                           path === '/events' || 
                           path === '/resources' || 
                           path === '/gallery' || 
                           path === '/publications' || 
                           path === '/constellations'

          // Intercept page route changes to prevent full refresh
          if (isSystem || isProfile) {
            e.preventDefault()
            window.history.pushState(null, '', path + url.hash)
            setCurrentPath(path)
            setStage('home')
            
            // If there's a hash, scroll to it
            if (url.hash) {
              setTimeout(() => {
                const el = document.querySelector(url.hash)
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
          }
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleLinkClick)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [])

  // Keep URL synchronized to /home if in the home stage and not on special pages
  useEffect(() => {
    const path = window.location.pathname
    const isSpecial = path === '/clubs' || 
                      path === '/about' || 
                      path === '/login' || 
                      path === '/onboarding' || 
                      path === '/events' || 
                      path === '/resources' || 
                      path === '/gallery' || 
                      path === '/publications' || 
                      path === '/constellations' || 
                      getProfileUsername(path) !== null
                      
    if (stage === 'home' && !isSpecial) {
      window.history.pushState(null, '', '/home')
      setCurrentPath('/home')
    }
  }, [stage])

  const handleDiveIn = () => {
    const tl = gsap.timeline()

    // 1. Fade out the button and the logo wrapper together
    tl.to(buttonRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.4,
      ease: 'power2.out',
      pointerEvents: 'none'
    })
    .to(logoWrapperRef.current, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      pointerEvents: 'none'
    }, 0)

    // 2. Fade in the welcome container smoothly after logo fades out
    tl.to(welcomeRef.current, {
      opacity: 1,
      duration: 1.2,
      ease: 'power2.out',
      pointerEvents: 'auto',
      onComplete: () => {
        setStage('welcome')
        localStorage.setItem('isaac_stage', 'welcome')
      }
    }, '+=0.1')
  }

  const handleKickoff = () => {
    // Fade out welcome section, then transition to main home page
    gsap.to(welcomeRef.current, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      pointerEvents: 'none',
      onComplete: () => {
        setStage('home')
        localStorage.setItem('isaac_stage', 'home')
      }
    })
  }



  const handleOnboardingComplete = (username: string) => {
    const path = `/${username}`
    window.history.pushState(null, '', path)
    setCurrentPath(path)
  }

  const handleSignOut = () => {
    localStorage.removeItem('isaac_logged_in')
    localStorage.removeItem('isaac_username')
    localStorage.removeItem('isaac_fullname')
    localStorage.removeItem('isaac_institution')
    localStorage.removeItem('isaac_role')
    localStorage.removeItem('isaac_state')
    localStorage.removeItem('isaac_bio')
    localStorage.removeItem('isaac_onboarded')

    window.history.pushState(null, '', '/home')
    setCurrentPath('/home')
  }

  return (
    <div className={`app-container ${stage === 'home' ? 'home-active' : ''} ${currentPath === '/constellations' ? 'constellations-active' : ''} perf-${perfTier}`}>
      {/* 1. Hero Section Layer - Render only if stage is hero */}
      {stage === 'hero' && (
        <section className="hero-section">
          <div className="hero-logo-container">
            <div ref={logoWrapperRef} className="logo-wrapper">
              <img
                src="/images/ISAAC-Hero.webp"
                alt="ISAAC Logo"
                className="hero-logo"
                draggable={false}
              />
              <button
                ref={buttonRef}
                className="dive-in-btn"
                onClick={handleDiveIn}
              >
                Dive In
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Welcome Section Layer - Render if stage is hero or welcome */}
      {(stage === 'hero' || stage === 'welcome') && (
        <section className={stage === 'welcome' ? 'welcome-section-flow' : 'welcome-section-container'}>
          <div 
            ref={welcomeRef} 
            className="welcome-container" 
            style={stage === 'welcome' ? { opacity: 1 } : { opacity: 0, pointerEvents: 'none' }}
          >
            <h2 className="welcome-title">
              Welcome to <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="welcome-title-logo" />
            </h2>
            <p className="welcome-subtitle">Indian Synergy of Astronomy & Astrophysics Clubs</p>
            <p className="welcome-text">
              A unified platform connecting astronomy clubs, students, educators, and researchers across India. ISAAC empowers collaboration through shared knowledge, national events, open resources, and opportunities that inspire the next generation of space explorers.
            </p>
            <button className="kickoff-btn" onClick={handleKickoff}>
              Kickoff <span className="kickoff-arrow">↗</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. Main Home/Clubs Page Section - Render when stage is home */}
      {stage === 'home' && (
        <>
          <Navbar />
          <div key={currentPath} className="route-transition-wrapper">
            {currentPath === '/clubs' && (
              <div className="clubs-route-layout">
                <Clubs />
                <Footer />
              </div>
            )}
            {currentPath === '/about' && (
              <div className="about-route-layout">
                <About />
                <Footer />
              </div>
            )}
            {currentPath === '/events' && (
              <div className="events-route-layout">
                <Events />
                <Footer />
              </div>
            )}
            {currentPath === '/resources' && (
              <div className="resources-route-layout">
                <Resources />
                <Footer />
              </div>
            )}
            {currentPath === '/gallery' && (
              <div className="gallery-route-layout">
                <Gallery />
                <Footer />
              </div>
            )}
            {currentPath === '/publications' && (
              <div className="publications-route-layout">
                <Publications />
                <Footer />
              </div>
            )}
            {currentPath === '/constellations' && (
              <div className="constellations-route-layout">
                <Constellations />
                <Footer />
              </div>
            )}
            {currentPath === '/login' && (
              <div className="login-route-layout">
                <Login />
                <Footer />
              </div>
            )}
            {currentPath === '/onboarding' && (
              <div className="onboarding-route-layout">
                <Onboarding onComplete={handleOnboardingComplete} />
                <Footer />
              </div>
            )}
            {profileUsername !== null && (
              <div className="profile-route-layout">
                <UserProfile username={profileUsername} onSignOut={handleSignOut} />
                <Footer />
              </div>
            )}
            {currentPath !== '/clubs' && 
             currentPath !== '/about' && 
             currentPath !== '/events' && 
             currentPath !== '/resources' && 
             currentPath !== '/gallery' && 
             currentPath !== '/publications' && 
             currentPath !== '/constellations' && 
             currentPath !== '/login' && 
             currentPath !== '/onboarding' && 
             profileUsername === null && (
               <Home />
             )}
          </div>
        </>
      )}

      <div className="background-wrapper">
        <Galaxy
          mouseRepulsion={false}
          mouseInteraction={false}
          density={0.3}
          glowIntensity={0.1}
          saturation={0}
          hueShift={80}
          twinkleIntensity={0.1}
          rotationSpeed={0}
          repulsionStrength={1.5}
          autoCenterRepulsion={0}
          starSpeed={0.3}
          speed={0.3}
        />
      </div>
    </div>
  )
}

export default App
