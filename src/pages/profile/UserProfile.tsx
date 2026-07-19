import './UserProfile.css'

interface UserProfileProps {
  username: string
  onSignOut: () => void
}

export default function UserProfile({ username, onSignOut }: UserProfileProps) {
  // Read details from localStorage
  const savedUsername = localStorage.getItem('isaac_username') || ''
  const isCurrentUser = savedUsername.toLowerCase() === username.toLowerCase()

  // Get details (either current logged in user, or mock voyager details for others)
  const fullName = isCurrentUser ? (localStorage.getItem('isaac_fullname') || 'Cosmic Voyager') : 'Stellar Observer'
  const institution = isCurrentUser ? (localStorage.getItem('isaac_institution') || 'ISAAC Synergy Network') : 'Indian Institute of Astrophysics'
  const role = isCurrentUser ? (localStorage.getItem('isaac_role') || 'Enthusiast') : 'Researcher'
  const stateLoc = isCurrentUser ? (localStorage.getItem('isaac_state') || 'India') : 'Karnataka'
  const bio = isCurrentUser 
    ? (localStorage.getItem('isaac_bio') || 'No telemetry bio configured yet. Voyage across the starfields continues...')
    : `Exploring coordinates and studying spectral signatures of distant nebulae. Deep sky imaging and data analysis enthusiast.`

  // Get random stellar achievement badges
  const badges = [
    { title: 'Stellar Explorer', class: 'explorer' },
    { title: 'ISAAC Initiate', class: 'initiate' },
    ...(role.toLowerCase().includes('lead') || role.toLowerCase().includes('president') ? [{ title: 'Squadron Commander', class: 'commander' }] : [])
  ]

  return (
    <div className="profile-page-container">
      <div className="profile-glass-card">
        {/* Orbital grid animation decorative element */}
        <div className="card-orbital-grid">
          <div className="orbital-ring ring-1"></div>
          <div className="orbital-ring ring-2"></div>
        </div>

        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-glow"></div>
            {/* Beautiful generic cosmic avatar */}
            <svg viewBox="0 0 24 24" className="profile-avatar-svg">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <div className="profile-meta-top">
            <span className="profile-verified-tag">✓ Mission Control Verified</span>
            <h1 className="profile-name">{fullName}</h1>
            <p className="profile-username">@{username}</p>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="detail-item">
            <span className="detail-label">TELEMETRY CLASS (ROLE)</span>
            <span className="detail-value text-glow-purple">{role}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">STATION (INSTITUTION)</span>
            <span className="detail-value">{institution}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">SECTOR COORDINATES (STATE)</span>
            <span className="detail-value">📍 {stateLoc}, India</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">MISSION LOGS (BIO)</span>
            <p className="detail-bio">{bio}</p>
          </div>
        </div>

        {/* Achievement Badges Row */}
        <div className="profile-badges-section">
          <span className="detail-label">STELLAR RANK & ACHIEVEMENTS</span>
          <div className="profile-badges-row">
            {badges.map((badge, idx) => (
              <span key={idx} className={`profile-badge ${badge.class}`}>
                ✦ {badge.title}
              </span>
            ))}
          </div>
        </div>

        <div className="profile-actions">
          {isCurrentUser ? (
            <button className="profile-btn signout-btn" onClick={onSignOut}>
              DISCONNECT LINK (LOG OUT)
            </button>
          ) : (
            <button className="profile-btn establish-link-btn" onClick={() => window.history.back()}>
              RETURN TO FLIGHT BOARD
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
