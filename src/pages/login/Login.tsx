import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, setDoc, getDoc, doc, deleteDoc } from 'firebase/firestore'
import { signInWithPopup } from 'firebase/auth'
import { db, auth, googleProvider, githubProvider } from '../../firebase'
import { hashPassword, decryptData, verifyTOTPToken } from '../../utils/security'
import Toast from '../../components/toast/Toast'
import './Login.css'

interface LoginProps {
  search?: string
}

export default function Login({ search }: LoginProps = {}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 2FA Verification states
  const [show2FAVerify, setShow2FAVerify] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [pendingClub, setPendingClub] = useState<any>(null)
  const [pendingPassword, setPendingPassword] = useState('')
  const [pendingUserLogin, setPendingUserLogin] = useState<{
    userDoc: any;
    userDocId: string;
    email?: string;
    photoURL?: string;
    displayName?: string;
    twoFactorSecret: string;
  } | null>(null)
  const [isErrorShake, setIsErrorShake] = useState(false)

  // Load registration success toast message if redirected from onboarding
  useEffect(() => {
    const regMsg = sessionStorage.getItem('isaac_reg_success_msg')
    if (regMsg) {
      setToast({ message: regMsg, type: 'success' })
      sessionStorage.removeItem('isaac_reg_success_msg')
    }
  }, [])

  const checkUserIsCompleted = (userDoc: any) => {
    if (!userDoc) return false
    if (userDoc.status === 'completed') return true
    if (userDoc.onboarded === true || userDoc.onboarded === 'true') return true
    if (userDoc.username && String(userDoc.username).trim().length > 0) return true
    if (userDoc.fullname && userDoc.dob) return true
    if (userDoc.firstName && userDoc.lastName) return true
    return false
  }

  const performFullUserLogin = (userDoc: any, userDocId: string, email?: string, photoURL?: string, displayName?: string) => {
    localStorage.setItem('isaac_logged_in', 'true')
    localStorage.setItem('isaac_uid', userDocId || userDoc.uid || '')
    localStorage.setItem('isaac_email', email || userDoc.email || '')
    localStorage.setItem('isaac_username', userDoc.username || (displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_'))
    localStorage.setItem('isaac_fullname', userDoc.fullname || displayName || 'ISAAC User')
    localStorage.setItem('isaac_institution', userDoc.institution || 'ISAAC Synergy Network')
    localStorage.setItem('isaac_state', userDoc.state || 'India')
    localStorage.setItem('isaac_bio', userDoc.bio || 'Exploring coordinates and studying spectral signatures of distant nebulae.')
    localStorage.setItem('isaac_avatar', userDoc.avatar || photoURL || '')
    localStorage.setItem('isaac_role', userDoc.role || 'Member')
    localStorage.setItem('isaac_onboarded', 'true')
    if (userDoc.banner) {
      localStorage.setItem('isaac_banner', userDoc.banner)
    }

    if (userDoc.passkey === true || userDoc.hasPasskey === true || (userDoc.passkeys && userDoc.passkeys.length > 0)) {
      localStorage.setItem('isaac_has_passkey', 'true')
    }

    window.history.pushState(null, '', '/dashboard?roll=user')
    window.dispatchEvent(new Event('popstate'))
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      const email = (user.email || '').trim().toLowerCase()
      const uid = user.uid
      const displayName = user.displayName || 'Stargazer'
      const photoURL = user.photoURL || ''

      // 1. Check direct document by UID first
      let userDoc: any = null
      let userDocId: string = uid

      const userDocRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userDocRef)

      if (userSnap.exists()) {
        userDoc = userSnap.data()
        userDocId = userSnap.id
      } else if (email) {
        // 2. Query fallback by email
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', email))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0].data()
          userDocId = querySnapshot.docs[0].id
        }
      }

      const EIGHTEEN_DAYS_MS = 18 * 24 * 60 * 60 * 1000

      if (userDoc) {
        const isCompleted = checkUserIsCompleted(userDoc)
        const createdAt = userDoc.createdAt ? new Date(userDoc.createdAt).getTime() : Date.now()
        const docAgeMs = Date.now() - createdAt

        if (!isCompleted && docAgeMs > EIGHTEEN_DAYS_MS) {
          // EXPIRED INCOMPLETE PROFILE (> 18 Days)! Prune from database and reset onboarding.
          try {
            await deleteDoc(doc(db, 'users', userDocId))
          } catch (delErr) {
            console.warn('Failed to prune expired incomplete user document:', delErr)
          }

          const freshPendingDoc = {
            uid,
            email,
            displayName,
            photoURL,
            status: 'incomplete',
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          try {
            await setDoc(doc(db, 'users', uid), freshPendingDoc)
          } catch (e) {
            console.warn('Error setting fresh pending user doc:', e)
          }

          localStorage.removeItem('isaac_onboarding_draft')
          localStorage.setItem('isaac_logged_in', 'true')
          localStorage.setItem('isaac_uid', uid)
          localStorage.setItem('isaac_email', email)
          localStorage.setItem('isaac_fullname', displayName)
          localStorage.setItem('isaac_avatar', photoURL || '/test/shrvan.png')
          localStorage.setItem('isaac_onboarded', 'false')

          sessionStorage.setItem('isaac_toast_notice', 'Previous incomplete registration expired (18-day limit). Progress reset!')

          window.history.pushState(null, '', '/onboarding?role=user')
          window.dispatchEvent(new Event('popstate'))
          return
        }

        if (isCompleted) {
          // Check Authenticator 2FA requirement
          if (userDoc.twoFactorEnabled === true && userDoc.twoFactorSecret) {
            setPendingUserLogin({
              userDoc,
              userDocId,
              email: email || userDoc.email || '',
              photoURL: userDoc.avatar || photoURL || '',
              displayName: userDoc.fullname || displayName,
              twoFactorSecret: userDoc.twoFactorSecret
            })
            setShow2FAVerify(true)
            setIsLoading(false)
            return
          }

          performFullUserLogin(userDoc, userDocId, email || userDoc.email, userDoc.avatar || photoURL, userDoc.fullname || displayName)
        } else {
          // Incomplete User (< 18 days) -> Resume Onboarding right where they left off!
          localStorage.setItem('isaac_logged_in', 'true')
          localStorage.setItem('isaac_uid', userDocId || uid)
          localStorage.setItem('isaac_email', email || userDoc.email || '')
          localStorage.setItem('isaac_fullname', userDoc.fullname || displayName)
          localStorage.setItem('isaac_avatar', userDoc.avatar || photoURL || '/test/shrvan.png')
          localStorage.setItem('isaac_onboarded', 'false')

          if (userDoc.draftData) {
            localStorage.setItem('isaac_onboarding_draft', JSON.stringify(userDoc.draftData))
          }

          sessionStorage.setItem('isaac_toast_notice', 'Resumed registration right where you left off!')

          window.history.pushState(null, '', '/onboarding?role=user')
          window.dispatchEvent(new Event('popstate'))
        }
      } else {
        // Brand New User -> Create initial incomplete record in Firestore
        const pendingDoc = {
          uid,
          email,
          displayName,
          photoURL,
          status: 'incomplete',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        try {
          await setDoc(doc(db, 'users', uid), pendingDoc)
        } catch (e) {
          console.warn('Error saving pending user doc:', e)
        }

        localStorage.setItem('isaac_logged_in', 'true')
        localStorage.setItem('isaac_uid', uid)
        localStorage.setItem('isaac_email', email)
        localStorage.setItem('isaac_fullname', displayName)
        localStorage.setItem('isaac_avatar', photoURL || '/test/shrvan.png')
        localStorage.setItem('isaac_onboarded', 'false')

        window.history.pushState(null, '', '/onboarding?role=user')
        window.dispatchEvent(new Event('popstate'))
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err)
      if (err?.code === 'auth/popup-closed-by-user') {
        setIsLoading(false)
        return
      }
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setToast({
          message: 'An account with this email address already exists using a different provider (e.g. GitHub).',
          type: 'error'
        })
        return
      }
      setToast({ message: err?.message || 'Google Authentication failed', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    setIsLoading(true)
    try {
      const result = await signInWithPopup(auth, githubProvider)
      const user = result.user
      const uid = user.uid
      const email = user.email || ''
      const displayName = user.displayName || 'GitHub Stargazer'
      const photoURL = user.photoURL || ''

      let userDoc: any = null
      let userDocId: string = uid

      const userDocRef = doc(db, 'users', uid)
      const userSnap = await getDoc(userDocRef)

      if (userSnap.exists()) {
        userDoc = userSnap.data()
        userDocId = userSnap.id
      } else if (email) {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', email))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0].data()
          userDocId = querySnapshot.docs[0].id
        }
      }

      const EIGHTEEN_DAYS_MS = 18 * 24 * 60 * 60 * 1000

      if (userDoc) {
        const isCompleted = checkUserIsCompleted(userDoc)
        const createdAt = userDoc.createdAt ? new Date(userDoc.createdAt).getTime() : Date.now()
        const docAgeMs = Date.now() - createdAt

        if (!isCompleted && docAgeMs > EIGHTEEN_DAYS_MS) {
          try {
            await deleteDoc(doc(db, 'users', userDocId))
          } catch (e) {
            console.warn('Error pruning expired GitHub doc:', e)
          }

          const freshPendingDoc = {
            uid,
            email,
            displayName,
            photoURL,
            status: 'incomplete',
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          await setDoc(doc(db, 'users', uid), freshPendingDoc)

          localStorage.removeItem('isaac_onboarding_draft')
          localStorage.setItem('isaac_logged_in', 'true')
          localStorage.setItem('isaac_uid', uid)
          localStorage.setItem('isaac_email', email)
          localStorage.setItem('isaac_fullname', displayName)
          localStorage.setItem('isaac_onboarded', 'false')

          sessionStorage.setItem('isaac_toast_notice', 'Previous incomplete registration expired (18-day limit). Progress reset!')
          window.history.pushState(null, '', '/onboarding?role=user')
          window.dispatchEvent(new Event('popstate'))
          return
        }

        if (isCompleted) {
          if (userDoc.twoFactorEnabled === true && userDoc.twoFactorSecret) {
            setPendingUserLogin({
              userDoc,
              userDocId,
              email,
              displayName: userDoc.fullname || displayName,
              twoFactorSecret: userDoc.twoFactorSecret
            })
            setShow2FAVerify(true)
            setIsLoading(false)
            return
          }

          performFullUserLogin(userDoc, userDocId, email, userDoc.avatar || photoURL, userDoc.fullname || displayName)
        } else {
          localStorage.setItem('isaac_logged_in', 'true')
          localStorage.setItem('isaac_uid', userDocId)
          localStorage.setItem('isaac_email', email)
          localStorage.setItem('isaac_fullname', userDoc.fullname || displayName)
          localStorage.setItem('isaac_onboarded', 'false')

          window.history.pushState(null, '', '/onboarding?role=user')
          window.dispatchEvent(new Event('popstate'))
        }
      } else {
        const pendingDoc = {
          uid,
          email,
          displayName,
          photoURL,
          status: 'incomplete',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        try {
          await setDoc(doc(db, 'users', uid), pendingDoc)
        } catch (e) {
          console.warn('Error saving pending user doc:', e)
        }

        localStorage.setItem('isaac_logged_in', 'true')
        localStorage.setItem('isaac_uid', uid)
        localStorage.setItem('isaac_email', email)
        localStorage.setItem('isaac_fullname', displayName)
        localStorage.setItem('isaac_avatar', photoURL || '/test/shrvan.png')
        localStorage.setItem('isaac_onboarded', 'false')

        window.history.pushState(null, '', '/onboarding?role=user')
        window.dispatchEvent(new Event('popstate'))
      }
    } catch (err: any) {
      console.error('GitHub Auth Error:', err)
      if (err?.code === 'auth/popup-closed-by-user') {
        setIsLoading(false)
        return
      }
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setToast({
          message: 'An account with this email address already exists using Google. Please sign in with Google.',
          type: 'error'
        })
        return
      }
      setToast({ message: err?.message || 'GitHub Authentication failed', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const performFullLogin = (clubDoc: any) => {
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
  }

  const handleClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setToast(null)
    setShowForgotPassword(false)

    const cleanUser = username.trim()
    const cleanPass = password.trim()

    if (!cleanUser || !cleanPass) {
      setToast({ message: 'Please fill in all security parameters.', type: 'error' })
      return
    }

    setIsLoading(true)

    try {
      const clubsRef = collection(db, 'clubs')
      const q = query(clubsRef, where('repEmail', '==', cleanUser))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setToast({ message: 'Access authorization failed: No club found with this representative email.', type: 'error' })
        setIsLoading(false)
        return
      }

      let authenticated = false
      let clubDoc: any = null
      const inputHash = await hashPassword(cleanPass)

      for (const d of querySnapshot.docs) {
        const data = d.data()
        const dbPassword = data.password || ''
        const rawPhone = data.repPhone || ''
        const cleanDbPhone = rawPhone.replace(/\D/g, '')
        const last10DbPhone = cleanDbPhone.slice(-10)

        const cleanInputPhone = cleanPass.replace(/\D/g, '')
        const last10InputPhone = cleanInputPhone.slice(-10)

        if (dbPassword) {
          if (dbPassword.length === 64) {
            // Hashed password check
            if (dbPassword === inputHash) {
              authenticated = true
              clubDoc = { ...data, id: d.id }
              break
            }
          } else {
            // Legacy plaintext password migration
            if (dbPassword === cleanPass) {
              authenticated = true
              clubDoc = { ...data, id: d.id }
              try {
                // Update Firestore to hashed password format
                await setDoc(d.ref, { password: inputHash }, { merge: true })
              } catch (migrateErr) {
                console.error('Failed to migrate password to hashed format:', migrateErr)
              }
              break
            }
          }
        } else {
          // Legacy phone number fallback migration
          if (last10DbPhone === last10InputPhone && last10InputPhone.length === 10) {
            authenticated = true
            clubDoc = { ...data, id: d.id }
            try {
              // Update Firestore to hashed password format
              await setDoc(d.ref, { password: inputHash }, { merge: true })
            } catch (migrateErr) {
              console.error('Failed to migrate phone credential to hashed format:', migrateErr)
            }
            break
          }
        }
      }

      if (authenticated && clubDoc) {
        if (clubDoc.twoFactorEnabled) {
          setPendingClub(clubDoc)
          setPendingPassword(cleanPass)
          setShow2FAVerify(true)
          setIsLoading(false)
          return
        }
        performFullLogin(clubDoc)
      } else {
        setToast({ message: 'Access authorization failed: Invalid key (Password mismatch).', type: 'error' })
        setShowForgotPassword(true)
        setIsErrorShake(true)
        setTimeout(() => setIsErrorShake(false), 500)
      }
    } catch (err: any) {
      console.error('Firestore query login error:', err)
      setToast({ message: 'Network authentication link error. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setToast(null)

    const code = twoFactorCode.trim()
    if (!code || code.length !== 6) {
      setToast({ message: 'Please enter a valid 6-digit verification code.', type: 'error' })
      return
    }

    setIsLoading(true)

    if (pendingUserLogin) {
      try {
        const isValid = verifyTOTPToken(code, pendingUserLogin.twoFactorSecret)
        if (isValid) {
          performFullUserLogin(
            pendingUserLogin.userDoc,
            pendingUserLogin.userDocId,
            pendingUserLogin.email,
            pendingUserLogin.photoURL,
            pendingUserLogin.displayName
          )
        } else {
          setToast({ message: 'Invalid authentication code. Please check your authenticator app.', type: 'error' })
          setIsErrorShake(true)
          setTimeout(() => setIsErrorShake(false), 500)
        }
      } catch (err: any) {
        console.error('User 2FA verification error:', err)
        setToast({ message: 'An error occurred during verification. Please try again.', type: 'error' })
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (!pendingClub || !pendingPassword) {
      setToast({ message: 'Authentication context lost. Please try logging in again.', type: 'error' })
      setShow2FAVerify(false)
      setIsLoading(false)
      return
    }

    try {
      const passHash = await hashPassword(pendingPassword)
      let decryptedSecret = ''
      try {
        decryptedSecret = await decryptData(pendingClub.twoFactorSecret, passHash)
      } catch (decryptErr) {
        console.error("2FA secret decryption failed:", decryptErr)
        setToast({ message: 'Authentication encryption failure. Access denied.', type: 'error' })
        setIsLoading(false)
        return
      }

      const isValid = verifyTOTPToken(code, decryptedSecret)
      if (isValid) {
        performFullLogin(pendingClub)
      } else {
        setToast({ message: 'Invalid authentication code. Please check your authenticator app.', type: 'error' })
        setIsErrorShake(true)
        setTimeout(() => setIsErrorShake(false), 500)
      }
    } catch (err: any) {
      console.error('2FA verification error:', err)
      setToast({ message: 'An error occurred during verification. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserPasskeyLogin = async () => {
    setIsLoading(true)
    setError('')
    try {
      const challenge = window.crypto.getRandomValues(new Uint8Array(32))
      const requestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'preferred'
      }

      const assertion = (await navigator.credentials.get({
        publicKey: requestOptions
      })) as PublicKeyCredential

      if (!assertion) {
        throw new Error('No passkey credential returned.')
      }

      const credentialId = assertion.id

      const cachedUid = localStorage.getItem('isaac_uid') || localStorage.getItem('isaac_last_uid')
      let matchingUser: any = null
      let userDocId: string = ''

      if (cachedUid) {
        const docRef = doc(db, 'users', cachedUid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          const registered = data.passkeys || []
          const found = registered.find((pk: any) => pk.credentialId === credentialId)
          if (found) {
            matchingUser = data
            userDocId = docSnap.id
          }
        }
      }

      if (!matchingUser) {
        const usersRef = collection(db, 'users')
        const qSnap = await getDocs(usersRef)
        for (const userDoc of qSnap.docs) {
          const data = userDoc.data()
          const registered = data.passkeys || []
          const found = registered.find((pk: any) => pk.credentialId === credentialId)
          if (found) {
            matchingUser = data
            userDocId = userDoc.id
            break
          }
        }
      }

      if (!matchingUser) {
        throw new Error('Passkey credential not registered on any active account.')
      }

      // Successful User Passkey Auth -> Passkeys serve as strong 2FA, directly perform full login
      performFullUserLogin(matchingUser, userDocId, matchingUser.email, matchingUser.avatar, matchingUser.fullname)
    } catch (err: any) {
      console.error('User passkey login failed:', err)
      let displayError = err.message || 'Passkey login failed.'
      if (err.name === 'NotAllowedError' || displayError.includes('not allowed')) {
        displayError = 'Passkey authentication was cancelled.'
      }
      setToast({ message: displayError, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    setToast({
      message: "Key recovery initiated. We'll send authentication instructions to the club's registered telemetry channel.",
      type: 'info'
    })
  }

  // Check URL query parameters for 'role' or 'roll'
  const [currentRoll, setCurrentRoll] = useState(() => {
    const searchStr = search !== undefined ? search : window.location.search
    const params = new URLSearchParams(searchStr)
    return params.get('role') || params.get('roll') || 'user'
  })

  useEffect(() => {
    const checkRoll = () => {
      const searchStr = search !== undefined ? search : window.location.search
      const params = new URLSearchParams(searchStr)
      const roll = params.get('role') || params.get('roll')
      if (!roll) {
        window.history.replaceState(null, '', '/login?role=user')
        setCurrentRoll('user')
      } else {
        setCurrentRoll(roll)
      }
    }

    checkRoll()

    window.addEventListener('popstate', checkRoll)
    return () => window.removeEventListener('popstate', checkRoll)
  }, [search])

  const isClubMode = currentRoll === 'club'

  return (
    <div className="login-page-container">
      <div className="login-cards-container single-card-view">
        
        {show2FAVerify ? (
          /* 2FA Verification Card (User & Club) */
          <div className="login-glass-card">
            <div className="login-header">
              <h2 className="login-title">AUTHENTICATOR 2FA</h2>
              <p className="login-subtitle">Enter the 6-digit code from your authenticator app</p>
            </div>

            <form className="club-login-form" onSubmit={handle2FAVerify}>
              <div className="input-group">
                <label className="input-label">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  pattern="\d*"
                  inputMode="numeric"
                  className={`login-input ${isErrorShake ? 'shake-animation' : ''} ${error ? 'error-border' : ''}`}
                  placeholder="000000"
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontFamily: 'D-Din-Bold' }}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>

              {error && (
                <div className="login-error-message">
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="club-submit-btn" disabled={isLoading}>
                {isLoading ? 'Verifying Code...' : 'Verify & Log In'}
              </button>
              <button
                type="button"
                className="club-register-btn"
                onClick={() => {
                  setShow2FAVerify(false)
                  setTwoFactorCode('')
                  setPendingClub(null)
                  setPendingPassword('')
                  setPendingUserLogin(null)
                  setError('')
                }}
                disabled={isLoading}
              >
                Cancel Verification
              </button>
            </form>
          </div>
        ) : !isClubMode ? (
          /* Card 1: Public Gateway (User Portal) */
          <div className="login-glass-card public-login">
            <div className="login-header">
              <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="login-logo" />
              <h2 className="login-title">PUBLIC GATEWAY</h2>
              <p className="login-subtitle">Connect with Google or GitHub credentials</p>
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

              <button className="social-login-btn github" onClick={handleGithubLogin}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="social-icon">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                Continue with GitHub
              </button>

              <button
                type="button"
                className="club-passkey-btn"
                onClick={handleUserPasskeyLogin}
                disabled={isLoading}
                style={{ marginTop: '4px' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" className="passkey-btn-icon">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                Sign in with Passkey
              </button>
            </div>
          </div>
        ) : (
          /* Card 2: Club Deck / Management Access */
          <div className="login-glass-card club-login">
            <div className="login-header">
              <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="login-logo" />
              <h2 className="login-title">CLUB DECK</h2>
              <p className="login-subtitle">Sign in with club management credentials</p>
            </div>

            <form className="club-login-form" onSubmit={handleClubSubmit}>
              <div className="input-group">
                <label className="input-label">Username</label>
                <input
                  type="text"
                  className={`login-input ${isErrorShake ? 'shake-animation' : ''} ${(error || (toast && toast.type === 'error')) ? 'error-border' : ''}`}
                  placeholder="Club Identifier"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  className={`login-input ${isErrorShake ? 'shake-animation' : ''} ${(error || (toast && toast.type === 'error')) ? 'error-border' : ''}`}
                  placeholder="Access Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {showForgotPassword && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '10px' }}>
                  <button 
                    type="button" 
                    className="forgot-password-btn" 
                    onClick={handleForgotPassword}
                    style={{ padding: 0, background: 'none', border: 'none' }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="club-submit-btn" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="login-register-link-wrapper">
                <button
                  type="button"
                  className="login-register-text-link"
                  onClick={() => {
                    window.history.pushState(null, '', '/onboarding?role=club')
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }}
                  disabled={isLoading}
                >
                  Not registered yet? Register your club <span className="register-link-arrow">↗</span>
                </button>
              </div>
            </form>
          </div>
        )}
    </div>
      
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
