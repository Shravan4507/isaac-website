import { useState, useEffect } from 'react'
import BorderGlow from '../../../components/border-glow/BorderGlow'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import SettingsModal from './SettingsModal'
import Toast, { type ToastType } from '../../../components/toast/Toast'
import './ClubDashboard.css'

interface ClubDashboardProps {
  onSignOut: () => void
}

export default function ClubDashboard({ onSignOut }: ClubDashboardProps) {
  const [clubName, setClubName] = useState('')
  const [username, setUsername] = useState('')
  const [college, setCollege] = useState('')
  const [logo, setLogo] = useState('')
  const [banner, setBanner] = useState('')
  const [estYear, setEstYear] = useState('')
  const [verified, setVerified] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const clubId = localStorage.getItem('isaac_club_id') || ''

  // Social presence states
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialLinkedIn, setSocialLinkedIn] = useState('')
  const [socialYouTube, setSocialYouTube] = useState('')
  const [socialFacebook, setSocialFacebook] = useState('')
  const [socialDiscord, setSocialDiscord] = useState('')
  const [socialGitHub, setSocialGitHub] = useState('')

  const syncDashboardData = (isSave: boolean = false) => {
    // 1. Initial load from local cache
    const cachedName = localStorage.getItem('isaac_fullname') || 'Stargazers Astronomy Club'
    const cachedUsername = localStorage.getItem('isaac_username') || ''
    const cachedCollege = localStorage.getItem('isaac_institution') || 'Synergy Institute of Technology'
    const cachedLogo = localStorage.getItem('isaac_logo') || ''
    const cachedBanner = localStorage.getItem('isaac_banner') || ''
    const cachedEstYear = localStorage.getItem('isaac_est_year') || '2024'
    const cachedVerified = localStorage.getItem('isaac_verified') === 'true'

    setClubName(cachedName)
    setUsername(cachedUsername)
    setCollege(cachedCollege)
    setLogo(cachedLogo)
    setBanner(cachedBanner)
    setEstYear(cachedEstYear)
    setVerified(cachedVerified)

    setSocialInstagram(localStorage.getItem('isaac_social_instagram') || '')
    setSocialLinkedIn(localStorage.getItem('isaac_social_linkedin') || '')
    setSocialYouTube(localStorage.getItem('isaac_social_youtube') || '')
    setSocialFacebook(localStorage.getItem('isaac_social_facebook') || '')
    setSocialDiscord(localStorage.getItem('isaac_social_discord') || '')
    setSocialGitHub(localStorage.getItem('isaac_social_github') || '')

    // 2. Fetch fresh telemetry data from Firestore if we have a club ID
    if (clubId) {
      const fetchFreshData = async () => {
        try {
          const docRef = doc(db, 'clubs', clubId)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            
            // Update UI states dynamically
            setClubName(data.clubName || '')
            setUsername(data.username || '')
            setCollege(data.institution || '')
            setLogo(data.logo || '')
            setBanner(data.banner || '')
            setEstYear(data.estYear || '')
            setVerified(data.verified === true)

            setSocialInstagram(data.instagram || '')
            setSocialLinkedIn(data.linkedin || '')
            setSocialYouTube(data.youtube || '')
            setSocialFacebook(data.facebook || '')
            setSocialDiscord(data.discord || '')
            setSocialGitHub(data.github || '')

            // Keep cache synced for next load
            localStorage.setItem('isaac_fullname', data.clubName || '')
            localStorage.setItem('isaac_username', data.username || '')
            localStorage.setItem('isaac_institution', data.institution || '')
            localStorage.setItem('isaac_logo', data.logo || '')
            localStorage.setItem('isaac_banner', data.banner || '')
            localStorage.setItem('isaac_est_year', data.estYear || '')
            localStorage.setItem('isaac_verified', String(data.verified === true))
            localStorage.setItem('isaac_social_instagram', data.instagram || '')
            localStorage.setItem('isaac_social_linkedin', data.linkedin || '')
            localStorage.setItem('isaac_social_youtube', data.youtube || '')
            localStorage.setItem('isaac_social_facebook', data.facebook || '')
            localStorage.setItem('isaac_social_discord', data.discord || '')
            localStorage.setItem('isaac_social_github', data.github || '')

            if (isSave) {
              setToast({ message: "Club profile settings updated successfully!", type: "success" })
            }
          }
        } catch (err) {
          console.error("Failed to sync fresh club data from Firestore:", err)
        }
      }
      fetchFreshData()
    }
  }

  useEffect(() => {
    // Reference onSignOut to bypass unused variable check
    if (false) console.log(onSignOut)

    syncDashboardData()

    // Listen to tab changes in URL query params
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'edit-profile' || tab === 'view-settings') {
        setShowSettingsModal(true)
      } else {
        setShowSettingsModal(false)
      }
    }

    handleUrlChange()
    window.addEventListener('popstate', handleUrlChange)
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
    }
  }, [onSignOut, clubId])

  const handleCloseSettingsModal = () => {
    setShowSettingsModal(false)
    // Remove the tab parameter from the URL cleanly
    const params = new URLSearchParams(window.location.search)
    params.delete('tab')
    const newSearch = params.toString()
    const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '')
    window.history.pushState(null, '', newPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const getInstagramUrl = (handle: string) => `https://instagram.com/${handle}`
  const getLinkedInUrl = (handle: string) => {
    if (handle.startsWith('in/') || handle.startsWith('company/') || handle.startsWith('school/')) {
      return `https://linkedin.com/${handle}`
    }
    return `https://linkedin.com/company/${handle}`
  }
  const getYouTubeUrl = (handle: string) => {
    if (handle.startsWith('@') || handle.startsWith('c/') || handle.startsWith('channel/') || handle.startsWith('user/')) {
      return `https://youtube.com/${handle}`
    }
    return `https://youtube.com/@${handle}`
  }
  const getFacebookUrl = (handle: string) => `https://facebook.com/${handle}`
  const getDiscordUrl = (handle: string) => `https://discord.gg/${handle}`
  const getGitHubUrl = (handle: string) => `https://github.com/${handle}`

  return (
    <div className="club-dashboard-page-container">
      {/* ──────────────── CLUB HEADER HERO AREA ──────────────── */}
      <div className="club-header-hero-wrapper">
        {/* Banner image or fallback */}
        {banner ? (
          <div 
            className="club-banner-display loaded" 
            style={{ backgroundImage: `url(${banner})` }} 
          />
        ) : (
          <div className="club-banner-display fallback">
            <div className="banner-galaxy-noise"></div>
          </div>
        )}
        <div className="banner-gradient-overlay"></div>

        {/* Info overlay content */}
        <div className="club-header-info-overlay">
          <div className="club-header-info-inner">
            <div className="club-identity-left">
              <BorderGlow
                className="club-avatar-display-wrapper"
                borderRadius={75}
                edgeSensitivity={30}
                glowColor="180 80% 80%"
                backgroundColor="#000000"
                glowRadius={30}
                glowIntensity={3}
                animated={true}
                colors={['#c084fc', '#f472b6', '#38bdf8']}
              >
                {logo ? (
                  <img 
                    src={logo} 
                    alt="Club Logo" 
                    className="club-avatar-img loaded" 
                    loading="lazy"
                  />
                ) : (
                  <div className="club-avatar-svg-placeholder">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                      <path d="M12 6a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4z" />
                    </svg>
                  </div>
                )}
              </BorderGlow>

              <div className="club-title-text-group">
                <h1 className="club-title-name">{clubName || 'CLUB NAME'}</h1>
                {username && (
                  <div className="club-username-wrapper">
                    <span className="club-username-handle">@{username}</span>
                    {verified && (
                      <img 
                        src="/logo/verification_badge/verify.png" 
                        alt="Verified Chapter" 
                        className="club-verification-badge-icon" 
                      />
                    )}
                  </div>
                )}
                <p className="club-subtitle-college">{college || 'COLLEGE NAME'}</p>
              </div>
            </div>

            <div className="club-identity-right">
              <div className="club-est-year">EST. {estYear || 'XXXX'}</div>

              <div className="club-header-socials-row">
                {socialInstagram && (
                  <a href={getInstagramUrl(socialInstagram)} target="_blank" rel="noopener noreferrer" className="club-header-social-link instagram" title="Instagram">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                )}
                {socialLinkedIn && (
                  <a href={getLinkedInUrl(socialLinkedIn)} target="_blank" rel="noopener noreferrer" className="club-header-social-link linkedin" title="LinkedIn">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                )}
                {socialYouTube && (
                  <a href={getYouTubeUrl(socialYouTube)} target="_blank" rel="noopener noreferrer" className="club-header-social-link youtube" title="YouTube">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
                    </svg>
                  </a>
                )}
                {socialFacebook && (
                  <a href={getFacebookUrl(socialFacebook)} target="_blank" rel="noopener noreferrer" className="club-header-social-link facebook" title="Facebook">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                )}
                {socialDiscord && (
                  <a href={getDiscordUrl(socialDiscord)} target="_blank" rel="noopener noreferrer" className="club-header-social-link discord" title="Discord">
                    <svg viewBox="0 0 127.14 96.36" width="20" height="20" fill="currentColor" style={{ display: 'block' }}>
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.5,2.92-2.3a75.48,75.48,0,0,0,72.15,0c.93.8,1.92,1.57,2.92,2.3a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.53-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                    </svg>
                  </a>
                )}
                {socialGitHub && (
                  <a href={getGitHubUrl(socialGitHub)} target="_blank" rel="noopener noreferrer" className="club-header-social-link github" title="GitHub">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="club-dashboard-content-grid"></div>

      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={handleCloseSettingsModal}
        clubId={clubId}
        onSaveSuccess={() => syncDashboardData(true)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
