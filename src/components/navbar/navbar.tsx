import { useState } from 'react'
import './navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/home' || window.location.pathname === '/') {
      e.preventDefault()
      window.location.reload()
    }
  }

  return (
    <nav className="navbar">
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
            <a href="/about" className="navbar-link" onClick={closeMenu}>About</a>
            <a href="/clubs" className="navbar-link" onClick={closeMenu}>Clubs</a>
            <a href="/events" className="navbar-link" onClick={closeMenu}>Events</a>
            <a href="/resources" className="navbar-link" onClick={closeMenu}>Resources</a>
            <a href="/gallery" className="navbar-link" onClick={closeMenu}>Gallery</a>
            <a href="/publications" className="navbar-link" onClick={closeMenu}>Publications</a>
          </div>
          <a href="/login" className="navbar-link navbar-login-link" onClick={closeMenu}>Log In</a>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {menuOpen && <div className="navbar-backdrop" onClick={closeMenu} />}
    </nav>
  )
}
