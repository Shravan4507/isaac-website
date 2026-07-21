import { useState, useEffect } from 'react'
import './navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownActive, setDropdownActive] = useState(false)

  // Close dropdown when clicking outside of the dropdown container (helps with touch screens)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownActive) {
        const target = e.target as HTMLElement
        if (!target.closest('.navbar-item-with-dropdown')) {
          setDropdownActive(false)
        }
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [dropdownActive])

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
    if (menuOpen) {
      setDropdownActive(false)
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
      <div className={`navbar-backdrop-overlay ${dropdownActive ? 'visible' : ''}`} />

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
          <a href="/login" className="navbar-link navbar-login-link" onClick={closeMenu}>Log In</a>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {menuOpen && <div className="navbar-backdrop" onClick={closeMenu} />}
    </nav>
  )
}
