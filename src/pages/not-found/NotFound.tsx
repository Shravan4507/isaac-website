import './NotFound.css'

export default function NotFound() {
  const handleGoHome = () => {
    window.history.pushState(null, '', '/home')
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <div className="not-found-container">
      <div className="not-found-glass-card">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <button className="not-found-home-btn" onClick={handleGoHome}>
          Go to Home
        </button>
      </div>
    </div>
  )
}
