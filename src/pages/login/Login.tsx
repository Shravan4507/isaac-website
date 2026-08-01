import { useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import './Login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = () => {
    // Simulate login for public user
    localStorage.setItem('isaac_logged_in', 'true')
    localStorage.setItem('isaac_role', 'Enthusiast')
    localStorage.setItem('isaac_fullname', 'Stargazer Public')
    localStorage.setItem('isaac_email', 'stargazer.google@gmail.com')
    localStorage.setItem('isaac_onboarded', 'false')
    window.history.pushState(null, '', '/onboarding')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleAppleLogin = () => {
    // Simulate login for public user
    localStorage.setItem('isaac_logged_in', 'true')
    localStorage.setItem('isaac_role', 'Enthusiast')
    localStorage.setItem('isaac_fullname', 'Apple Explorer')
    localStorage.setItem('isaac_email', 'stargazer.apple@icloud.com')
    localStorage.setItem('isaac_onboarded', 'false')
    window.history.pushState(null, '', '/onboarding')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowForgotPassword(false)

    const cleanUser = username.trim()
    const cleanPass = password.trim()

    if (!cleanUser || !cleanPass) {
      setError('Please fill in all security parameters.')
      return
    }

    setIsLoading(true)

    try {
      const clubsRef = collection(db, 'clubs')
      const q = query(clubsRef, where('repEmail', '==', cleanUser))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setError('Access authorization failed: No club found with this representative email.')
        setIsLoading(false)
        return
      }

      let authenticated = false
      let clubDoc: any = null

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const dbPassword = data.password || ''
        const rawPhone = data.repPhone || ''
        const cleanDbPhone = rawPhone.replace(/\D/g, '')
        const last10DbPhone = cleanDbPhone.slice(-10)

        const cleanInputPhone = cleanPass.replace(/\D/g, '')
        const last10InputPhone = cleanInputPhone.slice(-10)

        if (dbPassword) {
          if (dbPassword === cleanPass) {
            authenticated = true
            clubDoc = data
          }
        } else {
          if (last10DbPhone === last10InputPhone && last10InputPhone.length === 10) {
            authenticated = true
            clubDoc = data
          }
        }
      })

      if (authenticated && clubDoc) {
        localStorage.setItem('isaac_logged_in', 'true')
        localStorage.setItem('isaac_role', 'Club Admin')
        localStorage.setItem('isaac_club_id', clubDoc.id)
        localStorage.setItem('isaac_verified', String(clubDoc.verified === true))
        localStorage.setItem('isaac_username', clubDoc.username || `club_${clubDoc.clubName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`)
        localStorage.setItem('isaac_fullname', clubDoc.clubName)
        localStorage.setItem('isaac_institution', clubDoc.institution || clubDoc.clubCollege || '')
        localStorage.setItem('isaac_lat', clubDoc.latitude !== undefined ? String(clubDoc.latitude) : (clubDoc.clubLat !== undefined ? String(clubDoc.clubLat) : ''))
        localStorage.setItem('isaac_lng', clubDoc.longitude !== undefined ? String(clubDoc.longitude) : (clubDoc.clubLng !== undefined ? String(clubDoc.clubLng) : ''))
        localStorage.setItem('isaac_state', clubDoc.state || clubDoc.clubState || '')
        localStorage.setItem('isaac_bio', clubDoc.description || clubDoc.clubDescription || '')
        localStorage.setItem('isaac_logo', clubDoc.logo || clubDoc.clubLogo || '')
        localStorage.setItem('isaac_banner', clubDoc.banner || clubDoc.clubBanner || '')
        localStorage.setItem('isaac_onboarded', 'true')

        // Save socials
        localStorage.setItem('isaac_social_instagram', clubDoc.instagram || clubDoc.socialInstagram || '')
        localStorage.setItem('isaac_social_linkedin', clubDoc.linkedin || clubDoc.socialLinkedIn || '')
        localStorage.setItem('isaac_social_youtube', clubDoc.youtube || clubDoc.socialYouTube || '')
        localStorage.setItem('isaac_social_facebook', clubDoc.facebook || clubDoc.socialFacebook || '')
        localStorage.setItem('isaac_social_discord', clubDoc.discord || clubDoc.socialDiscord || '')
        localStorage.setItem('isaac_social_github', clubDoc.github || clubDoc.socialGitHub || '')
        localStorage.setItem('isaac_est_year', clubDoc.estYear || clubDoc.clubEstYear || '')

        window.history.pushState(null, '', '/dashboard')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } else {
        setError('Access authorization failed: Invalid key (Password mismatch).')
        setShowForgotPassword(true)
      }
    } catch (err: any) {
      console.error('Firestore query login error:', err)
      setError('Network authentication link error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    alert("Key recovery initiated. We'll send authentication instructions to the club's registered telemetry channel.")
  }

  return (
    <div className="login-page-container">
      <div className="login-cards-container">
        
        {/* Card 1: Public Gateway */}
        <div className="login-glass-card public-login">
          <div className="login-header">
            <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="login-logo" />
            <h2 className="login-title">PUBLIC GATEWAY</h2>
            <p className="login-subtitle">Connect with Google or Apple credentials</p>
          </div>

          <div className="login-actions">
            <button className="social-login-btn google" onClick={handleGoogleLogin}>
              <svg viewBox="0 0 24 24" width="18" height="18" className="social-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>

            <button className="social-login-btn apple" onClick={handleAppleLogin}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="social-icon">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.52-.63.73-1.18 1.87-1.03 2.98 1.12.09 2.27-.58 2.98-1.44z"/>
              </svg>
              Continue with Apple
            </button>
          </div>
        </div>

        {/* Card 2: Club Deck / Management Access */}
        <div className="login-glass-card club-login">
          <div className="login-header">
            <h2 className="login-title">CLUB DECK</h2>
            <p className="login-subtitle">Sign in with club management credentials</p>
          </div>

          <form className="club-login-form" onSubmit={handleClubSubmit}>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                className="login-input"
                placeholder="Club Identifier"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password"
                className="login-input"
                placeholder="Access Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="login-error-message">
                <span>{error}</span>
                {showForgotPassword && (
                  <button 
                    type="button" 
                    className="forgot-password-btn" 
                    onClick={handleForgotPassword}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
            )}

            <button type="submit" className="club-submit-btn" disabled={isLoading}>
              {isLoading ? 'Authorizing Access...' : 'Authorize Access'}
            </button>
            <button
              type="button"
              className="club-register-btn"
              onClick={() => {
                window.history.pushState(null, '', '/onboarding?role=club')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              disabled={isLoading}
            >
              Register as a club
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
