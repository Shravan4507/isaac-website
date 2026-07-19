import './footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Left Side: Socials */}
        <div className="footer-socials">
          <a href="https://linkedin.com/company/isaac" target="_blank" rel="noopener noreferrer" className="footer-social-link">LinkedIn</a>
          <a href="https://instagram.com/isaac" target="_blank" rel="noopener noreferrer" className="footer-social-link">Instagram</a>
          <a href="https://youtube.com/@isaac" target="_blank" rel="noopener noreferrer" className="footer-social-link">Youtube</a>
          <a href="https://x.com/isaac" target="_blank" rel="noopener noreferrer" className="footer-social-link">X</a>
        </div>

        {/* Center: Navigation Links */}
        <div className="footer-nav">
          <a href="/about" className="footer-nav-link">About</a>
          <a href="/clubs" className="footer-nav-link">Clubs</a>
          <a href="/events" className="footer-nav-link">Events</a>
          <a href="/resources" className="footer-nav-link">Resources</a>
          <a href="/gallery" className="footer-nav-link">Gallery</a>
          <a href="/publications" className="footer-nav-link">Publications</a>
        </div>

        {/* Right Side: Copyright */}
        <div className="footer-copyright">
          <span>&copy; {new Date().getFullYear()} ISAAC</span>
        </div>
      </div>
    </footer>
  )
}
