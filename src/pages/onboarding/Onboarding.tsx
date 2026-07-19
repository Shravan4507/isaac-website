import { useState } from 'react'
import './Onboarding.css'

interface OnboardingProps {
  onComplete: (username: string) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [institution, setInstitution] = useState('')
  const [role, setRole] = useState('Enthusiast')
  const [stateLoc, setStateLoc] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic Username validation
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '')
    if (!cleanUsername) {
      setError('Please select a valid username.')
      return
    }

    if (!/^[a-z0-9_]{3,15}$/.test(cleanUsername)) {
      setError('Username must be 3-15 characters and contain only letters, numbers, or underscores.')
      return
    }

    if (!fullName.trim() || !institution.trim() || !stateLoc.trim()) {
      setError('Please fill in all required coordinates.')
      return
    }

    // Save profile to localStorage
    localStorage.setItem('isaac_username', cleanUsername)
    localStorage.setItem('isaac_fullname', fullName.trim())
    localStorage.setItem('isaac_institution', institution.trim())
    localStorage.setItem('isaac_role', role)
    localStorage.setItem('isaac_state', stateLoc.trim())
    localStorage.setItem('isaac_bio', bio.trim())
    localStorage.setItem('isaac_onboarded', 'true')

    console.log('Onboarding complete for:', cleanUsername)
    onComplete(cleanUsername)
  }

  return (
    <div className="onboarding-page-container">
      <div className="onboarding-glass-card">
        <div className="onboarding-left-panel">
          <div className="onboarding-header">
            <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="onboarding-logo" />
            <h2 className="onboarding-title">INITIALIZE PILOT PROFILE</h2>
            <p className="onboarding-subtitle">Configure your coordinate keys to access the synergy network</p>
          </div>
        </div>

        <div className="onboarding-right-panel">
          <form className="onboarding-form" onSubmit={handleSubmit}>
            {error && <div className="onboarding-error-message">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">CHOOSE USERNAME (COSMIC KEY) *</label>
              <div className="username-input-wrapper">
                <span className="username-prefix">isaac.org/</span>
                <input
                  type="text"
                  placeholder="e.g. voyager_42"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="form-input username-field"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">FULL NAME *</label>
              <input
                type="text"
                placeholder="e.g. Dr. Carl Sagan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">INSTITUTION / UNIVERSITY *</label>
              <input
                type="text"
                placeholder="e.g. IIT Bombay"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group half-width">
                <label className="form-label">ROLE *</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  className="form-select"
                >
                  <option value="Student">Student</option>
                  <option value="Club Lead">Club President</option>
                  <option value="Educator">Educator</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Enthusiast">Space Enthusiast</option>
                </select>
              </div>

              <div className="form-group half-width">
                <label className="form-label">STATE (INDIA) *</label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={stateLoc}
                  onChange={(e) => setStateLoc(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">COSMIC BIO (SHORT BIO)</label>
              <textarea
                placeholder="Tell the community about your research interests or favorite galaxy..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="form-textarea"
                rows={3}
              />
            </div>

            <button type="submit" className="onboarding-submit-btn">
              LAUNCH PROFILE
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
