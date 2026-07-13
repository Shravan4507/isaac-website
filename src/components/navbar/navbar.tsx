import { useState, useEffect, useRef } from 'react';
import './navbar.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Shrink when scrolling past 70% of the viewport height (past hero section)
      const threshold = window.innerHeight * 0.7;
      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 850); // 850ms delay before shrinking again
  };

  const shouldShrink = isScrolled && !isHovered;

  return (
    <nav 
      className={`navbar-pill ${shouldShrink ? 'shrunk' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="navbar-logo-container">
        <img 
          src="/logo/ISAAC logo.png" 
          alt="ISAAC Logo" 
          className="navbar-logo-img" 
        />
        <div className="navbar-logo-text">
          Indian Synergy of<br />
          Astronomy &amp;<br />
          Astrophysics Clubs
        </div>
      </div>
      <div className="navbar-right-section">
        <div className="navbar-links">
          <a href="#about" className="nav-link">About Us</a>
          
          <div className="nav-dropdown">
            <a href="#publications" className="nav-link dropdown-trigger">
              Publications <span className="dropdown-arrow">▼</span>
            </a>
          </div>
          
          <div className="nav-dropdown">
            <a href="#membership" className="nav-link dropdown-trigger">
              Membership <span className="dropdown-arrow">▼</span>
            </a>
          </div>

          <div className="nav-dropdown">
            <a href="#science" className="nav-link dropdown-trigger">
              Science <span className="dropdown-arrow">▼</span>
            </a>
          </div>

          <a href="#contact" className="nav-link">Contact Us</a>
          <a href="#signin" className="nav-link">Sign In</a>
        </div>
      </div>
    </nav>
  );
}
