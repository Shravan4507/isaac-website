import { useState, useEffect } from 'react'
import './navbar.css'

interface NavbarProps {
  currentPath?: string
}

export default function Navbar({ currentPath: propPath }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownActive, setDropdownActive] = useState(false)
  const [settingsDropdownActive, setSettingsDropdownActive] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState('')
  const [currentPath, setCurrentPath] = useState(() => propPath || window.location.pathname)

  useEffect(() => {
    if (propPath) {
      setCurrentPath(propPath)
    }
  }, [propPath])

  // Close dropdown when clicking outside of the dropdown container (helps with touch screens)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (dropdownActive && !target.closest('.navbar-item-with-dropdown')) {
        setDropdownActive(false)
      }
      if (settingsDropdownActive && !target.closest('.navbar-settings-dropdown')) {
        setSettingsDropdownActive(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [dropdownActive, settingsDropdownActive])

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(localStorage.getItem('isaac_logged_in') === 'true')
      setRole(localStorage.getItem('isaac_role') || '')
      if (!propPath) {
        setCurrentPath(window.location.pathname)
      }
    }
    checkLogin()
    window.addEventListener('popstate', checkLogin)
    // Custom storage event just in case
    window.addEventListener('storage', checkLogin)
    return () => {
      window.removeEventListener('popstate', checkLogin)
      window.removeEventListener('storage', checkLogin)
    }
  }, [propPath])

  const handleSettingsMouseEnter = () => {
    if (window.innerWidth > 1280) {
      setSettingsDropdownActive(true)
    }
  }

  const handleSettingsMouseLeave = () => {
    if (window.innerWidth > 1280) {
      setSettingsDropdownActive(false)
    }
  }

  const handleSettingsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setSettingsDropdownActive(!settingsDropdownActive)
  }

  const handleSettingsAction = (action: string) => {
    closeMenu()
    setSettingsDropdownActive(false)
    if (action === 'logout') {
      localStorage.removeItem('isaac_logged_in')
      localStorage.removeItem('isaac_club_id')
      localStorage.removeItem('isaac_role')
      localStorage.removeItem('isaac_fullname')
      localStorage.removeItem('isaac_username')
      localStorage.removeItem('isaac_institution')
      localStorage.removeItem('isaac_logo')
      localStorage.removeItem('isaac_banner')
      localStorage.removeItem('isaac_est_year')
      localStorage.removeItem('isaac_verified')
      sessionStorage.clear()
      
      window.history.pushState(null, '', '/login')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      window.history.pushState(null, '', `/dashboard?roll=club&tab=${action}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
    if (menuOpen) {
      setDropdownActive(false)
      setSettingsDropdownActive(false)
    }
  }

  const closeMenu = () => {
    setMenuOpen(false)
    setDropdownActive(false)
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/home' || window.location.pathname === '/') {
      e.preventDefault()
      window.location.reload()
    }
  }

  const handleMouseEnter = () => {
    if (window.innerWidth > 1280) {
      setDropdownActive(true)
    }
  }

  const handleMouseLeave = () => {
    if (window.innerWidth > 1280) {
      setDropdownActive(false)
    }
  }

  const handleResourcesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setDropdownActive(!dropdownActive)
  }

  return (
    <nav className="navbar">
      {/* SpaceX style dimming backdrop overlay */}
      <div className={`navbar-backdrop-overlay ${dropdownActive || settingsDropdownActive ? 'visible' : ''}`} />

      <div className="navbar-container">
        {/* Left Side: Logo */}
        <a href="/home" className="navbar-logo-wrapper" onClick={handleLogoClick}>
          <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="navbar-logo-img" />
        </a>

        {/* Hamburger Toggle Button (Visible below 1280px) */}
        <button
          className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Navigation Links */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <div className="navbar-links-main">
            <a href="/home" className="navbar-link" onClick={closeMenu}>Home</a>
            <a href="/about" className="navbar-link" onClick={closeMenu}>About</a>
            <a href="/clubs" className="navbar-link" onClick={closeMenu}>Clubs</a>
            <a href="/events" className="navbar-link" onClick={closeMenu}>Events</a>
            
            {/* Resources Item with Dropdown */}
            <div
              className={`navbar-item-with-dropdown ${dropdownActive ? 'active' : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <a
                href="/resources"
                className="navbar-link navbar-dropdown-trigger"
                onClick={handleResourcesClick}
              >
                Resources <span className="mobile-only-caret">▼</span>
              </a>
              
              <div className={`navbar-dropdown-menu ${dropdownActive ? 'open' : ''}`}>
                <a href="/constellations" className="dropdown-item" onClick={closeMenu}>
                  Constellations
                </a>
                <a href="/resources" className="dropdown-item" onClick={closeMenu}>
                  All Resources
                </a>
              </div>
            </div>

            <a href="/gallery" className="navbar-link" onClick={closeMenu}>Gallery</a>
          </div>
          {isLoggedIn ? (
            currentPath === '/dashboard' && role === 'Club Admin' ? (
              <div 
                className={`navbar-item-with-dropdown navbar-settings-dropdown ${settingsDropdownActive ? 'active' : ''}`}
                onMouseEnter={handleSettingsMouseEnter}
                onMouseLeave={handleSettingsMouseLeave}
              >
                <a 
                  href="#settings"
                  className="navbar-link navbar-dropdown-trigger settings-trigger-btn"
                  onClick={handleSettingsClick}
                >
                  Settings <span className="mobile-only-caret">▼</span>
                </a>
                <div className={`navbar-dropdown-menu ${settingsDropdownActive ? 'open' : ''}`}>
                  <a 
                    href="#edit-profile" 
                    className="dropdown-item" 
                    onClick={(e) => { e.preventDefault(); handleSettingsAction('edit-profile'); }}
                  >
                    Edit Profile
                  </a>
                  <a 
                    href="#view-settings" 
                    className="dropdown-item" 
                    onClick={(e) => { e.preventDefault(); handleSettingsAction('view-settings'); }}
                  >
                    View Settings
                  </a>
                  <a 
                    href="#logout" 
                    className="dropdown-item logout-btn" 
                    onClick={(e) => { e.preventDefault(); handleSettingsAction('logout'); }}
                  >
                    Logout
                  </a>
                </div>
              </div>
            ) : (
              currentPath !== '/dashboard' && (
                <a href="/dashboard" className="navbar-link navbar-login-link dashboard-link" onClick={closeMenu}>Dashboard</a>
              )
            )
          ) : (
            <a href="/login" className="navbar-link navbar-login-link" onClick={closeMenu}>Log In</a>
          )}
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {menuOpen && <div className="navbar-backdrop" onClick={closeMenu} />}
    </nav>
  )
}
