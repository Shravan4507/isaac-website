import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../../firebase'
import Dropdown from '../../../components/dropdown/Dropdown'
import ImageCropper from '../../../components/image-cropper/ImageCropper'
import QRCode from 'qrcode'
import {
  hashPassword,
  encryptData,
  decryptData,
  generateTOTPSecret,
  generateTOTPURI,
  verifyTOTPToken,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from '../../../utils/security'
import Toast, { type ToastType } from '../../../components/toast/Toast'
import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  onSaveSuccess: () => void
}

const COUNTRIES = [
  { name: 'India', code: '+91', iso: 'IND', length: 10, format: 'XXXXX XXXXX' },
  { name: 'United States', code: '+1', iso: 'USA', length: 10, format: 'XXX-XXX-XXXX' },
  { name: 'United Kingdom', code: '+44', iso: 'GBR', length: 10, format: 'XXXX XXXXXX' },
  { name: 'Australia', code: '+61', iso: 'AUS', length: 9, format: 'XXX XXX XXX' },
  { name: 'Canada', code: '+1', iso: 'CAN', length: 10, format: 'XXX-XXX-XXXX' },
  { name: 'Germany', code: '+49', iso: 'DEU', length: 11, format: 'XXXX XXXXXXX' },
  { name: 'France', code: '+33', iso: 'FRA', length: 9, format: 'X XX XX XX XX' },
  { name: 'Japan', code: '+81', iso: 'JPN', length: 10, format: 'XX-XXXX-XXXX' },
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Delhi',
  'Puducherry', 'Jammu and Kashmir', 'Ladakh'
]

const parseSocialUsername = (val: string, platform: string): string => {
  let path = val.trim()
  if (!path) return ''
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path)
      let pathname = url.pathname
      if (platform === 'youtube' && pathname.startsWith('/c/')) {
        pathname = pathname.substring(3)
      } else if (platform === 'youtube' && pathname.startsWith('/@')) {
        pathname = pathname.substring(2)
      }
      const parts = pathname.split('/').filter(Boolean)
      return parts[0] || ''
    }
  } catch (e) {
    // Treat as raw handle/text if URL parsing fails
  }
  if (path.startsWith('@')) {
    path = path.substring(1)
  }
  return path
}

export default function SettingsModal({ isOpen, onClose, clubId, onSaveSuccess }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('Profile')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form states
  const [clubName, setClubName] = useState('')
  const [clubCollege, setClubCollege] = useState('')
  const [clubEstYear, setClubEstYear] = useState('')
  const [clubUsername, setClubUsername] = useState('')
  const [clubLogo, setClubLogo] = useState<string | null>(null)
  const [clubBanner, setClubBanner] = useState<string | null>(null)

  // Representative Info
  const [repFirstName, setRepFirstName] = useState('')
  const [repMiddleName, setRepMiddleName] = useState('')
  const [repLastName, setRepLastName] = useState('')
  const [repDesignation, setRepDesignation] = useState('')
  const [repCustomDesignation, setRepCustomDesignation] = useState('')
  const [repEmail, setRepEmail] = useState('')
  const [repCountry, setRepCountry] = useState(COUNTRIES[0])
  const [repPhone, setRepPhone] = useState('')

  // Contact Info
  const [clubEmail, setClubEmail] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [clubState, setClubState] = useState('')
  const [clubAddress, setClubAddress] = useState('')
  const [clubZip, setClubZip] = useState('')
  const [clubLat, setClubLat] = useState(20.5937)
  const [clubLng, setClubLng] = useState(78.9629)

  // Socials
  const [socialWebsite, setSocialWebsite] = useState('')
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialLinkedIn, setSocialLinkedIn] = useState('')
  const [socialYouTube, setSocialYouTube] = useState('')
  const [socialFacebook, setSocialFacebook] = useState('')
  const [socialDiscord, setSocialDiscord] = useState('')
  const [socialGitHub, setSocialGitHub] = useState('')

  // Description & Activities
  const [clubDescription, setClubDescription] = useState('')
  const [clubActivities, setClubActivities] = useState<string[]>([])
  const [clubCustomActivity, setClubCustomActivity] = useState('')

  // Password Reset states
  const [dbPassword, setDbPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [warningField, setWarningField] = useState<'current' | 'new' | 'confirm' | null>(null)
  const warningTimeoutRef = useRef<any>(null)

  const triggerCopyPasteWarning = (field: 'current' | 'new' | 'confirm') => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    setWarningField(field)
    warningTimeoutRef.current = setTimeout(() => {
      setWarningField(null)
    }, 2500)
  }

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [])

  const [currentPasswordValid, setCurrentPasswordValid] = useState<boolean | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Two-Factor Authentication (2FA) states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorSetupStep, setTwoFactorSetupStep] = useState<'idle' | 'verify_password' | 'scan_verify'>('idle')
  const [twoFactorPassword, setTwoFactorPassword] = useState('')
  const [showTwoFactorPassword, setShowTwoFactorPassword] = useState(false)
  const [twoFactorPasswordValid, setTwoFactorPasswordValid] = useState<boolean | null>(null)
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorQR, setTwoFactorQR] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorError, setTwoFactorError] = useState('')
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('')
  const [isEnabling2FA, setIsEnabling2FA] = useState(false)
  const [isDisabling2FA, setIsDisabling2FA] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [showDisableVerify, setShowDisableVerify] = useState(false)
  const [is2FAShake, setIs2FAShake] = useState(false)
  const [passkeys, setPasskeys] = useState<any[]>([])
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false)
  const [showPasskeyNameModal, setShowPasskeyNameModal] = useState(false)
  const [tempPasskeyName, setTempPasskeyName] = useState('')
  const [pendingPasskeyCred, setPendingPasskeyCred] = useState<{ credentialId: string, publicKey: string } | null>(null)
  const [pendingDeleteCredId, setPendingDeleteCredId] = useState<string | null>(null)
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false)
  const [deletePasswordInput, setDeletePasswordInput] = useState('')
  const [deletePasswordError, setDeletePasswordError] = useState('')
  const [isVerifyingDeletePassword, setIsVerifyingDeletePassword] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // Real-time verification of current password with debounce
  useEffect(() => {
    if (!currentPassword) {
      setCurrentPasswordValid(null)
      return
    }

    const timer = setTimeout(async () => {
      const cleanDbPhone = repPhone.replace(/\D/g, '').slice(-10)
      let isCorrect = false
      if (dbPassword) {
        if (dbPassword.length === 64) {
          isCorrect = (dbPassword === await hashPassword(currentPassword))
        } else {
          isCorrect = (dbPassword === currentPassword)
        }
      } else {
        isCorrect = (currentPassword.replace(/\D/g, '').slice(-10) === cleanDbPhone)
      }

      setCurrentPasswordValid(isCorrect)
    }, 600)

    return () => clearTimeout(timer)
  }, [currentPassword, dbPassword, repPhone])

  // New password requirements validation mapping
  const requirements = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[@$!%*?&#]/.test(newPassword)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)

    // Validate current password synchronously on submit
    const cleanDbPhone = repPhone.replace(/\D/g, '').slice(-10)
    let isCurrentCorrect = false
    if (dbPassword) {
      if (dbPassword.length === 64) {
        isCurrentCorrect = (dbPassword === await hashPassword(currentPassword))
      } else {
        isCurrentCorrect = (dbPassword === currentPassword)
      }
    } else {
      isCurrentCorrect = (currentPassword.replace(/\D/g, '').slice(-10) === cleanDbPhone)
    }

    if (!isCurrentCorrect) {
      setCurrentPasswordValid(false)
      return
    } else {
      setCurrentPasswordValid(true)
    }

    // Strong password check
    if (!requirements.minLength || !requirements.uppercase || !requirements.lowercase || !requirements.number || !requirements.special) {
      return
    }

    if (newPassword !== confirmPassword) {
      return
    }

    try {
      setIsResetting(true)
      const docRef = doc(db, 'clubs', clubId)
      const hashedNew = await hashPassword(newPassword.trim())

      // If 2FA is active, we must decrypt with old credentials and re-encrypt with new ones
      const docSnap = await getDoc(docRef)
      const data = docSnap.data()

      if (data && data.twoFactorEnabled && data.twoFactorSecret) {
        const oldPassHash = dbPassword.length === 64 ? dbPassword : await hashPassword(currentPassword)
        const decryptedSecret = await decryptData(data.twoFactorSecret, oldPassHash)
        const reEncryptedSecret = await encryptData(decryptedSecret, hashedNew)

        await setDoc(docRef, {
          password: hashedNew,
          twoFactorSecret: reEncryptedSecret
        }, { merge: true })
      } else {
        await setDoc(docRef, { password: hashedNew }, { merge: true })
      }

      setDbPassword(hashedNew)
      setToast({ message: "Password updated successfully! Use your new password on your next login.", type: "success" })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error("Failed to reset password:", err)
      setToast({ message: "Failed to reset password. Please try again.", type: "error" })
    } finally {
      setIsResetting(false)
    }
  }

  // Two-Factor Authentication (2FA) handlers
  const handleInitiate2FA = () => {
    setToast(null)
    setTwoFactorError('')
    setTwoFactorSuccess('')
    setTwoFactorPassword('')
    setTwoFactorPasswordValid(null)
    setTwoFactorSetupStep('verify_password')
  }

  const handleVerifyPasswordFor2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    setTwoFactorError('')

    const cleanDbPhone = repPhone.replace(/\D/g, '').slice(-10)
    let isCorrect = false
    if (dbPassword) {
      if (dbPassword.length === 64) {
        isCorrect = (dbPassword === await hashPassword(twoFactorPassword))
      } else {
        isCorrect = (dbPassword === twoFactorPassword)
      }
    } else {
      isCorrect = (twoFactorPassword.replace(/\D/g, '').slice(-10) === cleanDbPhone)
    }

    if (!isCorrect) {
      setTwoFactorPasswordValid(false)
      setToast({ message: 'Current password is incorrect.', type: 'error' })
      setIs2FAShake(true)
      setTimeout(() => setIs2FAShake(false), 500)
      return
    }

    setTwoFactorPasswordValid(true)
    setIsEnabling2FA(true)

    try {
      // 1. Ensure password is hashed in Firestore
      let passHash = dbPassword
      if (!dbPassword || dbPassword.length !== 64) {
        passHash = await hashPassword(twoFactorPassword)
        const docRef = doc(db, 'clubs', clubId)
        await setDoc(docRef, { password: passHash }, { merge: true })
        setDbPassword(passHash)
      }

      // 2. Generate TOTP secret and QR code URI
      const secret = generateTOTPSecret()
      const label = repEmail || clubUsername
      const uri = generateTOTPURI(secret, label, "ISAAC")
      const qrUrl = await QRCode.toDataURL(uri)

      setTwoFactorSecret(secret)
      setTwoFactorQR(qrUrl)
      setTwoFactorToken('')
      setTwoFactorSetupStep('scan_verify')
    } catch (err: any) {
      console.error('Failed to initiate 2FA setup:', err)
      setToast({ message: 'Could not generate 2FA credentials. Please try again.', type: 'error' })
    } finally {
      setIsEnabling2FA(false)
    }
  }

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    setTwoFactorError('')

    const token = twoFactorToken.trim()
    if (!token || token.length !== 6) {
      setToast({ message: 'Please enter a valid 6-digit code.', type: 'error' })
      return
    }

    setIsEnabling2FA(true)

    try {
      const isValid = verifyTOTPToken(token, twoFactorSecret)
      if (!isValid) {
        setToast({ message: 'Invalid verification code. Please check your app and try again.', type: 'error' })
        setIs2FAShake(true)
        setTimeout(() => setIs2FAShake(false), 500)
        setIsEnabling2FA(false)
        return
      }

      // Encrypt the secret using the hashed password
      const passHash = dbPassword || await hashPassword(twoFactorPassword)
      const encryptedSecret = await encryptData(twoFactorSecret, passHash)

      const docRef = doc(db, 'clubs', clubId)
      await setDoc(docRef, {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret
      }, { merge: true })

      setTwoFactorEnabled(true)
      setToast({ message: 'Two-factor authentication has been successfully enabled on your account!', type: 'success' })
      setTwoFactorSetupStep('idle')
      setTwoFactorPassword('')
      setTwoFactorSecret('')
      setTwoFactorQR('')
      setTwoFactorToken('')
    } catch (err: any) {
      console.error('Failed to enable 2FA:', err)
      setToast({ message: 'An error occurred. Failed to enable 2FA.', type: 'error' })
    } finally {
      setIsEnabling2FA(false)
    }
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)
    setTwoFactorError('')

    const cleanDbPhone = repPhone.replace(/\D/g, '').slice(-10)
    let isCorrect = false
    if (dbPassword) {
      if (dbPassword.length === 64) {
        isCorrect = (dbPassword === await hashPassword(twoFactorPassword))
      } else {
        isCorrect = (dbPassword === twoFactorPassword)
      }
    } else {
      isCorrect = (twoFactorPassword.replace(/\D/g, '').slice(-10) === cleanDbPhone)
    }

    if (!isCorrect) {
      setTwoFactorPasswordValid(false)
      setToast({ message: 'Current password is incorrect.', type: 'error' })
      setIs2FAShake(true)
      setTimeout(() => setIs2FAShake(false), 500)
      return
    }

    setTwoFactorPasswordValid(true)
    setIsDisabling2FA(true)

    try {
      const docRef = doc(db, 'clubs', clubId)
      await setDoc(docRef, {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }, { merge: true })

      setTwoFactorEnabled(false)
      setToast({ message: 'Two-factor authentication has been disabled.', type: 'success' })
      setShowDisableVerify(false)
      setTwoFactorPassword('')
    } catch (err: any) {
      console.error('Failed to disable 2FA:', err)
      setToast({ message: 'An error occurred. Failed to disable 2FA.', type: 'error' })
    } finally {
      setIsDisabling2FA(false)
    }
  }

  const handleRegisterPasskey = async () => {
    setToast(null)
    setTwoFactorError('')
    setTwoFactorSuccess('')
    setIsRegisteringPasskey(true)

    if (passkeys.length >= 3) {
      setToast({ message: "Maximum limit of 3 registered passkeys reached. Please remove an existing device first.", type: 'error' })
      setIsRegisteringPasskey(false)
      return
    }

    try {
      // 1. Generate challenge and creation options
      const challenge = window.crypto.getRandomValues(new Uint8Array(32))
      const rpId = window.location.hostname
      const userIdBytes = new TextEncoder().encode(clubId)

      const creationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "ISAAC Website",
          id: rpId
        },
        user: {
          id: userIdBytes,
          name: clubUsername || "club_user",
          displayName: clubName || "Club Member"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 } // ES256 (ECDSA P-256)
        ],
        authenticatorSelection: {
          residentKey: "required", // discoverable credential
          userVerification: "preferred"
        },
        timeout: 60000
      }

      // 2. Call WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: creationOptions
      }) as PublicKeyCredential

      if (!credential) {
        throw new Error("No credential was generated by the authenticator.")
      }

      // 3. Extract properties
      const response = credential.response as AuthenticatorAttestationResponse
      const publicKeyBuffer = response.getPublicKey()
      if (!publicKeyBuffer) {
        throw new Error("Authenticator did not return a public key.")
      }

      const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer)
      const credentialId = credential.id

      // 4. Trigger name input overlay modal
      setPendingPasskeyCred({ credentialId, publicKey: publicKeyBase64 })
      setTempPasskeyName(`Passkey (${new Date().toLocaleDateString()})`)
      setShowPasskeyNameModal(true)
    } catch (err: any) {
      console.error("Passkey registration failed:", err)
      let displayError = err.message || "Failed to register passkey. Make sure biometrics are configured on your device."
      if (err.name === 'NotAllowedError' || displayError.includes('not allowed') || displayError.includes('timed out')) {
        displayError = "Wait, did you just reject passkey check? Bruhh...Try again!"
      }
      setToast({ message: displayError, type: 'error' })
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  const handleSavePasskeyWithCustomName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingPasskeyCred) return

    setToast(null)
    setTwoFactorError('')
    setTwoFactorSuccess('')

    try {
      const name = tempPasskeyName.trim() || `Passkey (${new Date().toLocaleDateString()})`
      const updatedPasskeys = [
        ...passkeys,
        {
          credentialId: pendingPasskeyCred.credentialId,
          publicKey: pendingPasskeyCred.publicKey,
          name: name,
          created: new Date().toISOString()
        }
      ]

      const docRef = doc(db, 'clubs', clubId)
      await setDoc(docRef, { passkeys: updatedPasskeys }, { merge: true })

      setPasskeys(updatedPasskeys)
      setToast({ message: `Successfully registered passkey "${name}"!`, type: 'success' })
      setShowPasskeyNameModal(false)
      setPendingPasskeyCred(null)
    } catch (err: any) {
      console.error("Failed to save passkey:", err)
      setToast({ message: "Failed to save passkey. Please try again.", type: 'error' })
    }
  }

  const executePasskeyDeletion = async (credentialId: string) => {
    try {
      const updatedPasskeys = passkeys.filter((pk: any) => pk.credentialId !== credentialId)
      const docRef = doc(db, 'clubs', clubId)
      await setDoc(docRef, { passkeys: updatedPasskeys }, { merge: true })
      setPasskeys(updatedPasskeys)
      setToast({ message: "Passkey removed successfully.", type: 'success' })
    } catch (err: any) {
      console.error("Failed to delete passkey:", err)
      setToast({ message: "Failed to remove passkey. Please try again.", type: 'error' })
    }
  }

  const handleDeletePasskey = async (credentialId: string) => {
    if (!confirm("Are you sure you want to remove this passkey? You will no longer be able to log in with this biometric device.")) {
      return
    }

    setToast(null)
    setTwoFactorError('')
    setTwoFactorSuccess('')

    // Try to verify using the passkey itself first (same device check)
    try {
      const challenge = window.crypto.getRandomValues(new Uint8Array(32))
      const requestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64ToArrayBuffer(credentialId)
          }
        ],
        userVerification: "preferred"
      }

      // Prompt user for local biometrics
      const assertion = await navigator.credentials.get({
        publicKey: requestOptions
      })

      if (assertion) {
        // Verified: they are on the same device!
        await executePasskeyDeletion(credentialId)
        return
      }
    } catch (err) {
      console.log("Biometric verification failed/canceled. Falling back to password validation.", err)
    }

    // Fallback: different device or biometric cancel -> Prompt for account password
    setPendingDeleteCredId(credentialId)
    setDeletePasswordInput('')
    setDeletePasswordError('')
    setShowDeletePasswordModal(true)
  }

  const handleVerifyDeletePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingDeleteCredId) return

    setDeletePasswordError('')
    setIsVerifyingDeletePassword(true)

    try {
      const cleanDbPhone = repPhone.replace(/\D/g, '').slice(-10)
      let isCorrect = false
      if (dbPassword) {
        if (dbPassword.length === 64) {
          isCorrect = (dbPassword === await hashPassword(deletePasswordInput))
        } else {
          isCorrect = (dbPassword === deletePasswordInput)
        }
      } else {
        isCorrect = (deletePasswordInput.replace(/\D/g, '').slice(-10) === cleanDbPhone)
      }

      if (!isCorrect) {
        setDeletePasswordError('Incorrect password. Access denied.')
        setIs2FAShake(true)
        setTimeout(() => setIs2FAShake(false), 500)
        setIsVerifyingDeletePassword(false)
        return
      }

      // Deletion allowed!
      await executePasskeyDeletion(pendingDeleteCredId)
      setShowDeletePasswordModal(false)
      setPendingDeleteCredId(null)
    } catch (err) {
      console.error("Password verification delete error:", err)
      setDeletePasswordError("Verification failed. Please try again.")
    } finally {
      setIsVerifyingDeletePassword(false)
    }
  }

  const handleCopySecretToClipboard = () => {
    navigator.clipboard.writeText(twoFactorSecret)
    setToast({ message: "Secret key copied to clipboard!", type: 'success' })
    setShowCopySuccess(true)
    setTimeout(() => {
      setShowCopySuccess(false)
    }, 2000)
  }

  // Cropper states
  const [cropperSrc, setCropperSrc] = useState('')
  const [showCropper, setShowCropper] = useState(false)
  const [cropperType, setCropperType] = useState<'logo' | 'banner'>('logo')

  // Map elements
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maptilersdk.Map | null>(null)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [geocodingError, setGeocodingError] = useState<string | null>(null)

  // Fetch full club data from Firestore when modal opens
  useEffect(() => {
    if (!isOpen || !clubId) return

    const loadFullClubData = async () => {
      try {
        setLoading(true)
        const docRef = doc(db, 'clubs', clubId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setClubName(data.clubName || '')
          setClubCollege(data.institution || '')
          setClubEstYear(data.estYear || '')
          setClubUsername(data.username || '')
          setClubLogo(data.logo || null)
          setClubBanner(data.banner || null)
          setDbPassword(data.password || '')
          setTwoFactorEnabled(data.twoFactorEnabled || false)
          setPasskeys(data.passkeys || [])

          setRepFirstName(data.repFirstName || '')
          setRepMiddleName(data.repMiddleName || '')
          setRepLastName(data.repLastName || '')
          setRepDesignation(data.repDesignation || '')
          setRepCustomDesignation(data.repCustomDesignation || '')
          setRepEmail(data.repEmail || '')
          setRepPhone(data.repPhone || '')

          if (data.country) {
            const countryMatch = COUNTRIES.find(c => c.name.toLowerCase() === data.country.toLowerCase())
            if (countryMatch) setRepCountry(countryMatch)
          }

          setClubEmail(data.clubEmail || '')
          setClubAddress(data.address || '')
          setClubCity(data.city || '')
          setClubState(data.state || '')
          setClubZip(data.zipCode || '')

          setClubLat(data.latitude || 20.5937)
          setClubLng(data.longitude || 78.9629)

          setSocialWebsite(data.website || '')
          setSocialInstagram(data.instagram || '')
          setSocialLinkedIn(data.linkedin || '')
          setSocialYouTube(data.youtube || '')
          setSocialFacebook(data.facebook || '')
          setSocialDiscord(data.discord || '')
          setSocialGitHub(data.github || '')

          setClubDescription(data.description || '')
          setClubActivities(data.activities || [])
          setClubCustomActivity(data.customActivity || '')
        }
      } catch (err) {
        console.error("Error loading full club details:", err)
      } finally {
        setLoading(false)
      }
    }

    loadFullClubData()
  }, [isOpen, clubId])

  // Initialize Map container when modal completes data loading
  useEffect(() => {
    if (loading || !isOpen || !mapContainerRef.current) return

    // Clean up existing map instance just in case
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    try {
      const apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY'
      maptilersdk.config.apiKey = apiKey

      const map = new maptilersdk.Map({
        container: mapContainerRef.current,
        style: maptilersdk.MapStyle.STREETS.DARK,
        center: [clubLng, clubLat],
        zoom: 12,
        minZoom: 2,
        maxZoom: 18,
        navigationControl: false,
        geolocateControl: false,
      })

      mapRef.current = map

      const geolocate = new maptilersdk.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: false
      })
      const nav = new maptilersdk.NavigationControl({ showCompass: false })

      map.addControl(geolocate, 'bottom-right')
      map.addControl(nav, 'bottom-right')

      // Listen to map movements to reverse-geocode new location coordinate
      map.on('moveend', () => {
        const center = map.getCenter()
        setClubLat(center.lat)
        setClubLng(center.lng)

        setIsResolvingAddress(true)
        setGeocodingError(null)

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'isaac-website-settings-edit'
          }
        })
          .then(res => {
            if (!res.ok) throw new Error("Reverse geocoding error")
            return res.json()
          })
          .then(data => {
            if (data && data.address) {
              const addr = data.address
              const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || ''
              const postcode = addr.postcode || ''
              const state = addr.state || ''

              if (city) setClubCity(city)
              if (postcode) setClubZip(postcode.replace(/\D/g, ''))

              if (state) {
                const matchedState = INDIAN_STATES.find(
                  s => s.toLowerCase() === state.toLowerCase()
                )
                if (matchedState) {
                  setClubState(matchedState)
                }
              }

              const road = addr.road || ''
              const suburb = addr.suburb || addr.neighbourhood || ''
              const addressParts = [road, suburb, city, state].filter(Boolean)
              const formattedAddress = addressParts.join(', ')
              if (formattedAddress) {
                setClubAddress(formattedAddress)
              }
            }
          })
          .catch(err => {
            console.error("Nominatim reverse geocode failed:", err)
            setGeocodingError("Failed to fetch address. Please fill inputs manually.")
          })
          .finally(() => {
            setIsResolvingAddress(false)
          })
      })

      // Fix sizes after render transitions complete
      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize()
      }, 400)

    } catch (err) {
      console.error("Map initialization failed inside SettingsModal:", err)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [loading, isOpen])

  const toggleActivity = (activity: string) => {
    setClubActivities(prev =>
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation checks
    const newErrors: Record<string, string> = {}
    if (!clubName.trim()) newErrors.clubName = 'Club name is required'
    if (!clubCollege.trim()) newErrors.clubCollege = 'College name is required'
    if (!clubUsername.trim()) newErrors.clubUsername = 'Username is required'
    if (!repFirstName.trim()) newErrors.repFirstName = 'First name is required'
    if (!repLastName.trim()) newErrors.repLastName = 'Last name is required'
    if (!repDesignation) newErrors.repDesignation = 'Designation is required'
    if (repDesignation === 'Other' && !repCustomDesignation.trim()) newErrors.repCustomDesignation = 'Please specify designation'
    if (!repPhone.trim()) newErrors.repPhone = 'Phone number is required'
    if (!clubEmail.trim()) newErrors.clubEmail = 'Club email is required'
    if (!clubCity.trim()) newErrors.clubCity = 'City is required'
    if (!clubState) newErrors.clubState = 'State is required'
    if (!clubDescription.trim()) newErrors.clubDescription = 'Description is required'
    if (clubActivities.length === 0) newErrors.clubActivities = 'Please select at least one activity'
    if (clubActivities.includes('Other') && !clubCustomActivity.trim()) newErrors.clubCustomActivity = 'Please specify custom activities'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setIsSaving(true)
      let logoUrl = clubLogo
      let bannerUrl = clubBanner

      // Upload files if updated locally (starts with data:image/)
      if (clubLogo && clubLogo.startsWith('data:image/')) {
        const logoRef = ref(storage, `clubs/${clubUsername}/logo.png`)
        await uploadString(logoRef, clubLogo, 'data_url')
        logoUrl = await getDownloadURL(logoRef)
      }

      if (clubBanner && clubBanner.startsWith('data:image/')) {
        const bannerRef = ref(storage, `clubs/${clubUsername}/banner.png`)
        await uploadString(bannerRef, clubBanner, 'data_url')
        bannerUrl = await getDownloadURL(bannerRef)
      }

      const docRef = doc(db, 'clubs', clubId)
      const updatedDoc = {
        clubName: clubName.trim(),
        institution: clubCollege.trim(),
        shortName: clubName.trim(),
        estYear: clubEstYear.trim(),
        username: clubUsername.trim(),
        logo: logoUrl,
        banner: bannerUrl,
        repFirstName: repFirstName.trim(),
        repMiddleName: repMiddleName.trim(),
        repLastName: repLastName.trim(),
        repDesignation: repDesignation,
        repCustomDesignation: repCustomDesignation.trim(),
        repEmail: repEmail, // read only
        repPhone: repPhone.trim(),
        country: repCountry.name,
        clubEmail: clubEmail.trim(),
        address: clubAddress.trim(),
        city: clubCity.trim(),
        state: clubState,
        zipCode: clubZip.trim(),
        latitude: Number(clubLat) || 0,
        longitude: Number(clubLng) || 0,
        website: socialWebsite.trim(),
        instagram: socialInstagram.trim(),
        linkedin: socialLinkedIn.trim(),
        youtube: socialYouTube.trim(),
        facebook: socialFacebook.trim(),
        discord: socialDiscord.trim(),
        github: socialGitHub.trim(),
        description: clubDescription.trim(),
        activities: clubActivities,
        customActivity: clubCustomActivity.trim(),
      }

      await setDoc(docRef, updatedDoc, { merge: true })

      // Synchronize client local storage values
      localStorage.setItem('isaac_fullname', clubName.trim())
      localStorage.setItem('isaac_username', clubUsername.trim())
      localStorage.setItem('isaac_institution', clubCollege.trim())
      if (logoUrl) localStorage.setItem('isaac_logo', logoUrl)
      if (bannerUrl) localStorage.setItem('isaac_banner', bannerUrl)
      localStorage.setItem('isaac_est_year', clubEstYear.trim())

      // Update social storage items
      localStorage.setItem('isaac_social_instagram', socialInstagram.trim())
      localStorage.setItem('isaac_social_linkedin', socialLinkedIn.trim())
      localStorage.setItem('isaac_social_youtube', socialYouTube.trim())
      localStorage.setItem('isaac_social_facebook', socialFacebook.trim())
      localStorage.setItem('isaac_social_discord', socialDiscord.trim())
      localStorage.setItem('isaac_social_github', socialGitHub.trim())

      onSaveSuccess()
      onClose()
    } catch (err) {
      console.error("Failed to update club profile:", err)
      alert("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }
  // Reference features currently on hold to bypass unused compiler checks
  if (false) {
    console.log(
      twoFactorEnabled,
      twoFactorSetupStep,
      showTwoFactorPassword,
      setShowTwoFactorPassword,
      twoFactorPasswordValid,
      twoFactorQR,
      twoFactorError,
      twoFactorSuccess,
      isEnabling2FA,
      isDisabling2FA,
      showCopySuccess,
      showDisableVerify,
      isRegisteringPasskey,
      handleInitiate2FA,
      handleVerifyPasswordFor2FA,
      handleEnable2FA,
      handleDisable2FA,
      handleRegisterPasskey,
      handleDeletePasskey,
      handleCopySecretToClipboard
    )
  }
  if (!isOpen) return null

  return createPortal(
    <div className="settings-modal-overlay">
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Left Side: Sidebar */}
        <div className="settings-modal-sidebar">
          <div className="settings-sidebar-header">
            <h3 className="settings-sidebar-title">Settings</h3>
            <button className="settings-close-icon-btn" onClick={onClose} aria-label="Close settings">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="settings-sidebar-menu">
            <button
              className={`settings-menu-item ${activeTab === 'Profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('Profile')}
            >
              <svg className="settings-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>
            <button
              className={`settings-menu-item ${activeTab === 'Password' ? 'active' : ''}`}
              onClick={() => setActiveTab('Password')}
            >
              <svg className="settings-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Password Reset
            </button>
            <button
              className={`settings-menu-item ${activeTab === 'TwoFactor' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('TwoFactor')
                setTwoFactorSetupStep('idle')
                setTwoFactorError('')
                setTwoFactorSuccess('')
                setShowDisableVerify(false)
              }}
            >
              <svg className="settings-menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 11l2 2 4-4" />
              </svg>
              Security & Passkeys
              <span className="coming-soon-badge" style={{
                marginLeft: 'auto',
                fontSize: '10px',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                fontFamily: 'D-Din',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Soon</span>
            </button>
          </div>
        </div>

        {/* Right Side: Content pane */}
        <div className="settings-modal-content-panel">
          <div className="settings-content-header">
            <h2 className="settings-content-title">
              {activeTab === 'Profile' ? 'Edit Profile' : activeTab === 'Password' ? 'Password Reset' : activeTab === 'TwoFactor' ? 'Security & Passkeys' : 'Settings'}
            </h2>
          </div>

          <div className="settings-content-body">
            {loading ? (
              <div className="settings-loading-overlay">
                <div className="orbit-loader" />
              </div>
            ) : activeTab === 'Profile' ? (
              <form className="settings-edit-form" onSubmit={handleSave}>
                {/* Image upload section (logo + banner) */}
                <div className="settings-upload-zone">
                  <div
                    className="settings-banner-zone"
                    onClick={() => document.getElementById('settings-banner-input')?.click()}
                  >
                    {clubBanner ? (
                      <img src={clubBanner} alt="Club Banner" className="settings-banner-img" />
                    ) : (
                      <div className="settings-banner-placeholder">
                        <span>Click to upload hero banner image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      id="settings-banner-input"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = () => {
                            setCropperSrc(reader.result as string)
                            setCropperType('banner')
                            setShowCropper(true)
                          }
                          reader.readAsDataURL(file)
                        }
                        e.target.value = ''
                      }}
                    />
                  </div>

                  <div className="settings-logo-zone-wrapper">
                    <div
                      className={`settings-logo-zone ${errors.clubLogo ? 'error-border' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        document.getElementById('settings-logo-input')?.click()
                      }}
                    >
                      {clubLogo ? (
                        <img src={clubLogo} alt="Club Logo" className="settings-logo-img" />
                      ) : (
                        <div className="settings-logo-placeholder">
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </div>
                      )}
                      <input
                        type="file"
                        id="settings-logo-input"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = () => {
                              setCropperSrc(reader.result as string)
                              setCropperType('logo')
                              setShowCropper(true)
                            }
                            reader.readAsDataURL(file)
                          }
                          e.target.value = ''
                        }}
                      />
                    </div>
                    <span className="settings-upload-hint-text">
                      Click banner or logo avatar to upload and adjust crop bounding boxes.
                    </span>
                  </div>
                </div>

                {/* SECTION 1: Club Info */}
                <div className="settings-section-divider">
                  <span className="settings-divider-num">01</span>
                  <span className="settings-divider-label">Club Information</span>
                  <div className="settings-divider-line" />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Club Name *</label>
                    <input
                      type="text"
                      name="clubName"
                      className={`settings-form-input ${errors.clubName ? 'error-border' : ''}`}
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                    />
                    {errors.clubName && <span className="settings-error-text">{errors.clubName}</span>}
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">College / Institution *</label>
                    <input
                      type="text"
                      name="clubCollege"
                      className={`settings-form-input ${errors.clubCollege ? 'error-border' : ''}`}
                      value={clubCollege}
                      onChange={(e) => setClubCollege(e.target.value)}
                    />
                    {errors.clubCollege && <span className="settings-error-text">{errors.clubCollege}</span>}
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Year Established</label>
                    <input
                      type="number"
                      className="settings-form-input"
                      value={clubEstYear}
                      min="1800"
                      max="2100"
                      onChange={(e) => setClubEstYear(e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Club Username *</label>
                    <div className={`settings-username-wrapper ${errors.clubUsername ? 'error-border' : ''}`}>
                      <span className="settings-username-prefix">@</span>
                      <input
                        type="text"
                        name="clubUsername"
                        className="settings-form-input"
                        value={clubUsername}
                        onChange={(e) => setClubUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                      />
                    </div>
                    {errors.clubUsername && <span className="settings-error-text">{errors.clubUsername}</span>}
                  </div>
                </div>

                {/* SECTION 2: Club Representative */}
                <div className="settings-section-divider">
                  <span className="settings-divider-num">02</span>
                  <span className="settings-divider-label">Club Representative</span>
                  <div className="settings-divider-line" />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">First Name *</label>
                    <input
                      type="text"
                      name="repFirstName"
                      className={`settings-form-input ${errors.repFirstName ? 'error-border' : ''}`}
                      value={repFirstName}
                      onChange={(e) => setRepFirstName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                    />
                    {errors.repFirstName && <span className="settings-error-text">{errors.repFirstName}</span>}
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Middle Name</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      value={repMiddleName}
                      onChange={(e) => setRepMiddleName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                    />
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Last Name *</label>
                    <input
                      type="text"
                      name="repLastName"
                      className={`settings-form-input ${errors.repLastName ? 'error-border' : ''}`}
                      value={repLastName}
                      onChange={(e) => setRepLastName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                    />
                    {errors.repLastName && <span className="settings-error-text">{errors.repLastName}</span>}
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Designation *</label>
                    <Dropdown
                      options={['President', 'Vice President', 'Faculty Coordinator', 'Secretary', 'Other']}
                      value={repDesignation}
                      onChange={(val) => {
                        setRepDesignation(val)
                        if (val !== 'Other') setRepCustomDesignation('')
                      }}
                      placeholder="Select Designation"
                      getOptionLabel={(val) => val}
                      getOptionValue={(val) => val}
                      error={!!errors.repDesignation}
                    />
                    {errors.repDesignation && <span className="settings-error-text">{errors.repDesignation}</span>}
                  </div>

                  {repDesignation === 'Other' && (
                    <div className="settings-form-group settings-flex-1">
                      <label className="settings-form-label">Specify Designation *</label>
                      <input
                        type="text"
                        name="repCustomDesignation"
                        className="settings-form-input"
                        value={repCustomDesignation}
                        onChange={(e) => setRepCustomDesignation(e.target.value)}
                        required
                      />
                      {errors.repCustomDesignation && <span className="settings-error-text">{errors.repCustomDesignation}</span>}
                    </div>
                  )}
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Representative Email Address (Read-Only)</label>
                    <input
                      type="email"
                      className="settings-form-input"
                      value={repEmail}
                      disabled
                    />
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Phone Number *</label>
                    <div className="settings-phone-row">
                      <Dropdown
                        options={COUNTRIES}
                        value={repCountry}
                        onChange={(country) => {
                          setRepCountry(country)
                          setRepPhone('')
                        }}
                        searchable
                        searchPlaceholder="Search code..."
                        getOptionLabel={(c) => `${c.name} ${c.code} ${c.iso}`}
                        getOptionValue={(c) => c.name}
                        renderTrigger={(val) => val ? (
                          <>
                            <span className="country-iso" style={{ marginRight: '6px' }}>{val.iso}</span>
                            <span className="code">{val.code}</span>
                          </>
                        ) : null}
                        renderOption={(c) => (
                          <span style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            <span className="country-iso" style={{ marginRight: '10px' }}>{c.iso}</span>
                            <span>{c.name}</span>
                            <span className="opt-code" style={{ marginLeft: 'auto' }}>{c.code}</span>
                          </span>
                        )}
                        className="settings-country-code-selector settings-country-selector"
                      />
                      <input
                        type="text"
                        name="repPhone"
                        className={`settings-form-input settings-phone-field ${errors.repPhone ? 'error-border' : ''}`}
                        placeholder={repCountry.format}
                        value={repPhone}
                        onChange={(e) => setRepPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    {errors.repPhone && <span className="settings-error-text">{errors.repPhone}</span>}
                  </div>
                </div>

                {/* SECTION 3: Club Contact Info */}
                <div className="settings-section-divider">
                  <span className="settings-divider-num">03</span>
                  <span className="settings-divider-label">Club Contact Information</span>
                  <div className="settings-divider-line" />
                </div>

                {/* Map location selector */}
                <div className="settings-map-group">
                  <label className="settings-form-label">Adjust Club Map Location *</label>
                  <div className="settings-map-wrapper">
                    <div ref={mapContainerRef} className="settings-map-container" />

                    <div className="settings-map-center-pin">
                      <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" className="pin-icon">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                    </div>

                    <div className="settings-map-status-overlay">
                      {isResolvingAddress ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="status-spinner" /> Resolving address...
                        </span>
                      ) : geocodingError ? (
                        <span style={{ color: '#ef4444' }}>{geocodingError}</span>
                      ) : clubCity || clubState ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {[clubCity, clubState].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span>Drag map to adjust coordinates</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Official Club Email *</label>
                    <input
                      type="email"
                      name="clubEmail"
                      className={`settings-form-input ${errors.clubEmail ? 'error-border' : ''}`}
                      placeholder="club@institution.edu"
                      value={clubEmail}
                      onChange={(e) => setClubEmail(e.target.value)}
                    />
                    {errors.clubEmail && <span className="settings-error-text">{errors.clubEmail}</span>}
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Zip / Pin Code</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      value={clubZip}
                      onChange={(e) => setClubZip(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">City *</label>
                    <input
                      type="text"
                      name="clubCity"
                      className={`settings-form-input ${errors.clubCity ? 'error-border' : ''}`}
                      value={clubCity}
                      onChange={(e) => setClubCity(e.target.value)}
                    />
                    {errors.clubCity && <span className="settings-error-text">{errors.clubCity}</span>}
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">State *</label>
                    <Dropdown
                      options={INDIAN_STATES}
                      value={clubState}
                      onChange={setClubState}
                      searchable
                      searchPlaceholder="Search states..."
                      placeholder="Select State"
                      getOptionLabel={(val) => val}
                      getOptionValue={(val) => val}
                      error={!!errors.clubState}
                    />
                    {errors.clubState && <span className="settings-error-text">{errors.clubState}</span>}
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Postal Address</label>
                  <textarea
                    className="settings-form-input textarea-field"
                    rows={2}
                    value={clubAddress}
                    onChange={(e) => setClubAddress(e.target.value)}
                  />
                </div>

                {/* SECTION 4: Social Presence */}
                <div className="settings-section-divider">
                  <span className="settings-divider-num">04</span>
                  <span className="settings-divider-label">Social Presence</span>
                  <div className="settings-divider-line" />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Website</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      placeholder="https://..."
                      value={socialWebsite}
                      onChange={(e) => setSocialWebsite(e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Instagram</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      placeholder="e.g. stargazers_society"
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(parseSocialUsername(e.target.value, 'instagram'))}
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">LinkedIn</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      placeholder="e.g. stargazers-society"
                      value={socialLinkedIn}
                      onChange={(e) => setSocialLinkedIn(parseSocialUsername(e.target.value, 'linkedin'))}
                    />
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">YouTube</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      placeholder="e.g. stargazers_society"
                      value={socialYouTube}
                      onChange={(e) => setSocialYouTube(parseSocialUsername(e.target.value, 'youtube'))}
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Facebook</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      placeholder="e.g. stargazers.society"
                      value={socialFacebook}
                      onChange={(e) => setSocialFacebook(parseSocialUsername(e.target.value, 'facebook'))}
                    />
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Discord</label>
                    <input
                      type="text"
                      className="settings-form-input"
                      placeholder="e.g. invite_code"
                      value={socialDiscord}
                      onChange={(e) => setSocialDiscord(parseSocialUsername(e.target.value, 'discord'))}
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">GitHub</label>
                  <input
                    type="text"
                    className="settings-form-input"
                    placeholder="e.g. stargazers-society"
                    value={socialGitHub}
                    onChange={(e) => setSocialGitHub(parseSocialUsername(e.target.value, 'github'))}
                  />
                </div>

                {/* SECTION 5: About the Club */}
                <div className="settings-section-divider">
                  <span className="settings-divider-num">05</span>
                  <span className="settings-divider-label">About the Club</span>
                  <div className="settings-divider-line" />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Short Description *</label>
                  <textarea
                    name="clubDescription"
                    className={`settings-form-input textarea-field ${errors.clubDescription ? 'error-border' : ''}`}
                    rows={3}
                    placeholder="Brief intro about your club..."
                    value={clubDescription}
                    onChange={(e) => setClubDescription(e.target.value)}
                  />
                  {errors.clubDescription && <span className="settings-error-text">{errors.clubDescription}</span>}
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Primary Activities *</label>
                  <div className="settings-activities-grid">
                    {[
                      'Stargazing', 'Astrophotography', 'Rocketry', 'Satellite Development',
                      'Radio Astronomy', 'Workshops', 'Hackathons', 'Research',
                      'Outreach', 'Telescope Making', 'Space Technology', 'Other'
                    ].map((act) => {
                      const isChecked = clubActivities.includes(act)
                      return (
                        <label key={act} className={`settings-activity-card ${isChecked ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleActivity(act)}
                            style={{ display: 'none' }}
                          />
                          <span className="settings-activity-icon">
                            {isChecked ? (
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : null}
                          </span>
                          <span className="settings-activity-label">{act}</span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.clubActivities && <span className="settings-error-text">{errors.clubActivities}</span>}
                </div>

                {clubActivities.includes('Other') && (
                  <div className="settings-form-group">
                    <label className="settings-form-label">Specify Other Activities *</label>
                    <input
                      type="text"
                      name="clubCustomActivity"
                      className="settings-form-input"
                      value={clubCustomActivity}
                      onChange={(e) => setClubCustomActivity(e.target.value)}
                      required
                    />
                    {errors.clubCustomActivity && <span className="settings-error-text">{errors.clubCustomActivity}</span>}
                  </div>
                )}
              </form>
            ) : activeTab === 'Password' ? (
              <form className="settings-edit-form" onSubmit={handlePasswordReset}>
                <div className="settings-section-divider">
                  <span className="settings-divider-num">01</span>
                  <span className="settings-divider-label">Password Reset Authorization</span>
                </div>


                <div className="settings-form-group">
                  <label className="settings-form-label">Current Password *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      className={`settings-form-input ${currentPasswordValid === false ? 'error-border' :
                          currentPasswordValid === true ? 'success-border' : ''
                        }`}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      onCopy={(e) => {
                        e.preventDefault()
                        triggerCopyPasteWarning('current')
                      }}
                      onPaste={(e) => {
                        e.preventDefault()
                        triggerCopyPasteWarning('current')
                      }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                    {warningField === 'current' && (
                      <div className="copypaste-tooltip">Really bruh..? Type it Dude!</div>
                    )}
                  </div>
                  {currentPasswordValid === false && <span className="settings-error-text">Current password is incorrect.</span>}
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">New Password *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="settings-form-input"
                        placeholder="Enter strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onCopy={(e) => {
                          e.preventDefault()
                          triggerCopyPasteWarning('new')
                        }}
                        onPaste={(e) => {
                          e.preventDefault()
                          triggerCopyPasteWarning('new')
                        }}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                      {warningField === 'new' && (
                        <div className="copypaste-tooltip">Really bruh..? Type it Dude!</div>
                      )}
                    </div>
                  </div>

                  <div className="settings-form-group settings-flex-1">
                    <label className="settings-form-label">Confirm Password *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={`settings-form-input ${confirmPassword
                            ? (confirmPassword === newPassword ? 'success-border' : 'error-border')
                            : ''
                          }`}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onCopy={(e) => {
                          e.preventDefault()
                          triggerCopyPasteWarning('confirm')
                        }}
                        onPaste={(e) => {
                          e.preventDefault()
                          triggerCopyPasteWarning('confirm')
                        }}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                      {warningField === 'confirm' && (
                        <div className="copypaste-tooltip">Really bruh..? Type it Dude!</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Password Requirements</label>
                  <div className="password-requirements-list">
                    <div className={`requirement-item ${requirements.minLength ? 'satisfied' : ''}`}>
                      <span className="requirement-bullet">●</span> Min 8 characters
                    </div>
                    <div className={`requirement-item ${requirements.uppercase ? 'satisfied' : ''}`}>
                      <span className="requirement-bullet">●</span> One uppercase letter (A-Z)
                    </div>
                    <div className={`requirement-item ${requirements.lowercase ? 'satisfied' : ''}`}>
                      <span className="requirement-bullet">●</span> One lowercase letter (a-z)
                    </div>
                    <div className={`requirement-item ${requirements.number ? 'satisfied' : ''}`}>
                      <span className="requirement-bullet">●</span> One number (0-9)
                    </div>
                    <div className={`requirement-item ${requirements.special ? 'satisfied' : ''}`}>
                      <span className="requirement-bullet">●</span> One special character (@$!%*?&#)
                    </div>
                  </div>
                </div>

                <div className="settings-content-footer" style={{ padding: '24px 0 0 0', borderTop: 'none' }}>
                  <button
                    type="submit"
                    className="settings-btn settings-btn-save"
                    disabled={isResetting}
                  >
                    {isResetting ? 'Updating Password...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="settings-twofactor-panel" style={{ textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div className="coming-soon-shield-glow" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(234, 179, 8, 0.05)',
                  color: '#eab308',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  boxShadow: '0 0 20px rgba(234, 179, 8, 0.15)',
                  marginBottom: '8px'
                }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <circle cx="12" cy="11" r="3" />
                    <path d="M12 14v4" />
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    color: '#eab308',
                    fontFamily: 'D-Din',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 'bold',
                    background: 'rgba(234, 179, 8, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    width: 'fit-content',
                    margin: '0 auto'
                  }}>Under Development</span>
                  <h3 style={{ fontSize: '18px', fontFamily: 'D-Din', color: '#fcfeed', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>
                    Multi-Factor Authentication
                  </h3>
                </div>
                <p style={{
                  fontSize: '13.5px',
                  color: 'rgba(252, 254, 237, 0.6)',
                  lineHeight: '1.6',
                  maxWidth: '460px',
                  margin: '0 auto'
                }}>
                  Enhanced cryptographic security protocols, including hardware-backed biometrics (FIDO2 / WebAuthn Passkeys) and Two-Factor Authentication (TOTP), are currently on hold. These features will be activated in a subsequent release to safeguard club administration gateways.
                </p>

                <div className="coming-soon-roadmap" style={{
                  width: '100%',
                  maxWidth: '420px',
                  background: 'rgba(240, 240, 250, 0.02)',
                  border: '1px solid rgba(240, 240, 250, 0.05)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginTop: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '11px', color: '#fcfeed', fontFamily: 'D-Din', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Security Roadmap
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#22c55e' }}>
                      <span>✔</span>
                      <span style={{ color: 'rgba(252, 254, 237, 0.8)' }}>PBKDF2 Password Hashing & Verification</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#eab308' }}>
                      <span>⟳</span>
                      <span style={{ color: 'rgba(252, 254, 237, 0.8)' }}>Two-Factor Authentication (TOTP app sync) — <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Soon</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#eab308' }}>
                      <span>⟳</span>
                      <span style={{ color: 'rgba(252, 254, 237, 0.8)' }}>Hardware-backed Biometrics (Passkeys) — <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Soon</span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!loading && activeTab === 'Profile' && (
            <div className="settings-content-footer">
              <button
                type="button"
                className="settings-btn settings-btn-cancel"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Cropper Component */}
      {showCropper && (
        <ImageCropper
          imageSrc={cropperSrc}
          onCropComplete={(croppedImg) => {
            if (cropperType === 'logo') {
              setClubLogo(croppedImg)
            } else {
              setClubBanner(croppedImg)
            }
            setShowCropper(false)
          }}
          onCancel={() => setShowCropper(false)}
          aspect={cropperType === 'logo' ? 1 : 3.2}
          circularCrop={cropperType === 'logo'}
          title={cropperType === 'logo' ? 'ADJUST LOGO CROP' : 'ADJUST BANNER CROP'}
        />
      )}

      {/* Embedded Passkey Naming Modal Overlay */}
      {showPasskeyNameModal && (
        <div className="settings-modal-overlay" style={{ zIndex: 100005 }}>
          <div className="passkey-name-modal">
            <h3 className="passkey-modal-title">Register Passkey</h3>
            <p className="passkey-modal-desc">Provide a friendly name for this biometric credential to identify it later.</p>
            <form onSubmit={handleSavePasskeyWithCustomName} className="passkey-modal-form">
              <div className="settings-form-group" style={{ marginBottom: 0 }}>
                <label className="settings-form-label">Device Name *</label>
                <input
                  type="text"
                  className="settings-form-input"
                  placeholder="e.g. My MacBook Air, Phone"
                  value={tempPasskeyName}
                  onChange={(e) => setTempPasskeyName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="passkey-modal-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn-cancel"
                  onClick={() => {
                    setShowPasskeyNameModal(false)
                    setPendingPasskeyCred(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-btn settings-btn-save"
                >
                  Save Passkey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Passkey Deletion Password Verification Overlay */}
      {showDeletePasswordModal && (
        <div className="settings-modal-overlay" style={{ zIndex: 100005 }}>
          <div className="passkey-name-modal">
            <h3 className="passkey-modal-title">Verify Identity</h3>
            <p className="passkey-modal-desc">To remove a passkey of a different device, please confirm your current representative password.</p>
            <form onSubmit={handleVerifyDeletePassword} className="passkey-modal-form">
              <div className="settings-form-group" style={{ marginBottom: 0 }}>
                <label className="settings-form-label">Representative Password *</label>
                <input
                  type="password"
                  className={`settings-form-input ${is2FAShake ? 'shake-animation' : ''} ${deletePasswordError ? 'error-border' : ''}`}
                  placeholder="Enter current access key"
                  value={deletePasswordInput}
                  onChange={(e) => setDeletePasswordInput(e.target.value)}
                  autoFocus
                  required
                />
                {deletePasswordError && (
                  <span className="settings-error-text" style={{ marginTop: '8px', display: 'block', color: '#ff3333', fontSize: '12px' }}>
                    {deletePasswordError}
                  </span>
                )}
              </div>
              <div className="passkey-modal-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn-cancel"
                  onClick={() => {
                    setShowDeletePasswordModal(false)
                    setPendingDeleteCredId(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-btn settings-btn-danger"
                  disabled={isVerifyingDeletePassword}
                >
                  {isVerifyingDeletePassword ? 'Confirming...' : 'Verify & Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>,
    document.body
  )
}
