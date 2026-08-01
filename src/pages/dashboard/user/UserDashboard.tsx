import { useState, useEffect } from 'react'
import './UserDashboard.css'

interface UserDashboardProps {
  onSignOut: () => void
}

export default function UserDashboard({ onSignOut }: UserDashboardProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [institution, setInstitution] = useState('')
  const [role, setRole] = useState('')
  const [stateLoc, setStateLoc] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    setFullName(localStorage.getItem('isaac_fullname') || 'Cosmic Voyager')
    setUsername(localStorage.getItem('isaac_username') || 'voyager')
    setInstitution(localStorage.getItem('isaac_institution') || 'Synergy Space Academy')
    setRole(localStorage.getItem('isaac_role') || 'Enthusiast')
    setStateLoc(localStorage.getItem('isaac_state') || 'India')
    setBio(localStorage.getItem('isaac_bio') || 'Studying the heavens and mapping star systems.')
  }, [])

  // Mock list of events
  const userMissions = [
    { id: 1, title: 'Perseid Meteor Shower Peak', date: 'August 12, 2026', type: 'Observation', status: 'Scheduled' },
    { id: 2, title: 'Introduction to Astrophotography', date: 'August 18, 2026', type: 'Workshop', status: 'Enrolled' },
    { id: 3, title: 'Stargazers Assembly meetup', date: 'September 5, 2026', type: 'Assembly', status: 'Interested' }
  ]

  // Quick link helper
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="dashboard-layout-container">
      {/* Upper header summary */}
      <div className="dashboard-header-glow">
        <div className="header-meta-left">
          <span className="telemetry-connection-status">✦ CONNECTION LINK ESTABLISHED</span>
          <h1 className="dashboard-welcome-title">Welcome back, {fullName}</h1>
          <p className="dashboard-user-id">SECTOR ASSIGNMENT: @{username} &bull; STATION: {institution}</p>
        </div>
        <div className="header-meta-right">
          <div className="stat-circle">
            <span className="stat-value">LVL 2</span>
            <span className="stat-label">STELLAR RANK</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-inner">
        {/* Left Side: Summary Card & Actions */}
        <div className="dashboard-sidebar">
          <div className="dashboard-glass-card profile-preview-card">
            <div className="card-header-accent">
              <span className="accent-label">USER PARAMETERS</span>
            </div>
            <div className="profile-badge-row-small">
              <span className="badge-class">{role}</span>
              <span className="badge-location">📍 {stateLoc}</span>
            </div>
            <div className="profile-bio-box">
              <span className="box-label">MISSION STATUS (BIO)</span>
              <p className="bio-text">"{bio}"</p>
            </div>
            <div className="action-buttons-stack">
              <button className="action-btn-main primary" onClick={() => navigateTo('/constellations')}>
                <span className="btn-icon">☽</span> OPEN SKY MAP
              </button>
              <button className="action-btn-main" onClick={() => navigateTo('/clubs')}>
                <span className="btn-icon">✦</span> FIND CLUBS
              </button>
              <button className="action-btn-main" onClick={() => navigateTo('/resources')}>
                <span className="btn-icon">📁</span> SYSTEM LOGS / RESOURCES
              </button>
            </div>
          </div>

          <button className="disconnect-btn-flat" onClick={onSignOut}>
            DISCONNECT LINK (SIGN OUT)
          </button>
        </div>

        {/* Right Side: Timeline & Accomplishments */}
        <div className="dashboard-main-content">
          {/* Mission logs */}
          <div className="dashboard-glass-card telemetry-timeline-card">
            <div className="card-header-accent">
              <span className="accent-label">COSMIC SCHEDULE & MISSIONS</span>
            </div>
            <div className="timeline-items-list">
              {userMissions.map(mission => (
                <div key={mission.id} className="timeline-item-row">
                  <div className="timeline-indicator-dot"></div>
                  <div className="timeline-details">
                    <h4 className="mission-title">{mission.title}</h4>
                    <span className="mission-meta">{mission.date} &bull; {mission.type}</span>
                  </div>
                  <div className="timeline-status-badge">
                    <span className={`status-pill ${mission.status.toLowerCase()}`}>{mission.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges and milestones */}
          <div className="dashboard-glass-card accomplishments-card">
            <div className="card-header-accent">
              <span className="accent-label">STELLAR MILESTONES ACHIEVED</span>
            </div>
            <div className="dashboard-badges-grid">
              <div className="badge-box-large explorer">
                <span className="badge-symbol">✦</span>
                <span className="badge-title">Stellar Explorer</span>
                <span className="badge-desc">Onboarded successfully & calibrated coordinates.</span>
              </div>
              <div className="badge-box-large initiate">
                <span className="badge-symbol">☉</span>
                <span className="badge-title">ISAAC Initiate</span>
                <span className="badge-desc">Linked into the national astrophysics network.</span>
              </div>
              <div className="badge-box-large observer locked">
                <span className="badge-symbol">☽</span>
                <span className="badge-title">Deep Watcher</span>
                <span className="badge-desc">Locked. Host or attend 5 observation nights.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
