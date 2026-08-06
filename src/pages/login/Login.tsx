import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, setDoc, getDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { hashPassword, decryptData, verifyTOTPToken, verifyPasskeySignature } from '../../utils/security'
import Toast from '../../components/toast/Toast'
import './Login.css'

export default function Login() {
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
  const [isErrorShake, setIsErrorShake] = useState(false)

  // Load registration success toast message if redirected from onboarding
  useEffect(() => {
    const regMsg = sessionStorage.getItem('isaac_reg_success_msg')
    if (regMsg) {
      setToast({ message: regMsg, type: 'success' })
      sessionStorage.removeItem('isaac_reg_success_msg')
    }
  }, [])

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

    if (!pendingClub || !pendingPassword) {
      setToast({ message: 'Authentication context lost. Please try logging in again.', type: 'error' })
      setShow2FAVerify(false)
      return
    }

    setIsLoading(true)

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

  const handlePasskeyLogin = async () => {
    setError('')
    setToast(null)
    setIsLoading(true)

    try {
      // 1. Generate request challenge
      const challenge = window.crypto.getRandomValues(new Uint8Array(32))
      const rpId = window.location.hostname

      const requestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId,
        userVerification: "preferred"
      }

      // 2. Call authenticator to get biometric verification
      const assertion = await navigator.credentials.get({
        publicKey: requestOptions
      }) as PublicKeyCredential

      if (!assertion) {
        throw new Error("No biometric assertion was received.")
      }

      // 3. Extract userHandle
      const response = assertion.response as AuthenticatorAssertionResponse
      const userHandleBuffer = response.userHandle
      if (!userHandleBuffer) {
        throw new Error("Discoverable credential not found. Please log in with password first to register a passkey.")
      }

      // Decode clubId from userHandle
      const clubId = new TextDecoder().decode(new Uint8Array(userHandleBuffer))
      if (!clubId) {
        throw new Error("Could not read club identity from passkey.")
      }

      // 4. Fetch corresponding club document from Firestore
      const docRef = doc(db, 'clubs', clubId)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error("Club account not found in database.")
      }

      const clubDoc = docSnap.data()
      const registeredPasskeys = clubDoc.passkeys || []

      // 5. Find the registered passkey matching assertion ID
      const registeredKey = registeredPasskeys.find((pk: any) => pk.credentialId === assertion.id)
      if (!registeredKey) {
        throw new Error("Passkey is not registered on this account.")
      }

      // 6. Verify signature
      const isVerified = await verifyPasskeySignature(
        registeredKey.publicKey,
        response.authenticatorData,
        response.clientDataJSON,
        response.signature
      )

      if (!isVerified) {
        throw new Error("Biometric authentication verification failed.")
      }

      // 7. Login successful!
      // Add document ID as clubId into clubDoc
      const finalDoc = { ...clubDoc, clubId }
      performFullLogin(finalDoc)
    } catch (err: any) {
      console.error("Passkey login error:", err)
      let displayError = err.message || "Passkey login failed. Please try again or use standard credentials."
      if (err.name === 'NotAllowedError' || displayError.includes('not allowed') || displayError.includes('timed out')) {
        displayError = "Wait, did you just reject passkey check? Bruhh...Try again or use password!"
      }
      setToast({ message: displayError, type: 'error' })
      setIsErrorShake(true)
      setTimeout(() => setIsErrorShake(false), 500)
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

            <button
              type="button"
              className="club-passkey-btn"
              onClick={handlePasskeyLogin}
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

        {/* Card 2: Club Deck / Management Access */}
        <div className="login-glass-card club-login">
          {show2FAVerify ? (
            <>
              <div className="login-header">
                <h2 className="login-title">2-FACTOR SECURITY</h2>
                <p className="login-subtitle">Enter the 6-digit authenticator code</p>
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
                    setError('')
                  }}
                  disabled={isLoading}
                >
                  Cancel Verification
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="login-header">
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

                <button
                  type="button"
                  className="club-passkey-btn"
                  onClick={handlePasskeyLogin}
                  disabled={isLoading}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" className="passkey-btn-icon">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                  Sign in with Passkey
                </button>

                <div className="login-row-buttons">
                  <button type="submit" className="club-submit-btn" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
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
                    Register
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

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
