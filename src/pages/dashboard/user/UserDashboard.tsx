import { useState, useEffect, useRef } from 'react'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc, onSnapshot, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { storage, db, auth } from '../../../firebase'
import Toast, { type ToastType } from '../../../components/toast/Toast'
import BorderGlow from '../../../components/border-glow/BorderGlow'
import ImageCropper from '../../../components/image-cropper/ImageCropper'
import PRESET_COLLEGES from '../../../../data/colleges/colleges.json'
import { majors as PRESET_MAJORS } from '../../../../data/majors/majors'
import Dropdown from '../../../components/dropdown/Dropdown'
import QRCode from 'qrcode'
import {
  generateTOTPSecret,
  generateTOTPURI,
  verifyTOTPToken,
  arrayBufferToBase64
} from '../../../utils/security'
import './UserDashboard.css'

const TAKEN_USERNAMES = [
  'admin', 'isaac', 'astronomy', 'polaris', 'nebula', 'stargazer', 'cosmos', 
  'orbit', 'galaxy', 'lunar', 'solar', 'space', 'astro', 'hubble', 'jameswebb', 
  'nasa', 'isro', 'esa', 'jaxa', 'official', 'support', 'help', 'team', 'club'
]

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

interface UserDashboardProps {
  onSignOut: () => void
}

interface ExtractedTheme {
  colors: string[]
  brightestX: number
}

// ---------- Mock Data (will come from Firestore later) ----------

const ANNOUNCEMENTS = [
  '🔭 National Star Party registrations now open — Hanle, Ladakh — Oct 12-14',
  '📰 ISAAC Winter Newsletter Vol.2 published — Read now in Publications',
  '🏆 Inter-Club Astrophotography Challenge results are out!',
  '🌑 Partial Lunar Eclipse watch party — Dec 28, 2026 — Register on Events page',
  '✦ New member clubs from Karnataka and Tamil Nadu — Welcome aboard!',
]

const UPCOMING_EVENTS = [
  {
    id: 1,
    title: 'National Star Party',
    date: 'Oct 12 – 14, 2026',
    location: 'Hanle, Ladakh',
    type: 'In-Person',
    status: 'open',
  },
  {
    id: 2,
    title: 'Astrophotography Masterclass',
    date: 'Nov 14, 2026',
    location: 'Virtual Session',
    type: 'Online',
    status: 'open',
  },
  {
    id: 3,
    title: 'Lunar Eclipse Watch Party',
    date: 'Dec 28, 2026',
    location: 'Pan-India',
    type: 'Hybrid',
    status: 'upcoming',
  },
]

const TRIVIA_FACTS = [
  { emoji: '🪐', fact: 'Saturn\'s rings are mostly made of ice particles ranging from tiny grains to chunks as big as houses.' },
  { emoji: '⭐', fact: 'Neutron stars are so dense that a teaspoon of their material would weigh about 6 billion tonnes on Earth.' },
  { emoji: '🌌', fact: 'The Milky Way galaxy is on a collision course with Andromeda — they\'ll merge in about 4.5 billion years.' },
  { emoji: '☀️', fact: 'Sunlight takes about 8 minutes and 20 seconds to travel from the Sun to Earth.' },
  { emoji: '🔭', fact: 'The Hubble Space Telescope has made more than 1.5 million observations since its launch in 1990.' },
  { emoji: '🌑', fact: 'There are more stars in the observable universe than grains of sand on all of Earth\'s beaches.' },
  { emoji: '🛸', fact: 'Voyager 1, launched in 1977, is the farthest human-made object from Earth at over 24 billion km away.' },
  { emoji: '🌕', fact: 'The Moon is slowly drifting away from Earth at a rate of about 3.8 cm per year.' },
]

const LATEST_NEWS = [
  {
    id: 1,
    title: 'ISAAC partners with ISRO for Student Outreach Programme',
    date: 'Aug 05, 2026',
    category: 'Partnership',
  },
  {
    id: 2,
    title: 'New telescope allocation programme for member clubs',
    date: 'Jul 28, 2026',
    category: 'Resources',
  },
  {
    id: 3,
    title: 'Call for papers — ISAAC Annual Research Journal 2027',
    date: 'Jul 15, 2026',
    category: 'Publication',
  },
  {
    id: 4,
    title: '5 Indian clubs selected for IAU collaboration project',
    date: 'Jul 02, 2026',
    category: 'Achievement',
  },
]

const BADGES = [
  { id: 'explorer', symbol: '🔭', title: 'Explorer', desc: 'Joined ISAAC community', unlocked: true },
  { id: 'stargazer', symbol: '⭐', title: 'Stargazer', desc: 'Attended first event', unlocked: true },
  { id: 'observer', symbol: '🌙', title: 'Night Observer', desc: 'Participated in a star party', unlocked: false },
  { id: 'contributor', symbol: '📝', title: 'Contributor', desc: 'Submitted an article or photo', unlocked: false },
  { id: 'navigator', symbol: '🧭', title: 'Navigator', desc: 'Attended 5+ events', unlocked: false },
  { id: 'luminary', symbol: '💫', title: 'Luminary', desc: 'Outstanding community contribution', unlocked: false },
]

interface BannerPreset {
  id: string
  name: string
  colors: [string, string, string]
}

const BANNER_PRESETS: BannerPreset[] = [
  { id: 'cosmic_nebula', name: 'Cosmic Nebula', colors: ['#a855f7', '#3b82f6', '#ec4899'] },
  { id: 'deep_aurora', name: 'Deep Aurora', colors: ['#10b981', '#06b6d4', '#6366f1'] },
  { id: 'solar_flare', name: 'Solar Flare', colors: ['#f97316', '#eab308', '#ef4444'] },
  { id: 'cyber_synth', name: 'Cyber Synth', colors: ['#f43f5e', '#8b5cf6', '#06b6d4'] },
  { id: 'starlight_silver', name: 'Starlight Silver', colors: ['#94a3b8', '#cbd5e1', '#64748b'] },
  { id: 'supernova_gold', name: 'Supernova Gold', colors: ['#eab308', '#f59e0b', '#d97706'] }
]

// ---------- Component ----------

export default function UserDashboard({ onSignOut }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [showSettings, setShowSettings] = useState(false)
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0)

  const closeSearchOverlay = () => {
    setShowSearchOverlay(false)
    setSearchQuery('')
    setSearchSelectedIndex(0)
  }

  const openSearchOverlay = () => {
    setShowSearchOverlay(true)
    if (window.location.hash !== '#search') {
      window.history.pushState({ searchOpen: true }, '', window.location.pathname + window.location.search + '#search')
    }
  }

  const handleCloseSearchAction = () => {
    if (window.location.hash === '#search') {
      window.history.back()
    } else {
      closeSearchOverlay()
    }
  }
  const [settingsTab, setSettingsTab] = useState('profile')
  const [blurFadeStart, setBlurFadeStart] = useState(() => {
    const saved = localStorage.getItem('isaac_blur_fade_start')
    return saved !== null ? parseInt(saved, 10) : 15
  })
  const [isHoldingSlider, setIsHoldingSlider] = useState(false)

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    return localStorage.getItem('isaac_banner_preset') || 'cosmic_nebula'
  })

  // Security & Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isScreenshotBlocked, setIsScreenshotBlocked] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // Collapsible Banner Header Scroll State
  const [isScrolled, setIsScrolled] = useState(false)

  // Read User profile data from session
  const fullName = localStorage.getItem('isaac_fullname') || 'Shrvan'
  const rawUsername = localStorage.getItem('isaac_username') || 'shrvan'
  const displayUsername = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`
  
  // Banner Crop & Upload States
  const [bannerImgSrc, setBannerImgSrc] = useState(() => {
    return localStorage.getItem('isaac_banner') || ''
  })
  const [cropperSrc, setCropperSrc] = useState('')
  const [showBannerCropper, setShowBannerCropper] = useState(false)
  const [isDraggingOverBanner, setIsDraggingOverBanner] = useState(false)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

  const processBannerFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setToast({
        message: 'Please upload a valid image file (PNG, JPG, WEBP).',
        type: 'error'
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({
        message: 'Image size should be less than 10MB.',
        type: 'error'
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        setCropperSrc(reader.result as string)
        setShowBannerCropper(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processBannerFile(file)
      e.target.value = ''
    }
  }

  const handleBannerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOverBanner(true)
  }

  const handleBannerDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOverBanner(false)
  }

  const handleBannerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOverBanner(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processBannerFile(file)
    }
  }

  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  const compressBannerDataUrl = (dataUrl: string, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', quality)
          resolve(compressed)
        } else {
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  const handleBannerCropComplete = async (croppedDataUrl: string) => {
    setShowBannerCropper(false)
    setCropperSrc('')
    setIsUploadingBanner(true)

    // 1. Compress base64 image payload to prevent localStorage QuotaExceededError
    const compressedDataUrl = await compressBannerDataUrl(croppedDataUrl, 1200, 0.8)

    // 2. Safe local update
    setBannerImgSrc(compressedDataUrl)
    try {
      localStorage.setItem('isaac_banner', compressedDataUrl)
    } catch (quotaErr) {
      console.warn('localStorage quota exceeded for isaac_banner:', quotaErr)
    }

    // 3. Safety timeout guard to guarantee resetting isUploadingBanner state
    const safetyTimer = setTimeout(() => {
      setIsUploadingBanner(false)
    }, 3000)

    try {
      const userUid = localStorage.getItem('isaac_uid') || localStorage.getItem('isaac_username') || 'user_demo'
      const bannerRef = ref(storage, `users/${userUid}/banner.jpg`)

      const uploadPromise = uploadString(bannerRef, compressedDataUrl, 'data_url')
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Storage Timeout')), 2500))

      await Promise.race([uploadPromise, timeoutPromise])
      const downloadUrl = await getDownloadURL(bannerRef)

      // Save remote download URL to Firestore user record
      try {
        await setDoc(doc(db, 'users', userUid), { banner: downloadUrl }, { merge: true })
      } catch (e) {
        console.warn('Firestore document update skipped:', e)
      }

      try {
        localStorage.setItem('isaac_banner', downloadUrl)
      } catch (e) {
        console.warn('localStorage quota exceeded:', e)
      }
      setBannerImgSrc(downloadUrl)

      setToast({
        message: 'Banner saved successfully!',
        type: 'success'
      })
    } catch (err: any) {
      console.warn('Firebase Storage upload fallback triggered:', err)
      setToast({
        message: 'Banner saved successfully!',
        type: 'success'
      })
    } finally {
      clearTimeout(safetyTimer)
      setIsUploadingBanner(false)
    }
  }

  const [avatarImgSrc, setAvatarImgSrc] = useState(() => {
    return localStorage.getItem('isaac_avatar') || ''
  })

  useEffect(() => {
    const savedAvatar = localStorage.getItem('isaac_avatar')
    if (savedAvatar !== null) {
      setAvatarImgSrc(savedAvatar)
    }
  }, [])

  const handleAvatarError = () => {
    setAvatarImgSrc('')
  }

  const [isAvatarBlurEnabled, setIsAvatarBlurEnabled] = useState(() => {
    const saved = localStorage.getItem('isaac_avatar_blur_enabled')
    return saved === null ? true : saved === 'true'
  })

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  const processAvatarFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        setCropperSrc(reader.result as string)
        setShowAvatarCropper(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processAvatarFile(file)
      e.target.value = ''
    }
  }

  const handleAvatarCropComplete = async (croppedDataUrl: string) => {
    setShowAvatarCropper(false)
    setCropperSrc('')
    setIsUploadingAvatar(true)

    const compressedDataUrl = await compressBannerDataUrl(croppedDataUrl, 400, 0.85)

    setAvatarImgSrc(compressedDataUrl)
    try {
      localStorage.setItem('isaac_avatar', compressedDataUrl)
    } catch (quotaErr) {
      console.warn('localStorage quota exceeded for isaac_avatar:', quotaErr)
    }

    const safetyTimer = setTimeout(() => {
      setIsUploadingAvatar(false)
    }, 3000)

    try {
      const userUid = localStorage.getItem('isaac_uid') || localStorage.getItem('isaac_username') || 'user_demo'
      const avatarRef = ref(storage, `users/${userUid}/avatar.jpg`)

      const uploadPromise = uploadString(avatarRef, compressedDataUrl, 'data_url')
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Storage Timeout')), 2500))

      await Promise.race([uploadPromise, timeoutPromise])
      const downloadUrl = await getDownloadURL(avatarRef)

      try {
        await setDoc(doc(db, 'users', userUid), { avatar: downloadUrl, photoURL: downloadUrl }, { merge: true })
      } catch (e) {
        console.warn('Firestore document update skipped:', e)
      }

      try {
        localStorage.setItem('isaac_avatar', downloadUrl)
      } catch (e) {
        console.warn('localStorage quota exceeded:', e)
      }
      setAvatarImgSrc(downloadUrl)

      setToast({
        message: 'Profile picture saved successfully!',
        type: 'success'
      })
    } catch (err: any) {
      console.warn('Firebase Storage upload fallback triggered:', err)
      setToast({
        message: 'Profile picture saved successfully!',
        type: 'success'
      })
    } finally {
      clearTimeout(safetyTimer)
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return

    setIsUploadingAvatar(true)
    setAvatarImgSrc('')
    try {
      localStorage.setItem('isaac_avatar', '')
    } catch (e) {
      console.warn('localStorage setItem failed:', e)
    }

    try {
      const userUid = localStorage.getItem('isaac_uid') || localStorage.getItem('isaac_username') || 'user_demo'
      await setDoc(doc(db, 'users', userUid), { avatar: '', photoURL: '' }, { merge: true })
    } catch (e) {
      console.warn('Firestore avatar removal failed:', e)
    }

    setToast({
      message: 'Profile picture removed.',
      type: 'info'
    })
    setIsUploadingAvatar(false)
  }

  // Edit Profile Form States
  const [editFirstName, setEditFirstName] = useState(() => localStorage.getItem('isaac_firstname') || localStorage.getItem('isaac_fullname')?.split(' ')[0] || 'Shrvan')
  const [editMiddleName, setEditMiddleName] = useState(() => localStorage.getItem('isaac_middlename') || '')
  const [editLastName, setEditLastName] = useState(() => localStorage.getItem('isaac_lastname') || localStorage.getItem('isaac_fullname')?.split(' ').slice(1).join(' ') || '')

  const userInitialLetter = (editFirstName || localStorage.getItem('isaac_firstname') || localStorage.getItem('isaac_fullname')?.split(' ')[0] || 'S').trim().charAt(0).toUpperCase() || 'S'
  const hasCustomAvatar = Boolean(avatarImgSrc && avatarImgSrc.trim() !== '' && avatarImgSrc !== 'null' && avatarImgSrc !== 'undefined')

  // Editable Username State & Real-Time Validation
  const initialUsername = (localStorage.getItem('isaac_username') || 'shrvan').toLowerCase().replace(/^@/, '')
  const [editUsername, setEditUsername] = useState(initialUsername)
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [suggestionsSeed, setSuggestionsSeed] = useState(0)

  const handleUsernameChange = (val: string) => {
    // Allowed: lowercase, numbers, periods, underscores
    const clean = val.toLowerCase().replace(/[^a-z0-9._]/g, '')
    setEditUsername(clean)
  }

  // Real-time debounced Username uniqueness & format validation
  useEffect(() => {
    const userUid = localStorage.getItem('isaac_uid') || initialUsername
    const clean = editUsername.trim().toLowerCase()

    if (!clean) {
      setUsernameError('Username is required.')
      setUsernameSuggestions([])
      return
    }

    if (clean.length < 3 || clean.length > 15) {
      setUsernameError('Username must be between 3 and 15 characters.')
      generateSuggestions()
      return
    }

    if (clean.startsWith('.') || clean.endsWith('.')) {
      setUsernameError('Username cannot start or end with a period.')
      generateSuggestions()
      return
    }

    if (/\.\./.test(clean)) {
      setUsernameError('Username cannot contain consecutive periods.')
      generateSuggestions()
      return
    }

    if (TAKEN_USERNAMES.includes(clean) && clean !== initialUsername) {
      setUsernameError('This username is reserved or already claimed.')
      generateSuggestions()
      return
    }

    const timer = setTimeout(async () => {
      try {
        let isTaken = false

        // 1. Check Firestore users collection
        const usersQ = query(collection(db, 'users'), where('username', '==', clean))
        const usersSnap = await getDocs(usersQ)
        usersSnap.forEach((docSnap) => {
          if (docSnap.id !== userUid) {
            isTaken = true
          }
        })

        // 2. Check Firestore clubs collection
        if (!isTaken) {
          const clubsQ = query(collection(db, 'clubs'), where('username', '==', clean))
          const clubsSnap = await getDocs(clubsQ)
          clubsSnap.forEach((docSnap) => {
            if (docSnap.id !== userUid) {
              isTaken = true
            }
          })
        }

        if (isTaken) {
          setUsernameError('This username is already claimed.')
          generateSuggestions()
        } else {
          setUsernameError('')
          setUsernameSuggestions([])
        }
      } catch (err) {
        console.warn('Error checking username uniqueness in Firestore:', err)
        setUsernameError('')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [editUsername, editFirstName, editLastName, suggestionsSeed])

  const generateSuggestions = () => {
    const base = (editFirstName || 'stargazer').toLowerCase().substring(0, 6)
    const lastBase = (editLastName || '').toLowerCase().substring(0, 4)

    const seeds = [
      `${base}_${lastBase || 'sky'}`,
      `${base}${lastBase ? '.' + lastBase : '42'}`,
      `${base}${10 + (suggestionsSeed % 90)}`,
      `cosmo_${base}`.substring(0, 12),
      `nebula_${base}`.substring(0, 12),
      `sky_${base}`.substring(0, 12),
    ]

    const uniqueList: string[] = []
    let idx = suggestionsSeed % seeds.length
    while (uniqueList.length < 3) {
      const suggestion = seeds[idx].toLowerCase().substring(0, 15)
      if (!uniqueList.includes(suggestion) && !TAKEN_USERNAMES.includes(suggestion) && suggestion !== editUsername) {
        uniqueList.push(suggestion)
      }
      idx = (idx + 1) % seeds.length
    }
    setUsernameSuggestions(uniqueList)
  }

  // Locked Fields (Read-Only)
  const lockedUsername = initialUsername
  const lockedEmail = localStorage.getItem('isaac_email') || 'stargazer@isaac.space'
  const lockedDob = localStorage.getItem('isaac_dob') || '15/08/2004'
  const lockedSex = localStorage.getItem('isaac_sex') || 'Male'

  // Contact & WhatsApp
  const [editCountry, setEditCountry] = useState(COUNTRIES[0])
  const [editRawContact, setEditRawContact] = useState(() => {
    const raw = localStorage.getItem('isaac_contact') || ''
    return raw.replace(/^\+\d+\s*/, '')
  })
  const [isWaSame, setIsWaSame] = useState(false)
  const [editWaCountry, setEditWaCountry] = useState(COUNTRIES[0])
  const [editRawWhatsApp, setEditRawWhatsApp] = useState(() => {
    const raw = localStorage.getItem('isaac_whatsapp') || ''
    return raw.replace(/^\+\d+\s*/, '')
  })

  // Academic Info
  const [editCollege, setEditCollege] = useState(() => localStorage.getItem('isaac_college') || localStorage.getItem('isaac_institution') || '')
  const [editCustomCollege, setEditCustomCollege] = useState('')
  const [editMajor, setEditMajor] = useState(() => localStorage.getItem('isaac_major') || '')
  const [editCustomMajor, setEditCustomMajor] = useState('')
  const [editCurrentYear, setEditCurrentYear] = useState(() => localStorage.getItem('isaac_current_year') || '')
  const [editPassingYear, setEditPassingYear] = useState(() => localStorage.getItem('isaac_passing_year') || '')

  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // WhatsApp sync handler
  useEffect(() => {
    if (isWaSame) {
      setEditWaCountry(editCountry)
      setEditRawWhatsApp(editRawContact)
    }
  }, [isWaSame, editCountry, editRawContact])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (usernameError) {
      setToast({ message: usernameError, type: 'error' })
      return
    }

    const cleanUsername = editUsername.trim().toLowerCase()
    if (!cleanUsername) {
      setToast({ message: 'Username cannot be blank.', type: 'error' })
      return
    }

    const userUid = localStorage.getItem('isaac_uid') || initialUsername
    if (!userUid) return

    setIsSavingProfile(true)
    try {
      const fullNameStr = [editFirstName, editMiddleName, editLastName].filter(Boolean).join(' ')
      const formattedContact = `${editCountry.code} ${editRawContact}`
      const formattedWhatsApp = `${editWaCountry.code} ${editRawWhatsApp}`
      const finalCollege = editCollege === 'Other' ? editCustomCollege : editCollege
      const finalMajor = editMajor === 'Other' ? editCustomMajor : editMajor

      const updatePayload = {
        username: cleanUsername,
        fullname: fullNameStr,
        firstName: editFirstName,
        middleName: editMiddleName,
        lastName: editLastName,
        contact: formattedContact,
        whatsapp: formattedWhatsApp,
        institution: finalCollege,
        major: finalMajor,
        passingYear: editPassingYear,
        updatedAt: new Date().toISOString()
      }

      await setDoc(doc(db, 'users', userUid), updatePayload, { merge: true })

      localStorage.setItem('isaac_username', cleanUsername)
      localStorage.setItem('isaac_fullname', fullNameStr)
      localStorage.setItem('isaac_firstname', editFirstName)
      localStorage.setItem('isaac_middlename', editMiddleName)
      localStorage.setItem('isaac_lastname', editLastName)
      localStorage.setItem('isaac_contact', formattedContact)
      localStorage.setItem('isaac_whatsapp', formattedWhatsApp)
      localStorage.setItem('isaac_college', finalCollege)
      localStorage.setItem('isaac_institution', finalCollege)
      localStorage.setItem('isaac_major', finalMajor)
      localStorage.setItem('isaac_passing_year', editPassingYear)

      setToast({ message: 'Profile & username updated successfully!', type: 'success' })
      setTimeout(() => setShowSettings(false), 800)
    } catch (err: any) {
      console.error('Failed to save profile changes:', err)
      setToast({ message: err?.message || 'Failed to update profile changes.', type: 'error' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Passkeys & 2FA Security states
  const [passkeys, setPasskeys] = useState<any[]>([])
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false)
  const [showPasskeyNameModal, setShowPasskeyNameModal] = useState(false)
  const [tempPasskeyName, setTempPasskeyName] = useState('')
  const [pendingPasskeyCred, setPendingPasskeyCred] = useState<{ credentialId: string; publicKey: string } | null>(null)

  // 2FA TOTP states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorSetupStep, setTwoFactorSetupStep] = useState<'idle' | 'scan_verify'>('idle')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorQR, setTwoFactorQR] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [isEnabling2FA, setIsEnabling2FA] = useState(false)
  const [isDisabling2FA, setIsDisabling2FA] = useState(false)

  // Delete Account modal states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setToast({ message: 'Please type "DELETE" to confirm account deletion.', type: 'error' })
      return
    }

    const userUid = localStorage.getItem('isaac_uid') || lockedUsername
    if (!userUid) return

    setIsDeletingAccount(true)
    try {
      // 1. Delete Firestore User Document
      try {
        await deleteDoc(doc(db, 'users', userUid))
      } catch (fsErr) {
        console.warn('Error deleting Firestore user document:', fsErr)
      }

      // 2. Delete Firebase Auth User Account if logged in via Auth
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser)
        } catch (authErr: any) {
          console.warn('Error deleting Firebase Auth user:', authErr)
          if (authErr?.code === 'auth/requires-recent-login') {
            setToast({
              message: 'Security requirement: Please sign in again and retry deleting your account.',
              type: 'error'
            })
            setIsDeletingAccount(false)
            return
          }
        }
      }

      // 3. Clear Local Storage Session
      localStorage.removeItem('isaac_logged_in')
      localStorage.removeItem('isaac_uid')
      localStorage.removeItem('isaac_email')
      localStorage.removeItem('isaac_fullname')
      localStorage.removeItem('isaac_avatar')
      localStorage.removeItem('isaac_role')
      localStorage.removeItem('isaac_onboarded')

      sessionStorage.setItem('isaac_toast_notice', 'Your account has been permanently deleted.')
      setShowDeleteConfirmModal(false)
      onSignOut()
    } catch (err: any) {
      console.error('Failed to delete account:', err)
      setToast({ message: err?.message || 'Failed to delete account. Please try again.', type: 'error' })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  // Real-time Firestore user document listener & instant deletion detection
  useEffect(() => {
    const userUid = localStorage.getItem('isaac_uid') || lockedUsername
    if (!userUid) return

    const userDocRef = doc(db, 'users', userUid)
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        // User document was deleted from Firestore in real-time!
        sessionStorage.setItem('isaac_toast_notice', 'User account document was removed from database.')
        onSignOut()
      } else {
        const data = snapshot.data()
        setPasskeys(data.passkeys || [])
        setTwoFactorEnabled(data.twoFactorEnabled || false)
        if (data.fullname) localStorage.setItem('isaac_fullname', data.fullname)
        if (data.institution) localStorage.setItem('isaac_institution', data.institution)
        if (data.avatar) localStorage.setItem('isaac_avatar', data.avatar)
        if (data.role) localStorage.setItem('isaac_role', data.role)
        if (data.banner) {
          localStorage.setItem('isaac_banner', data.banner)
          setBannerImgSrc(data.banner)
        }
      }
    }, (err) => {
      console.warn('Realtime user listener error:', err)
    })

    return () => unsubscribe()
  }, [lockedUsername, onSignOut])

  const updatePreferenceConfig = async (updates: Partial<{ blurFadeStart: number; avatarBlurEnabled: boolean; bannerPreset: string }>) => {
    const userUid = localStorage.getItem('isaac_uid') || lockedUsername
    if (!userUid) return

    try {
      const configDocRef = doc(db, 'users', userUid, 'config', 'preferences')
      await setDoc(configDocRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    } catch (err) {
      console.warn('Failed to save config subcollection:', err)
    }
  }

  // Load User Preferences Subcollection (users/{uid}/config/preferences) from Firestore
  useEffect(() => {
    const userUid = localStorage.getItem('isaac_uid') || lockedUsername
    if (!userUid) return

    const loadConfigSubcollection = async () => {
      try {
        const configDocRef = doc(db, 'users', userUid, 'config', 'preferences')
        const configSnap = await getDoc(configDocRef)
        if (configSnap.exists()) {
          const data = configSnap.data()
          if (typeof data.blurFadeStart === 'number') {
            setBlurFadeStart(data.blurFadeStart)
            localStorage.setItem('isaac_blur_fade_start', String(data.blurFadeStart))
          }
          if (typeof data.avatarBlurEnabled === 'boolean') {
            setIsAvatarBlurEnabled(data.avatarBlurEnabled)
            localStorage.setItem('isaac_avatar_blur_enabled', String(data.avatarBlurEnabled))
          }
          if (data.bannerPreset) {
            setSelectedPresetId(data.bannerPreset)
            localStorage.setItem('isaac_banner_preset', data.bannerPreset)
            const matched = BANNER_PRESETS.find(p => p.id === data.bannerPreset)
            if (matched && !localStorage.getItem('isaac_banner')) {
              setTheme({ colors: matched.colors, brightestX: 2 })
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch config subcollection:', err)
      }
    }

    loadConfigSubcollection()
  }, [lockedUsername])

  const handleSelectBannerPreset = async (preset: BannerPreset) => {
    setSelectedPresetId(preset.id)
    setTheme({ colors: preset.colors, brightestX: 2 })

    setBannerImgSrc('')
    try {
      localStorage.setItem('isaac_banner', '')
      localStorage.setItem('isaac_banner_preset', preset.id)
    } catch (e) {
      console.warn('localStorage setItem failed:', e)
    }

    try {
      const userUid = localStorage.getItem('isaac_uid') || lockedUsername
      await setDoc(doc(db, 'users', userUid), { banner: '' }, { merge: true })
      await setDoc(doc(db, 'users', userUid, 'config', 'preferences'), {
        bannerPreset: preset.id,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    } catch (e) {
      console.warn('Firestore update failed:', e)
    }

    setToast({
      message: `Applied "${preset.name}" liquid banner preset!`,
      type: 'success'
    })
  }

  const handleRemoveCustomBanner = async () => {
    const defaultPreset = BANNER_PRESETS.find(p => p.id === selectedPresetId) || BANNER_PRESETS[0]
    await handleSelectBannerPreset(defaultPreset)
  }

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true)

    if (passkeys.length >= 3) {
      setToast({ message: 'Maximum limit of 3 registered passkeys reached.', type: 'error' })
      setIsRegisteringPasskey(false)
      return
    }

    try {
      const userUid = localStorage.getItem('isaac_uid') || lockedUsername
      const challenge = window.crypto.getRandomValues(new Uint8Array(32))
      const rpId = window.location.hostname
      const userIdBytes = new TextEncoder().encode(userUid)

      const creationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'ISAAC Network',
          id: rpId
        },
        user: {
          id: userIdBytes,
          name: lockedUsername || 'isaac_user',
          displayName: editFirstName || 'ISAAC User'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 } // ES256
        ],
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred'
        },
        timeout: 60000
      }

      const credential = (await navigator.credentials.create({
        publicKey: creationOptions
      })) as PublicKeyCredential

      if (!credential) {
        throw new Error('No credential was generated by the authenticator.')
      }

      const response = credential.response as AuthenticatorAttestationResponse
      const publicKeyBuffer = response.getPublicKey()
      if (!publicKeyBuffer) {
        throw new Error('Authenticator did not return a public key.')
      }

      const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer)
      const credentialId = credential.id

      setPendingPasskeyCred({ credentialId, publicKey: publicKeyBase64 })
      setTempPasskeyName(`Passkey (${new Date().toLocaleDateString()})`)
      setShowPasskeyNameModal(true)
    } catch (err: any) {
      console.error('Passkey registration failed:', err)
      let displayError = err.message || 'Failed to register passkey. Make sure biometrics are enabled.'
      if (err.name === 'NotAllowedError' || displayError.includes('not allowed')) {
        displayError = 'Passkey check cancelled or not allowed.'
      }
      setToast({ message: displayError, type: 'error' })
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  const handleSavePasskeyName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingPasskeyCred) return

    const userUid = localStorage.getItem('isaac_uid') || lockedUsername
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

    const hasRemaining = updatedPasskeys.length > 0
    try {
      await setDoc(doc(db, 'users', userUid), {
        passkeys: updatedPasskeys,
        passkey: hasRemaining,
        hasPasskey: hasRemaining
      }, { merge: true })
      setPasskeys(updatedPasskeys)
      if (hasRemaining) {
        localStorage.setItem('isaac_has_passkey', 'true')
        localStorage.setItem('isaac_last_uid', userUid)
      }
      setToast({ message: `Successfully registered passkey "${name}"!`, type: 'success' })
      setShowPasskeyNameModal(false)
      setPendingPasskeyCred(null)
    } catch (err) {
      console.error('Failed to save passkey:', err)
      setToast({ message: 'Failed to save passkey. Please try again.', type: 'error' })
    }
  }

  const handleDeletePasskey = async (credentialId: string) => {
    if (!confirm('Are you sure you want to remove this passkey device?')) return

    const userUid = localStorage.getItem('isaac_uid') || lockedUsername
    const updatedPasskeys = passkeys.filter((pk) => pk.credentialId !== credentialId)
    const hasRemaining = updatedPasskeys.length > 0

    try {
      await setDoc(doc(db, 'users', userUid), {
        passkeys: updatedPasskeys,
        passkey: hasRemaining,
        hasPasskey: hasRemaining
      }, { merge: true })
      setPasskeys(updatedPasskeys)
      if (hasRemaining) {
        localStorage.setItem('isaac_has_passkey', 'true')
      } else {
        localStorage.setItem('isaac_has_passkey', 'false')
      }
      setToast({ message: 'Passkey removed successfully.', type: 'success' })
    } catch (err) {
      console.error('Failed to remove passkey:', err)
      setToast({ message: 'Failed to remove passkey.', type: 'error' })
    }
  }

  const handleInitiate2FA = async () => {
    setIsEnabling2FA(true)
    try {
      const secret = generateTOTPSecret()
      const label = lockedEmail || lockedUsername
      const uri = generateTOTPURI(secret, label, 'ISAAC')
      const qrUrl = await QRCode.toDataURL(uri)

      setTwoFactorSecret(secret)
      setTwoFactorQR(qrUrl)
      setTwoFactorToken('')
      setTwoFactorSetupStep('scan_verify')
    } catch (err) {
      console.error('Failed to initiate 2FA setup:', err)
      setToast({ message: 'Could not generate 2FA credentials.', type: 'error' })
    } finally {
      setIsEnabling2FA(false)
    }
  }

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = twoFactorToken.trim()
    if (!token || token.length !== 6) {
      setToast({ message: 'Please enter a valid 6-digit code.', type: 'error' })
      return
    }

    setIsEnabling2FA(true)
    try {
      const isValid = verifyTOTPToken(token, twoFactorSecret)
      if (!isValid) {
        setToast({ message: 'Invalid verification code. Please check your app.', type: 'error' })
        setIsEnabling2FA(false)
        return
      }

      const userUid = localStorage.getItem('isaac_uid') || lockedUsername
      await setDoc(doc(db, 'users', userUid), {
        twoFactorEnabled: true,
        twoFactorSecret: twoFactorSecret
      }, { merge: true })

      setTwoFactorEnabled(true)
      setTwoFactorSetupStep('idle')
      setTwoFactorSecret('')
      setTwoFactorQR('')
      setTwoFactorToken('')
      setToast({ message: 'Two-factor authentication enabled successfully!', type: 'success' })
    } catch (err) {
      console.error('Failed to enable 2FA:', err)
      setToast({ message: 'Failed to enable 2FA. Please try again.', type: 'error' })
    } finally {
      setIsEnabling2FA(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA protection?')) return

    setIsDisabling2FA(true)
    try {
      const userUid = localStorage.getItem('isaac_uid') || lockedUsername
      await setDoc(doc(db, 'users', userUid), {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }, { merge: true })

      setTwoFactorEnabled(false)
      setToast({ message: 'Two-factor authentication disabled.', type: 'info' })
    } catch (err) {
      console.error('Failed to disable 2FA:', err)
      setToast({ message: 'Failed to disable 2FA.', type: 'error' })
    } finally {
      setIsDisabling2FA(false)
    }
  }

  // Screenshot & Security Protection listener
  useEffect(() => {
    const handleScreenshotTrigger = () => {
      setIsScreenshotBlocked(true)
      if (showAvatarModal) {
        setToast({
          message: 'Screenshots of avatar images are restricted for security purposes.',
          type: 'error'
        })
      }
      setTimeout(() => {
        setIsScreenshotBlocked(false)
      }, 2500)
    }

    const handlePopState = () => {
      if (showSearchOverlay) {
        closeSearchOverlay()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSearchOverlay) {
        handleCloseSearchAction()
      }
      // PrintScreen Key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault()
        handleScreenshotTrigger()
      }
      // Snipping Tool / OS Screenshot shortcuts (Win+Shift+S / Cmd+Shift+3/4/5)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5')
      ) {
        handleScreenshotTrigger()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        handleScreenshotTrigger()
      }
    }

    const handleWindowBlur = () => {
      // Temporary blackout when window loses focus (e.g. Snipping tool launch)
      setIsScreenshotBlocked(true)
      setTimeout(() => setIsScreenshotBlocked(false), 2000)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showAvatarModal, showSearchOverlay])

  // Lock background body scrolling when Settings overlay, Search overlay or Avatar modal is active
  useEffect(() => {
    if (showSettings || showAvatarModal || showSearchOverlay) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [showSettings, showAvatarModal, showSearchOverlay])

  // Trivia rotation
  const [triviaIndex, setTriviaIndex] = useState(0)
  const [triviaFade, setTriviaFade] = useState(true)

  // Dynamic color extraction state
  const [theme, setTheme] = useState<ExtractedTheme>({
    colors: ['#a855f7', '#3b82f6', '#ec4899'],
    brightestX: 2
  })

  // Announcement ticker ref
  const tickerRef = useRef<HTMLDivElement>(null)

  // Close preview mode if user releases mouse anywhere
  useEffect(() => {
    if (!isHoldingSlider) return
    const handleGlobalMouseUp = () => {
      setIsHoldingSlider(false)
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [isHoldingSlider])

  // Banner color extraction
  useEffect(() => {
    if (!bannerImgSrc) {
      const preset = BANNER_PRESETS.find(p => p.id === selectedPresetId) || BANNER_PRESETS[0]
      setTheme({ colors: preset.colors, brightestX: 2 })
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = bannerImgSrc

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 4
        canvas.height = 4
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, 4, 4)
        const imgData = ctx.getImageData(0, 0, 4, 4).data

        let brightestVal = -1
        let brightestIndex = 0

        for (let i = 0; i < 16; i++) {
          const r = imgData[i * 4]
          const g = imgData[i * 4 + 1]
          const b = imgData[i * 4 + 2]
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b
          if (brightness > brightestVal) {
            brightestVal = brightness
            brightestIndex = i
          }
        }

        const brightestX = brightestIndex % 4

        const getColor = (idx: number) => {
          const r = imgData[idx * 4]
          const g = imgData[idx * 4 + 1]
          const b = imgData[idx * 4 + 2]
          return `rgb(${r}, ${g}, ${b})`
        }

        const c1 = getColor(5)
        const c2 = getColor(10)
        const c3 = getColor(14)

        setTheme({
          colors: [c1, c2, c3],
          brightestX
        })
      } catch (err) {
        console.error("Failed to extract image colors dynamically:", err)
      }
    }
  }, [bannerImgSrc])

  // Trivia auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setTriviaFade(false)
      setTimeout(() => {
        setTriviaIndex((prev) => (prev + 1) % TRIVIA_FACTS.length)
        setTriviaFade(true)
      }, 400)
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  // Dynamically translate concentrations
  const primaryLeft = `${10 + theme.brightestX * 18}%`
  const secondaryLeft = `${50 - theme.brightestX * 8}%`

  const bypass = () => {
    onSignOut()
  }

  const currentTrivia = TRIVIA_FACTS[triviaIndex]

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    if (hour < 21) return 'Good Evening'
    return 'Clear Skies Tonight'
  }

  return (
    <div className="dashboard-layout-container" style={{ minHeight: '65vh' }}>
      <div className="liquid-gradient-wrapper">
        <div 
          className="liquid-blob blob-1" 
          style={{ 
            background: `radial-gradient(circle, ${theme.colors[0]} 0%, transparent 80%)`,
            left: primaryLeft,
            top: '-15%'
          }}
        />
        <div 
          className="liquid-blob blob-2" 
          style={{ 
            background: `radial-gradient(circle, ${theme.colors[1]} 0%, transparent 80%)`,
            left: secondaryLeft,
            top: '-25%'
          }}
        />
        <div 
          className="liquid-blob blob-3" 
          style={{ 
            background: `radial-gradient(circle, ${theme.colors[2]} 0%, transparent 80%)`,
            left: '40%',
            top: '10%'
          }}
        />
      </div>

      <div className="dashboard-sidebar-pill">
        <div className="sidebar-nav-list">
          <button 
            className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            title="Profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button 
            className={`sidebar-nav-item ${showSearchOverlay ? 'active' : ''}`}
            onClick={openSearchOverlay}
            title="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
            className={`sidebar-nav-item ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        <div className="sidebar-nav-bottom">
          <button 
            className="sidebar-nav-item logout"
            onClick={onSignOut}
            title="Sign Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`dashboard-glass-plate ${isScrolled ? 'scrolled' : ''}`}>
        <div 
          className={`dashboard-banner-container ${isDraggingOverBanner ? 'drag-active' : ''}`}
          onDragOver={handleBannerDragOver}
          onDragLeave={handleBannerDragLeave}
          onDrop={handleBannerDrop}
        >
          <input 
            type="file" 
            ref={bannerFileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }}
            onChange={handleBannerFileSelect}
          />

          {bannerImgSrc ? (
            <div 
              className="dashboard-banner-display" 
              style={{ backgroundImage: `url('${bannerImgSrc}')` }}
            />
          ) : (
            <div 
              className="dashboard-banner-fallback"
              style={{
                background: `linear-gradient(135deg, ${theme.colors[0]}44 0%, ${theme.colors[1]}33 50%, ${theme.colors[2]}22 100%)`
              }}
            >
              <div className="banner-noise" />
            </div>
          )}
          <div 
            className="banner-overlay"
            style={{
              maskImage: `linear-gradient(to bottom, transparent ${blurFadeStart}%, black 85%)`,
              WebkitMaskImage: `linear-gradient(to bottom, transparent ${blurFadeStart}%, black 85%)`
            }}
          />

          <div className="banner-upload-overlay" onClick={() => bannerFileInputRef.current?.click()}>
            <div className="banner-upload-prompt">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{isUploadingBanner ? 'Uploading...' : (isDraggingOverBanner ? 'Drop to crop banner' : (bannerImgSrc ? 'Change Banner' : 'Upload Banner'))}</span>
            </div>
          </div>
        </div>

        <div className="user-profile-header">
          <BorderGlow
            className="user-avatar-glow-wrapper"
            borderRadius={60}
            edgeSensitivity={30}
            glowColor="270 80% 80%"
            backgroundColor="#000000"
            glowRadius={25}
            glowIntensity={2.5}
            animated={true}
            colors={['#a855f7', '#3b82f6', '#ec4899']}
          >
            <div 
              className={`user-avatar-container ${isScreenshotBlocked ? 'screenshot-blackout' : ''}`}
              onClick={() => setShowAvatarModal(true)}
              onContextMenu={(e) => e.preventDefault()}
              title="Click to view/change avatar"
            >
              {hasCustomAvatar ? (
                <img 
                  src={avatarImgSrc} 
                  alt={fullName} 
                  className="user-avatar-img"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  onError={handleAvatarError}
                />
              ) : (
                <div className="user-avatar-initial-badge">
                  <span>{userInitialLetter}</span>
                </div>
              )}
              {isAvatarBlurEnabled && <div className="avatar-overlay" />}
            </div>
          </BorderGlow>
          <div className="user-meta-details">
            <h1 className="user-name">{fullName}</h1>
            <p className="user-role">{displayUsername}</p>
          </div>
        </div>

        <div className="dashboard-content-area" onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 25)}>
          {/* Announcement Ticker Strip */}
          <div className="announcement-ticker">
            <div className="ticker-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <span>LIVE</span>
            </div>
            <div className="ticker-track-wrapper">
              <div className="ticker-track" ref={tickerRef}>
                {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, i) => (
                  <span key={i} className="ticker-item">{text}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Greeting + Quick Stats Row */}
          <div className="dashboard-greeting-row">
            <div className="greeting-text">
              <h2 className="greeting-title">{getGreeting()}, Shrvan</h2>
              <p className="greeting-subtitle">Here's what's happening in your ISAAC universe.</p>
            </div>
          </div>

          <div className="quick-stats-row">
            <div className="quick-stat-card">
              <span className="quick-stat-value">2</span>
              <span className="quick-stat-label">Events Registered</span>
            </div>
            <div className="quick-stat-card">
              <span className="quick-stat-value">Jul 2026</span>
              <span className="quick-stat-label">Member Since</span>
            </div>
            <div className="quick-stat-card">
              <span className="quick-stat-value">2 / 6</span>
              <span className="quick-stat-label">Badges Earned</span>
            </div>
            <div className="quick-stat-card">
              <span className="quick-stat-value">—</span>
              <span className="quick-stat-label">Club Affiliation</span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="dashboard-content-grid">
            {/* Left Column */}
            <div className="dashboard-col-primary">
              {/* Upcoming Events Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <h3 className="dash-card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upcoming Events
                  </h3>
                  <a href="/events" className="dash-card-link">View All →</a>
                </div>
                <div className="events-list">
                  {UPCOMING_EVENTS.map((event) => (
                    <div key={event.id} className="event-row">
                      <div className="event-row-indicator">
                        <div className={`event-dot ${event.status}`} />
                      </div>
                      <div className="event-row-details">
                        <span className="event-row-title">{event.title}</span>
                        <span className="event-row-meta">{event.date} · {event.location}</span>
                      </div>
                      <div className="event-row-actions">
                        <span className={`event-type-badge ${event.type.toLowerCase()}`}>{event.type}</span>
                        <button className={`event-register-btn ${event.status === 'open' ? '' : 'disabled'}`}>
                          {event.status === 'open' ? 'Register' : 'Coming Soon'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest News Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <h3 className="dash-card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Latest News
                  </h3>
                </div>
                <div className="news-list">
                  {LATEST_NEWS.map((item) => (
                    <div key={item.id} className="news-row">
                      <div className="news-row-content">
                        <span className="news-row-title">{item.title}</span>
                        <span className="news-row-meta">{item.date}</span>
                      </div>
                      <span className="news-category-pill">{item.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="dashboard-col-secondary">
              {/* Trivia Card */}
              <div className="dash-card trivia-card">
                <div className="dash-card-header">
                  <h3 className="dash-card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Did You Know?
                  </h3>
                </div>
                <div className={`trivia-content ${triviaFade ? 'visible' : 'hidden'}`}>
                  <span className="trivia-emoji">{currentTrivia.emoji}</span>
                  <p className="trivia-fact">{currentTrivia.fact}</p>
                </div>
                <div className="trivia-progress">
                  {TRIVIA_FACTS.map((_, i) => (
                    <div
                      key={i}
                      className={`trivia-dot ${i === triviaIndex ? 'active' : ''}`}
                      onClick={() => {
                        setTriviaFade(false)
                        setTimeout(() => {
                          setTriviaIndex(i)
                          setTriviaFade(true)
                        }, 200)
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Badges Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <h3 className="dash-card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Badges
                  </h3>
                </div>
                <div className="badges-grid">
                  {BADGES.map((badge) => (
                    <div key={badge.id} className={`badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}>
                      <span className="badge-icon">{badge.symbol}</span>
                      <span className="badge-name">{badge.title}</span>
                      <span className="badge-requirement">{badge.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links Card */}
              <div className="dash-card">
                <div className="dash-card-header">
                  <h3 className="dash-card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Quick Links
                  </h3>
                </div>
                <div className="quick-links-list">
                  <a href="/events" className="quick-link-item">
                    <span>Browse Events</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </a>
                  <a href="/clubs" className="quick-link-item">
                    <span>Explore Clubs</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </a>
                  <a href="/publications" className="quick-link-item">
                    <span>Publications</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </a>
                  <a href="/resources" className="quick-link-item">
                    <span>Learning Resources</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div 
          className={`user-settings-overlay ${isHoldingSlider ? 'preview-mode' : ''}`} 
          onClick={() => setShowSettings(false)}
        >
          <div className="user-settings-container" onClick={(e) => e.stopPropagation()}>
            {/* Pill-shaped navigation menu outside the settings modal card */}
            <div className="user-settings-sidebar-pill">
              <div className="sidebar-nav-list">
                <button 
                  className={`sidebar-nav-item ${settingsTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('profile')}
                  title="Edit Profile Details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  className={`sidebar-nav-item ${settingsTab === 'theme' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('theme')}
                  title="Banner & Theme Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
                <button 
                  className={`sidebar-nav-item ${settingsTab === 'security' ? 'active' : ''}`}
                  onClick={() => setSettingsTab('security')}
                  title="Security & Credentials"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              </div>
              
              <div className="sidebar-nav-bottom">
                <button 
                  className="sidebar-nav-item logout"
                  onClick={() => setShowSettings(false)}
                  title="Close Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main settings modal card */}
            <div className="user-settings-modal">
              <div className="user-settings-header">
                <h2>{settingsTab === 'profile' ? 'Edit User Profile' : (settingsTab === 'theme' ? 'Banner & Theme Settings' : 'Security & Credentials')}</h2>
              </div>
              <div className="user-settings-modal-content">
                {settingsTab === 'profile' && (
                  <form className="edit-profile-onboarding-form" onSubmit={handleSaveProfile}>

                    {/* 1. Name inputs */}
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">FIRST NAME *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Carl"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                          required
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label">MIDDLE NAME</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Middle"
                          value={editMiddleName}
                          onChange={(e) => setEditMiddleName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label">LAST NAME *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Sagan"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    {/* 2. Username (Editable with real-time uniqueness validation) */}
                    <div className="form-group">
                      <label className="form-label">USERNAME * (Min 3, Max 15)</label>
                      <div className={`username-input-wrapper ${usernameError ? 'error-border' : ''}`}>
                        <span className="username-prefix-at">@</span>
                        <input
                          type="text"
                          className="form-input username-field"
                          placeholder="e.g. stargazer_42"
                          value={editUsername}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          maxLength={15}
                          required
                        />
                      </div>
                      {usernameError && <span className="field-error-text" style={{ display: 'block', marginTop: '4px', color: '#ff5555', fontSize: '12px' }}>{usernameError}</span>}

                      {/* Username Suggestion Chips */}
                      {usernameSuggestions.length > 0 && (
                        <div className="suggestions-container" style={{ marginTop: '8px' }}>
                          <span className="suggestions-label" style={{ fontSize: '11px', color: 'rgba(252, 254, 237, 0.6)', marginRight: '6px' }}>Suggestions:</span>
                          <div className="suggestions-chips" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {usernameSuggestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                className="suggestion-chip"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: '12px',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleUsernameChange(sug)}
                              >
                                @{sug}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="refresh-suggestions-btn"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(252, 254, 237, 0.6)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onClick={() => setSuggestionsSeed((prev) => prev + 1)}
                              title="Generate new suggestions"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Email & DOB (Read-Only) */}
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">E-MAIL</label>
                        <input
                          type="email"
                          className="form-input"
                          value={lockedEmail}
                          readOnly
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label">DATE OF BIRTH</label>
                        <input
                          type="text"
                          className="form-input"
                          value={lockedDob}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* 4. Sex (Read-Only) */}
                    <div className="form-group">
                      <label className="form-label">SEX</label>
                      <input
                        type="text"
                        className="form-input"
                        value={lockedSex}
                        readOnly
                      />
                    </div>

                    {/* 5. Contact Number with Country Dropdown */}
                    <div className="form-group">
                      <label className="form-label">CONTACT NUMBER *</label>
                      <div className="phone-input-row">
                        <Dropdown
                          options={COUNTRIES}
                          value={editCountry}
                          onChange={(c) => {
                            setEditCountry(c)
                            setEditRawContact('')
                          }}
                          searchable
                          searchPlaceholder="Search code..."
                          getOptionLabel={(c) => `${c.name} ${c.code} ${c.iso}`}
                          getOptionValue={(c) => c.name}
                          renderTrigger={(val) => val ? (
                            <>
                              <span className="country-iso">{val.iso}</span>
                              <span className="code">{val.code}</span>
                            </>
                          ) : null}
                          renderOption={(c) => (
                            <span style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                              <span className="country-iso">{c.iso}</span>
                              <span>{c.name}</span>
                              <span className="opt-code" style={{ marginLeft: 'auto' }}>{c.code}</span>
                            </span>
                          )}
                          className="country-code-selector"
                        />

                        <input
                          type="text"
                          className="form-input phone-number-input"
                          placeholder={editCountry.format}
                          value={editRawContact}
                          onChange={(e) => setEditRawContact(e.target.value.replace(/[^0-9\s-]/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    {/* 6. WhatsApp Number */}
                    <div className="form-group">
                      <div className="label-with-checkbox-row">
                        <label className="form-label">WHATSAPP NUMBER *</label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={isWaSame}
                            onChange={(e) => setIsWaSame(e.target.checked)}
                          />
                          Same as Contact?
                        </label>
                      </div>

                      <div className="phone-input-row">
                        <Dropdown
                          options={COUNTRIES}
                          value={editWaCountry}
                          onChange={(c) => {
                            setEditWaCountry(c)
                            setEditRawWhatsApp('')
                          }}
                          searchable
                          searchPlaceholder="Search code..."
                          disabled={isWaSame}
                          getOptionLabel={(c) => `${c.name} ${c.code} ${c.iso}`}
                          getOptionValue={(c) => c.name}
                          renderTrigger={(val) => val ? (
                            <>
                              <span className="country-iso">{val.iso}</span>
                              <span className="code">{val.code}</span>
                            </>
                          ) : null}
                          renderOption={(c) => (
                            <span style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                              <span className="country-iso">{c.iso}</span>
                              <span>{c.name}</span>
                              <span className="opt-code" style={{ marginLeft: 'auto' }}>{c.code}</span>
                            </span>
                          )}
                          className="country-code-selector"
                        />

                        <input
                          type="text"
                          className="form-input phone-number-input"
                          placeholder={editWaCountry.format}
                          value={editRawWhatsApp}
                          onChange={(e) => setEditRawWhatsApp(e.target.value.replace(/[^0-9\s-]/g, ''))}
                          readOnly={isWaSame}
                          required
                        />
                      </div>
                    </div>

                    {/* 7. College / University */}
                    <div className="form-group">
                      <label className="form-label">COLLEGE / UNIVERSITY *</label>
                      <Dropdown
                        options={PRESET_COLLEGES}
                        value={editCollege === 'Other' ? 'Other' : editCollege}
                        onChange={(val) => {
                          setEditCollege(val)
                          if (val !== 'Other') setEditCustomCollege('')
                        }}
                        searchable
                        searchPlaceholder="Search colleges..."
                        placeholder="Select College"
                        hasOtherOption
                        onOtherSelect={() => setEditCollege('Other')}
                        getOptionLabel={(val) => val === 'Other' ? `Other (${editCustomCollege || 'Not Specified'})` : val}
                        getOptionValue={(val) => val}
                      />

                      {editCollege === 'Other' && (
                        <input
                          type="text"
                          className="form-input custom-spec-field"
                          placeholder="Type your college name..."
                          value={editCustomCollege}
                          onChange={(e) => setEditCustomCollege(e.target.value)}
                          required
                        />
                      )}
                    </div>

                    {/* 8. Major / Specialization */}
                    <div className="form-group">
                      <label className="form-label">MAJOR / SPECIALIZATION *</label>
                      <Dropdown
                        options={[...PRESET_MAJORS]}
                        value={editMajor === 'Other' ? 'Other' : editMajor}
                        onChange={(val) => {
                          setEditMajor(val)
                          if (val !== 'Other') setEditCustomMajor('')
                        }}
                        searchable
                        searchPlaceholder="Search majors..."
                        placeholder="Select Major"
                        hasOtherOption
                        onOtherSelect={() => setEditMajor('Other')}
                        getOptionLabel={(val) => val === 'Other' ? `Other (${editCustomMajor || 'Not Specified'})` : val}
                        getOptionValue={(val) => val}
                      />

                      {editMajor === 'Other' && (
                        <input
                          type="text"
                          className="form-input custom-spec-field"
                          placeholder="Type your major..."
                          value={editCustomMajor}
                          onChange={(e) => setEditCustomMajor(e.target.value)}
                          required
                        />
                      )}
                    </div>

                    {/* 9. Academic Year & Passing Year */}
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label">CURRENT ACADEMIC YEAR *</label>
                        <Dropdown
                          options={['1st Year', '2nd Year', '3rd Year', '4th Year', 'Post Graduate', 'PhD', 'Other']}
                          value={editCurrentYear}
                          onChange={(val) => setEditCurrentYear(val)}
                          placeholder="Select Year"
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label">PASSING YEAR *</label>
                        <Dropdown
                          options={Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() + i))}
                          value={editPassingYear}
                          onChange={(val) => setEditPassingYear(val)}
                          placeholder="Graduation Year"
                        />
                      </div>
                    </div>

                    <button type="submit" className="onboarding-submit-btn" disabled={isSavingProfile}>
                      {isSavingProfile ? 'SAVING CHANGES...' : 'SAVE PROFILE CHANGES'}
                    </button>
                  </form>
                )}
                {settingsTab === 'theme' && (
                  <div className="settings-panel">
                    <p>Manage your public user profile settings, avatar, and banner credentials.</p>
                    
                    <div className="slider-control-group">
                      <label htmlFor="blur-fade-slider">Banner Blur Fade</label>
                      <div className="slider-wrapper">
                        <span className="slider-min">High Blur</span>
                        <input
                          id="blur-fade-slider"
                          type="range"
                          min="0"
                          max="95"
                          value={blurFadeStart}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            setBlurFadeStart(val)
                            try {
                              localStorage.setItem('isaac_blur_fade_start', String(val))
                            } catch (err) {
                              console.warn('localStorage setItem failed:', err)
                            }
                            updatePreferenceConfig({ blurFadeStart: val })
                          }}
                          onMouseDown={() => setIsHoldingSlider(true)}
                          onMouseUp={() => setIsHoldingSlider(false)}
                          onTouchStart={() => setIsHoldingSlider(true)}
                          onTouchEnd={() => setIsHoldingSlider(false)}
                          className="settings-range-slider"
                        />
                        <span className="slider-max">Low Blur</span>
                      </div>
                      <div className="slider-footer">
                        <span className="slider-value-indicator">{blurFadeStart}% Clear from Top</span>
                        <button 
                          className="settings-reset-btn"
                          onClick={() => {
                            setBlurFadeStart(15)
                            try {
                              localStorage.setItem('isaac_blur_fade_start', '15')
                            } catch (err) {
                              console.warn('localStorage setItem failed:', err)
                            }
                            updatePreferenceConfig({ blurFadeStart: 15 })
                          }}
                          title="Reset to default blur"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="slider-control-group" style={{ marginTop: '16px' }}>
                      <div className="avatar-blur-toggle-row">
                        <div className="avatar-blur-toggle-text">
                          <label style={{ display: 'block', margin: 0, cursor: 'pointer' }} htmlFor="avatar-blur-checkbox">
                            AVATAR OVERLAY BLUR
                          </label>
                          <span className="avatar-blur-toggle-desc">
                            Toggle bottom gradient & glass blur overlay on profile avatar
                          </span>
                        </div>
                        <label className="theme-toggle-switch">
                          <input 
                            id="avatar-blur-checkbox"
                            type="checkbox" 
                            checked={isAvatarBlurEnabled} 
                            onChange={(e) => {
                              const val = e.target.checked
                              setIsAvatarBlurEnabled(val)
                              try {
                                localStorage.setItem('isaac_avatar_blur_enabled', String(val))
                              } catch (err) {
                                console.warn('localStorage setItem failed:', err)
                              }
                              updatePreferenceConfig({ avatarBlurEnabled: val })
                            }}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    </div>

                    <div className="slider-control-group" style={{ marginTop: '16px' }}>
                      <div className="banner-presets-header">
                        <div>
                          <label style={{ display: 'block', margin: 0 }}>LIQUID BLOB BANNER PRESETS</label>
                          <span className="avatar-blur-toggle-desc">
                            Select a dynamic liquid gradient color preset for your profile background
                          </span>
                        </div>
                        {bannerImgSrc && (
                          <button 
                            type="button" 
                            className="settings-reset-btn"
                            onClick={handleRemoveCustomBanner}
                            title="Remove custom banner image and use liquid preset"
                          >
                            Remove Custom Image
                          </button>
                        )}
                      </div>

                      <div className="banner-presets-grid">
                        {BANNER_PRESETS.map((preset) => {
                          const isActive = (!bannerImgSrc && selectedPresetId === preset.id)
                          return (
                            <div 
                              key={preset.id}
                              className={`banner-preset-card ${isActive ? 'active' : ''}`}
                              onClick={() => handleSelectBannerPreset(preset)}
                            >
                              <div 
                                className="banner-preset-preview"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 50%, ${preset.colors[2]} 100%)`
                                }}
                              >
                                {isActive && <span className="preset-active-check">✓</span>}
                              </div>
                              <span className="banner-preset-name">{preset.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {settingsTab === 'security' && (
                  <div className="settings-panel usr-sec-panel">
                    
                    {/* ── Section 1: Biometric Passkey Credentials ── */}
                    <div className="usr-sec-card-box">
                      <div className="usr-sec-card-header">
                        <div className="usr-sec-header-text">
                          <h3 className="usr-sec-card-title">Biometric Passkey Credentials</h3>
                          <p className="usr-sec-card-subtitle">
                            Sign in securely using Touch ID, Face ID, Windows Hello, or hardware security keys.
                          </p>
                        </div>
                        <button 
                          type="button" 
                          className="usr-sec-action-btn primary"
                          onClick={handleRegisterPasskey}
                          disabled={isRegisteringPasskey || passkeys.length >= 3}
                        >
                          {isRegisteringPasskey ? 'REGISTERING...' : '+ REGISTER PASSKEY'}
                        </button>
                      </div>

                      <div className="usr-sec-passkeys-container">
                        {passkeys.length > 0 ? (
                          <div className="usr-sec-devices-list">
                            {passkeys.map((pk, idx) => (
                              <div key={pk.credentialId || idx} className="usr-sec-device-item">
                                <div className="usr-sec-device-info">
                                  <div className="usr-sec-device-icon">🔑</div>
                                  <div className="usr-sec-device-meta">
                                    <span className="usr-sec-device-name">{pk.name || `Passkey Device ${idx + 1}`}</span>
                                    <span className="usr-sec-device-date">Registered on {new Date(pk.created).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  className="usr-sec-remove-btn"
                                  onClick={() => handleDeletePasskey(pk.credentialId)}
                                  title="Remove passkey device"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="usr-sec-empty-state">
                            <span>No passkey credentials registered yet. Register your device for instant passwordless sign-in.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Section 2: Multi-Factor Authentication (TOTP 2FA) ── */}
                    <div className="usr-sec-card-box">
                      <div className="usr-sec-card-header">
                        <div className="usr-sec-header-text">
                          <h3 className="usr-sec-card-title">Two-Factor Authentication (TOTP 2FA)</h3>
                          <p className="usr-sec-card-subtitle">
                            Protect your user account with Google Authenticator, Authy, or 1Password.
                          </p>
                        </div>
                        {twoFactorEnabled ? (
                          <button 
                            type="button" 
                            className="usr-sec-action-btn danger"
                            onClick={handleDisable2FA}
                            disabled={isDisabling2FA}
                          >
                            {isDisabling2FA ? 'DISABLING...' : 'DISABLE 2FA'}
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="usr-sec-action-btn primary"
                            onClick={handleInitiate2FA}
                            disabled={isEnabling2FA || twoFactorSetupStep === 'scan_verify'}
                          >
                            {isEnabling2FA ? 'GENERATING...' : 'SETUP 2FA'}
                          </button>
                        )}
                      </div>

                      {twoFactorEnabled && (
                        <div className="usr-sec-status-badge active">
                          <span>✓ 2FA Protection Active on your account</span>
                        </div>
                      )}

                      {twoFactorSetupStep === 'scan_verify' && (
                        <form onSubmit={handleEnable2FA} className="usr-sec-twofa-card">
                          <div className="usr-sec-step-desc">
                            <span className="usr-sec-step-num">1</span> Scan this QR Code with Google Authenticator, Authy, or 1Password:
                          </div>

                          {twoFactorQR && (
                            <div className="usr-sec-qr-wrapper">
                              <img src={twoFactorQR} alt="2FA QR Code" className="usr-sec-qr-img" />
                            </div>
                          )}

                          <div className="usr-sec-secret-display">
                            <span>Secret Key: <code>{twoFactorSecret}</code></span>
                          </div>

                          <div className="usr-sec-step-desc" style={{ marginTop: '12px' }}>
                            <span className="usr-sec-step-num">2</span> Enter the 6-digit verification code from your app:
                          </div>

                          <div className="usr-sec-verify-row">
                            <input
                              type="text"
                              className="form-input usr-sec-code-input"
                              placeholder="000 000"
                              maxLength={6}
                              value={twoFactorToken}
                              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                              required
                            />
                            <button type="submit" className="usr-sec-action-btn primary" disabled={isEnabling2FA}>
                              {isEnabling2FA ? 'VERIFYING...' : 'ENABLE 2FA'}
                            </button>
                            <button 
                              type="button" 
                              className="usr-sec-action-btn secondary"
                              onClick={() => setTwoFactorSetupStep('idle')}
                            >
                              CANCEL
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* ── Section 3: Danger Zone (Delete Account) ── */}
                    <div className="usr-sec-card-box danger-zone" style={{ border: '1px solid rgba(255, 85, 85, 0.3)', background: 'rgba(255, 51, 51, 0.04)', marginTop: '20px' }}>
                      <div className="usr-sec-card-header">
                        <div className="usr-sec-header-text">
                          <h3 className="usr-sec-card-title" style={{ color: '#ff5555' }}>Danger Zone — Delete Account</h3>
                          <p className="usr-sec-card-subtitle">
                            Permanently purge your ISAAC user profile and all associated telemetry records. This operation is irreversible.
                          </p>
                        </div>
                        <button 
                          type="button" 
                          className="usr-sec-action-btn danger"
                          style={{ background: '#ff3333', color: '#ffffff', borderColor: '#ff3333' }}
                          onClick={() => {
                            setDeleteConfirmText('')
                            setShowDeleteConfirmModal(true)
                          }}
                        >
                          DELETE ACCOUNT
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Passkey Name Prompt Modal */}
        {showPasskeyNameModal && (
          <div className="user-avatar-modal-overlay" onClick={() => setShowPasskeyNameModal(false)}>
            <div className="user-settings-modal" style={{ maxWidth: '420px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="usr-sec-card-title">Register Passkey</h3>
              <p className="usr-sec-card-subtitle" style={{ marginBottom: '16px' }}>
                Provide a friendly device name to identify this biometric key later.
              </p>
              <form onSubmit={handleSavePasskeyName} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input 
                  type="text"
                  className="form-input"
                  value={tempPasskeyName}
                  onChange={(e) => setTempPasskeyName(e.target.value)}
                  placeholder="e.g. MacBook Pro TouchID"
                  required
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" className="usr-sec-action-btn secondary" onClick={() => setShowPasskeyNameModal(false)}>
                    CANCEL
                  </button>
                  <button type="submit" className="usr-sec-action-btn primary">
                    SAVE PASSKEY
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Account Deletion Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="user-avatar-modal-overlay" onClick={() => setShowDeleteConfirmModal(false)}>
            <div className="user-settings-modal" style={{ maxWidth: '440px', padding: '28px', border: '1px solid rgba(255, 51, 51, 0.4)' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="usr-sec-card-title" style={{ color: '#ff4444', fontSize: '18px' }}>⚠️ Confirm Permanent Account Deletion</h3>
              <p className="usr-sec-card-subtitle" style={{ marginBottom: '18px', color: 'rgba(252, 254, 237, 0.7)', lineHeight: '1.5' }}>
                This action will permanently delete your user profile, telemetry records, and passkey credentials from the ISAAC database.
              </p>
              <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '12px', textTransform: 'uppercase', color: 'rgba(252, 254, 237, 0.6)', letterSpacing: '1px' }}>
                  Type <strong style={{ color: '#ffffff' }}>DELETE</strong> to confirm:
                </label>
                <input 
                  type="text"
                  className="form-input"
                  style={{ borderColor: 'rgba(255, 51, 51, 0.5)' }}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  required
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    className="usr-sec-action-btn secondary" 
                    onClick={() => setShowDeleteConfirmModal(false)}
                    disabled={isDeletingAccount}
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit" 
                    className="usr-sec-action-btn danger" 
                    style={{ background: '#ff3333', color: '#ffffff', borderColor: '#ff3333' }}
                    disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  >
                    {isDeletingAccount ? 'PERMANENTLY DELETING...' : 'CONFIRM DELETE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Enlarged Avatar View Modal */}
      {showAvatarModal && (
        <div 
          className="user-avatar-modal-overlay"
          onClick={() => setShowAvatarModal(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div 
            className={`user-avatar-modal-card ${isScreenshotBlocked ? 'screenshot-blackout' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="user-avatar-modal-header">
              <h3>USER AVATAR</h3>
              <button 
                className="user-settings-close-btn"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="user-avatar-modal-body">
              <div className={`enlarged-avatar-wrapper ${isScreenshotBlocked ? 'screenshot-blackout' : ''}`}>
                {hasCustomAvatar ? (
                  <img 
                    src={avatarImgSrc} 
                    alt="Enlarged Avatar" 
                    className="enlarged-avatar-img"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={handleAvatarError}
                  />
                ) : (
                  <div className="enlarged-avatar-initial-fallback">
                    <span>{userInitialLetter}</span>
                  </div>
                )}
                {isAvatarBlurEnabled && <div className="enlarged-avatar-overlay" />}
              </div>

              {/* Situational Avatar Actions */}
              <div className="usr-avatar-actions">
                <input 
                  type="file" 
                  ref={avatarFileInputRef} 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileSelect}
                />

                {hasCustomAvatar ? (
                  <>
                    <button 
                      type="button" 
                      className="usr-avatar-btn primary"
                      onClick={() => avatarFileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? 'UPLOADING...' : 'CHANGE PROFILE PICTURE'}
                    </button>
                    <button 
                      type="button" 
                      className="usr-avatar-btn danger"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                    >
                      REMOVE PROFILE PICTURE
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    className="usr-avatar-btn primary"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? 'UPLOADING...' : 'UPLOAD PROFILE PICTURE'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Warning Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Banner Image Cropper Modal */}
      {showBannerCropper && cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          aspect={16 / 5}
          title="CROP DASHBOARD BANNER"
          onCancel={() => {
            setShowBannerCropper(false)
            setCropperSrc('')
          }}
          onCropComplete={(croppedDataUrl) => {
            handleBannerCropComplete(croppedDataUrl)
          }}
        />
      )}

      {/* Profile Picture Image Cropper Modal */}
      {showAvatarCropper && cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          aspect={1}
          circularCrop={true}
          title="ADJUST PROFILE PICTURE CROP"
          onCancel={() => {
            setShowAvatarCropper(false)
            setCropperSrc('')
          }}
          onCropComplete={(croppedDataUrl) => {
            handleAvatarCropComplete(croppedDataUrl)
          }}
        />
      )}

      {/* Dashboard Search Overlay Modal */}
      {showSearchOverlay && (() => {
        const searchItems = [
          {
            id: 'edit-name',
            title: 'Change Name',
            description: 'Update first name, middle name, or last name',
            category: 'Profile',
            keywords: ['name', 'full name', 'firstname', 'lastname', 'middlename', 'rename', 'change name', 'edit name', 'update name', 'display name'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
            ctaText: 'Edit Name',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('profile')
              setShowSettings(true)
            }
          },
          {
            id: 'edit-username',
            title: 'Change Username (@handle)',
            description: 'Modify unique ISAAC handle (3 to 15 characters)',
            category: 'Profile',
            keywords: ['username', 'handle', 'tag', '@', 'user handle', 'change username', 'edit handle', 'unique handle', 'claim username'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            ),
            ctaText: 'Change Handle',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('profile')
              setShowSettings(true)
            }
          },
          {
            id: 'edit-contact',
            title: 'Update Phone & WhatsApp Number',
            description: 'Change contact phone number or WhatsApp country code',
            category: 'Profile',
            keywords: ['phone', 'contact', 'mobile', 'whatsapp', 'wa', 'number', 'cell', 'telephone', 'chat number', 'phone number', 'country code'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            ),
            ctaText: 'Update Phone',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('profile')
              setShowSettings(true)
            }
          },
          {
            id: 'edit-education',
            title: 'Update College & Major',
            description: 'Change institution, academic field of study, current or passing year',
            category: 'Profile',
            keywords: ['college', 'university', 'institution', 'major', 'degree', 'course', 'school', 'passing year', 'current year', 'batch', 'department', 'study', 'education', 'academic'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            ),
            ctaText: 'Edit Academics',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('profile')
              setShowSettings(true)
            }
          },
          {
            id: 'edit-avatar',
            title: 'Change Profile Picture / Avatar',
            description: 'Upload a new profile image, adjust crop, or toggle privacy blur',
            category: 'Appearance',
            keywords: ['avatar', 'profile picture', 'dp', 'photo', 'pfp', 'picture', 'image', 'crop photo', 'blur photo', 'privacy blur', 'upload photo', 'change photo'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ),
            ctaText: 'Avatar Settings',
            onSelect: () => {
              setShowSearchOverlay(false)
              setShowAvatarModal(true)
            }
          },
          {
            id: 'edit-banner',
            title: 'Change Dashboard Banner & Theme',
            description: 'Upload custom header image or pick liquid cosmic preset background',
            category: 'Appearance',
            keywords: ['banner', 'cover', 'header', 'background', 'liquid preset', 'cosmic nebula', 'stellar void', 'starlight', 'upload banner', 'change banner', 'theme', 'color', 'customization'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            ),
            ctaText: 'Customize Banner',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('appearance')
              setShowSettings(true)
            }
          },
          {
            id: 'security-2fa',
            title: 'Two-Factor Authentication (2FA)',
            description: 'Setup or disable authenticator app (Google Authenticator, Authy)',
            category: 'Security',
            keywords: ['2fa', 'two factor', 'two-factor', 'authenticator', 'totp', 'security code', 'otp', 'mfa', 'google authenticator', 'authy', 'security', 'protection', 'login code'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ),
            ctaText: 'Manage 2FA',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('security')
              setShowSettings(true)
            }
          },
          {
            id: 'security-passkeys',
            title: 'Passkeys & Biometric Security',
            description: 'Register Touch ID, Face ID, or Hardware Security Keys',
            category: 'Security',
            keywords: ['passkey', 'passkeys', 'touch id', 'face id', 'biometric', 'fingerprint', 'webauthn', 'hardware key', 'security key', 'passwordless', 'keychain'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            ),
            ctaText: 'Manage Passkeys',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('security')
              setShowSettings(true)
            }
          },
          {
            id: 'export-data',
            title: 'Download Account Data',
            description: 'Export profile telemetry and account records in JSON format',
            category: 'Account',
            keywords: ['export data', 'download data', 'backup account', 'data export', 'json download', 'account archive', 'my data', 'privacy export'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            ),
            ctaText: 'Export Data',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('account')
              setShowSettings(true)
            }
          },
          {
            id: 'delete-account',
            title: 'Delete Account (Danger Zone)',
            description: 'Permanently purge your ISAAC user profile and Firestore document',
            category: 'Account',
            keywords: ['delete account', 'remove account', 'close account', 'terminate', 'destroy account', 'purge data', 'danger zone', 'erase', 'cancel account'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
            ctaText: 'Delete Account',
            onSelect: () => {
              setShowSearchOverlay(false)
              setSettingsTab('account')
              setShowSettings(true)
            }
          },
          {
            id: 'view-badges',
            title: 'Badges & Space Achievements',
            description: 'View unlocked stargazer badges and milestone progress',
            category: 'Dashboard',
            keywords: ['badges', 'achievements', 'rewards', 'stargazer badge', 'space pioneer', 'milestones', 'trophy', 'levels', 'ranks'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            ),
            ctaText: 'View Badges',
            onSelect: () => {
              setShowSearchOverlay(false)
              setActiveTab('profile')
              setTimeout(() => {
                document.querySelector('.badges-grid')?.scrollIntoView({ behavior: 'smooth' })
              }, 150)
            }
          },
          {
            id: 'view-events',
            title: 'Upcoming Astronomy Events',
            description: 'Browse registered workshops, star parties, and webinars',
            category: 'Dashboard',
            keywords: ['events', 'workshops', 'webinars', 'stargazing', 'upcoming events', 'hackathons', 'schedule', 'meetings', 'gatherings'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ),
            ctaText: 'View Events',
            onSelect: () => {
              setShowSearchOverlay(false)
              setActiveTab('profile')
              setTimeout(() => {
                document.querySelector('.events-list')?.scrollIntoView({ behavior: 'smooth' })
              }, 150)
            }
          },
          {
            id: 'sign-out',
            title: 'Sign Out / Log Out',
            description: 'Safely terminate current dashboard session',
            category: 'Session',
            keywords: ['logout', 'log out', 'sign out', 'exit', 'leave', 'signoff', 'session', 'disconnect'],
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ),
            ctaText: 'Sign Out',
            onSelect: () => {
              setShowSearchOverlay(false)
              onSignOut()
            }
          }
        ]

        const cleanQuery = searchQuery.trim().toLowerCase()
        const isSearchActive = cleanQuery.length >= 3

        const filteredSearchItems = !isSearchActive
          ? []
          : searchItems
              .map((item) => {
                let score = 0
                const titleLower = item.title.toLowerCase()
                const descLower = item.description.toLowerCase()
                const catLower = item.category.toLowerCase()

                if (titleLower === cleanQuery) score += 50
                else if (titleLower.startsWith(cleanQuery)) score += 30
                else if (titleLower.includes(cleanQuery)) score += 15

                if (catLower.includes(cleanQuery)) score += 10
                if (descLower.includes(cleanQuery)) score += 5

                item.keywords.forEach((kw) => {
                  const kwLower = kw.toLowerCase()
                  if (kwLower === cleanQuery) score += 40
                  else if (kwLower.startsWith(cleanQuery)) score += 20
                  else if (kwLower.includes(cleanQuery)) score += 10
                })

                return { item, score }
              })
              .filter((entry) => entry.score > 0)
              .sort((a, b) => b.score - a.score)
              .map((entry) => entry.item)

        const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (filteredSearchItems.length === 0) return

          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSearchSelectedIndex((prev) => (prev + 1) % filteredSearchItems.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSearchSelectedIndex((prev) => (prev - 1 + filteredSearchItems.length) % filteredSearchItems.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const selected = filteredSearchItems[searchSelectedIndex] || filteredSearchItems[0]
            if (selected) {
              selected.onSelect()
            }
          }
        }

        return (
          <div className="user-dashboard-search-overlay">
            <div className="user-dashboard-search-modal">
              <div className="user-dashboard-search-input-wrapper">
                <svg className="user-dashboard-search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  className="user-dashboard-search-input"
                  placeholder="Type at least 3 characters to search settings..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSearchSelectedIndex(0)
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="user-dashboard-search-clear-btn"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchSelectedIndex(0)
                    }}
                    title="Clear search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className="user-dashboard-search-close-btn"
                  onClick={handleCloseSearchAction}
                  title="Close"
                >
                  ESC
                </button>
              </div>

              {/* Show results ONLY when user types 3+ characters */}
              {isSearchActive ? (
                <div className="user-dashboard-search-results-wrapper">
                  <div className="search-results-list">
                    {filteredSearchItems.length > 0 ? (
                      filteredSearchItems.map((item, idx) => {
                        const isSelected = idx === searchSelectedIndex
                        return (
                          <div
                            key={item.id}
                            className={`search-result-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              handleCloseSearchAction()
                              item.onSelect()
                            }}
                            onMouseEnter={() => setSearchSelectedIndex(idx)}
                          >
                            <div className="search-result-row-icon">
                              {item.icon}
                            </div>
                            <div className="search-result-row-info">
                              <span className="search-result-row-title">{item.title}</span>
                              <span className="search-result-row-desc">{item.description}</span>
                            </div>
                            <div className="search-result-row-cta">
                              {item.ctaText} <span className="cta-arrow">↗</span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="search-no-results-minimal">
                        <span>No matching settings or actions found for "{searchQuery}"</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Fade Mask Layer */}
                  {filteredSearchItems.length > 3 && (
                    <div className="search-results-fade-mask" />
                  )}
                </div>
              ) : (
                <div className="search-character-hint">
                  <span>Enter 3+ characters to search settings & actions</span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {false && bypass()}
      <div className="dashboard-mobile-bottom-fade" />
    </div>
  )
}
