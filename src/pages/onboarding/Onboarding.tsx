import { useState, useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { signInWithPopup } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { auth, db, googleProvider, storage } from '../../firebase'
import Toast, { type ToastType } from '../../components/toast/Toast'
import './Onboarding.css'

interface OnboardingProps {
  onComplete: (username: string) => void
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

import PRESET_COLLEGES from '../../../data/colleges/colleges.json'
import { majors as PRESET_MAJORS } from '../../../data/majors/majors'
import Dropdown from '../../components/dropdown/Dropdown'
import Calander from '../../components/calander/Calander'
import ImageCropper from '../../components/image-cropper/ImageCropper'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Delhi',
  'Puducherry', 'Jammu and Kashmir', 'Ladakh'
]

const TAKEN_USERNAMES = ['stargazer', 'admin', 'voyager', 'carlsagan', 'isaac_admin']

// Parse handles/usernames from pasted social media URLs
const parseSocialUsername = (val: string, platform: string): string => {
  let path = val.trim()
  if (!path) return ''

  // Remove protocol and www
  path = path.replace(/^(https?:\/\/)?(www\.)?/, '')

  if (platform === 'instagram') {
    if (path.includes('instagram.com/')) {
      path = path.split('instagram.com/')[1] || ''
    }
  } else if (platform === 'linkedin') {
    if (path.includes('linkedin.com/')) {
      path = path.split('linkedin.com/')[1] || ''
    }
  } else if (platform === 'youtube') {
    if (path.includes('youtube.com/')) {
      path = path.split('youtube.com/')[1] || ''
    }
  } else if (platform === 'facebook') {
    if (path.includes('facebook.com/')) {
      path = path.split('facebook.com/')[1] || ''
    }
  } else if (platform === 'discord') {
    if (path.includes('discord.gg/')) {
      path = path.split('discord.gg/')[1] || ''
    } else if (path.includes('discord.com/invite/')) {
      path = path.split('discord.com/invite/')[1] || ''
    } else if (path.includes('discord.com/')) {
      path = path.split('discord.com/')[1] || ''
    }
  } else if (platform === 'github') {
    if (path.includes('github.com/')) {
      path = path.split('github.com/')[1] || ''
    }
  }

  // Remove leading @
  if (path.startsWith('@')) {
    path = path.slice(1)
  }

  // Strip query params and hashes
  path = path.split('?')[0].split('#')[0]

  // Remove trailing and leading slashes
  path = path.replace(/^\/+|\/+$/g, '')

  return path
}

const getInstagramUrl = (handle: string) => {
  if (!handle) return ''
  return `https://instagram.com/${handle}`
}

const getLinkedInUrl = (handle: string) => {
  if (!handle) return ''
  if (handle.startsWith('in/') || handle.startsWith('company/') || handle.startsWith('school/')) {
    return `https://linkedin.com/${handle}`
  }
  return `https://linkedin.com/company/${handle}`
}

const getYouTubeUrl = (handle: string) => {
  if (!handle) return ''
  if (handle.startsWith('@') || handle.startsWith('c/') || handle.startsWith('channel/') || handle.startsWith('user/')) {
    return `https://youtube.com/${handle}`
  }
  return `https://youtube.com/@${handle}`
}

const getFacebookUrl = (handle: string) => {
  if (!handle) return ''
  return `https://facebook.com/${handle}`
}

const getDiscordUrl = (handle: string) => {
  if (!handle) return ''
  return `https://discord.gg/${handle}`
}

const getGitHubUrl = (handle: string) => {
  if (!handle) return ''
  return `https://github.com/${handle}`
}


export default function Onboarding({ onComplete }: OnboardingProps) {
  const [role, setRole] = useState<'user' | 'club' | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('role') || params.get('type')
    if (r === 'user' || r === 'pilot' || r === 'student') return 'user'
    if (r === 'club') return 'club'
    return null
  })

  const [activeTab, setActiveTab] = useState<'personal' | 'academic'>('personal')

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search)
      const r = params.get('role') || params.get('type')
      if (r === 'user' || r === 'pilot' || r === 'student') {
        setRole('user')
      } else if (r === 'club') {
        setRole('club')
      } else {
        setRole(null)
      }
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const handleSelectRole = (selectedRole: 'user' | 'club') => {
    window.history.pushState(null, '', `/onboarding?role=${selectedRole}`)
    setRole(selectedRole)
  }

  const toggleActivity = (activity: string) => {
    setClubActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    )
  }


  // 1. Personal Info State
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [rawUsername, setRawUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isEmailReadOnly, setIsEmailReadOnly] = useState(false)
  const [dob, setDob] = useState('')
  const [isDobReadOnly, setIsDobReadOnly] = useState(false)

  // Contact
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [rawContact, setRawContact] = useState('')

  // WhatsApp
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(false)
  const [selectedWaCountry, setSelectedWaCountry] = useState(COUNTRIES[0])
  const [rawWhatsApp, setRawWhatsApp] = useState('')

  // Sex
  const [sex, setSex] = useState('')
  const [customSex, setCustomSex] = useState('')

  // Student toggle
  const [isStudent, setIsStudent] = useState<boolean | null>(null)

  // 2. Academic Info State (unlocks if isStudent === true)
  const [college, setCollege] = useState('')
  const [customCollege, setCustomCollege] = useState('')

  const [major, setMajor] = useState('')
  const [customMajor, setCustomMajor] = useState('')

  const [currentYear, setCurrentYear] = useState('')
  const [passingYear, setPassingYear] = useState('')

  // ──────────────────────────────────────────────────────────────────────────
  // CLUB REGISTRATION STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [clubLogo, setClubLogo] = useState<string | null>(null)
  const [clubBanner, setClubBanner] = useState<string | null>(null)
  const [cropperSrc, setCropperSrc] = useState('')
  const [showCropper, setShowCropper] = useState(false)
  const [cropperType, setCropperType] = useState<'logo' | 'banner'>('logo')
  const [clubName, setClubName] = useState('')
  const [clubCollege, setClubCollege] = useState('')
  const [clubEstYear, setClubEstYear] = useState('')
  const [clubUsername, setClubUsername] = useState('')

  // Representative Info
  const [repFirstName, setRepFirstName] = useState('')
  const [repMiddleName, setRepMiddleName] = useState('')
  const [repLastName, setRepLastName] = useState('')
  const [repDesignation, setRepDesignation] = useState('')
  const [repCustomDesignation, setRepCustomDesignation] = useState('')
  const [repEmail, setRepEmail] = useState('')
  const [repCountry, setRepCountry] = useState(COUNTRIES[0])
  const [repPhone, setRepPhone] = useState('')
  const [repUid, setRepUid] = useState('')
  const [isRepEmailAuthenticated, setIsRepEmailAuthenticated] = useState(false)
  const [isAuthenticatingRep, setIsAuthenticatingRep] = useState(false)
  const [isSubmittingClub, setIsSubmittingClub] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // Club Contact
  const [clubEmail, setClubEmail] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [clubState, setClubState] = useState('')
  const [clubAddress, setClubAddress] = useState('')
  const [clubZip, setClubZip] = useState('')

  // Map selection states & refs
  const [clubLat, setClubLat] = useState(20.5937)
  const [clubLng, setClubLng] = useState(78.9629)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [geocodingError, setGeocodingError] = useState<string | null>(null)

  const onboardingMapContainerRef = useRef<HTMLDivElement>(null)
  const onboardingMapRef = useRef<maptilersdk.Map | null>(null)

  // Social presence
  const [socialWebsite, setSocialWebsite] = useState('')
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialLinkedIn, setSocialLinkedIn] = useState('')
  const [socialYouTube, setSocialYouTube] = useState('')
  const [socialFacebook, setSocialFacebook] = useState('')
  const [socialDiscord, setSocialDiscord] = useState('')
  const [socialGitHub, setSocialGitHub] = useState('')

  // About the Club
  const [clubDescription, setClubDescription] = useState('')
  const [clubActivities, setClubActivities] = useState<string[]>([])
  const [clubCustomActivity, setClubCustomActivity] = useState('')

  // Declaration
  const [declarationChecked, setDeclarationChecked] = useState(false)

  // 3. Logic & Helpers
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [suggestionsSeed, setSuggestionsSeed] = useState(0)

  // Load from localStorage on mount
  useEffect(() => {
    const savedFullName = localStorage.getItem('isaac_fullname') || ''
    const savedEmail = localStorage.getItem('isaac_email') || ''
    const savedDob = localStorage.getItem('isaac_dob') || '' // if present from Google/Apple

    if (savedFullName) {
      const parts = savedFullName.split(' ').filter(Boolean)
      if (parts.length > 0) {
        // Sanitize name: only letters
        setFirstName(parts[0].replace(/[^a-zA-Z]/g, ''))
        if (parts.length > 2) {
          setMiddleName(parts[1].replace(/[^a-zA-Z]/g, ''))
          setLastName(parts.slice(2).join('').replace(/[^a-zA-Z]/g, ''))
        } else if (parts.length === 2) {
          setLastName(parts[1].replace(/[^a-zA-Z]/g, ''))
        }
      }
    }

    if (savedEmail) {
      setEmail(savedEmail)
      setIsEmailReadOnly(true)
    }

    if (savedDob) {
      setDob(savedDob)
      setIsDobReadOnly(true)
    }
  }, [])

  // Map initialization and geolocation handler
  useEffect(() => {
    if (role !== 'club' || !onboardingMapContainerRef.current) {
      if (onboardingMapRef.current) {
        onboardingMapRef.current.remove()
        onboardingMapRef.current = null
      }
      return
    }

    if (onboardingMapRef.current) return

    try {
      const apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY'
      maptilersdk.config.apiKey = apiKey

      const map = new maptilersdk.Map({
        container: onboardingMapContainerRef.current,
        style: maptilersdk.MapStyle.STREETS.DARK,
        center: [78.9629, 20.5937],
        zoom: 4.5,
        minZoom: 2,
        maxZoom: 18,
        navigationControl: false,
        geolocateControl: false,
      })

      onboardingMapRef.current = map

      const geolocate = new maptilersdk.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: false
      })
      const nav = new maptilersdk.NavigationControl({ showCompass: false })

      map.addControl(geolocate, 'bottom-right')
      map.addControl(nav, 'bottom-right')

      // Listen to map moveend to reverse-geocode coordinates under center pin
      map.on('moveend', () => {
        const center = map.getCenter()
        setClubLat(center.lat)
        setClubLng(center.lng)

        setIsResolvingAddress(true)
        setGeocodingError(null)

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'isaac-website-onboarding'
          }
        })
          .then(res => {
            if (!res.ok) throw new Error("Network response error")
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
            console.error("Reverse geocoding failed:", err)
            setGeocodingError("Failed to fetch address. Please fill fields manually.")
            setToast({ message: "Failed to fetch address. Please fill fields manually.", type: "info" })
          })
          .finally(() => {
            setIsResolvingAddress(false)
          })
      })

      // Fix map rendering sizes inside flexbox / hidden tabs
      setTimeout(() => {
        if (onboardingMapRef.current) onboardingMapRef.current.resize()
      }, 300)

    } catch (err) {
      console.error("Failed to initialize onboarding map:", err)
      setToast({ message: "Could not initialize Map. Please enter your coordinates manually.", type: "error" })
    }

    return () => {
      if (onboardingMapRef.current) {
        onboardingMapRef.current.remove()
        onboardingMapRef.current = null
      }
    }
  }, [role])

  // Sync WhatsApp number if checked
  useEffect(() => {
    if (isWhatsAppSame) {
      setSelectedWaCountry(selectedCountry)
      setRawWhatsApp(rawContact)
    }
  }, [isWhatsAppSame, selectedCountry, rawContact])



  // Dynamic Username Validation & Suggestion Generator
  useEffect(() => {
    const user = rawUsername.trim().toLowerCase()
    if (!user) {
      setUsernameSuggestions([])
      setErrors(prev => {
        const next = { ...prev }
        delete next.username
        return next
      })
      return
    }

    // Standard character check runs instantly to give immediate typing feedback
    if (!/^[a-z0-9._]+$/.test(user)) {
      setErrors(prev => ({ ...prev, username: 'Allowed: lowercase, numbers, periods, underscores.' }))
      generateSuggestions()
      return
    }

    // Start debounce timer for uniqueness / claim checks
    const timer = setTimeout(() => {
      const taken = TAKEN_USERNAMES.includes(user)
      let usernameErrorStr = ''

      if (taken) {
        usernameErrorStr = 'This username is already claimed.'
      } else if (user.length < 3 || user.length > 10) {
        usernameErrorStr = 'Username must be between 3 and 10 characters.'
      } else if (user.startsWith('.') || user.endsWith('.')) {
        usernameErrorStr = 'Cannot start or end with a period.'
      } else if (/\.\./.test(user)) {
        usernameErrorStr = 'Cannot contain consecutive periods.'
      }

      if (usernameErrorStr) {
        setErrors(prev => ({ ...prev, username: usernameErrorStr }))
        generateSuggestions()
      } else {
        // Clear username error and suggestions if available
        setErrors(prev => {
          const next = { ...prev }
          delete next.username
          return next
        })
        setUsernameSuggestions([]) // ONLY show suggestions if taken/invalid!
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [rawUsername, firstName, lastName, suggestionsSeed])

  const generateSuggestions = () => {
    const base = (firstName || 'stargazer').toLowerCase().substring(0, 6)
    const lastBase = (lastName || '').toLowerCase().substring(0, 4)

    // Seed-based randomizer
    const seeds = [
      `${base}_${lastBase || 'sky'}`,
      `${base}${lastBase ? '.' + lastBase : '42'}`,
      `${base}${10 + (suggestionsSeed % 90)}`,
      `cosmo_${base}`.substring(0, 10),
      `nebula_${base}`.substring(0, 10),
      `sky_${base}`.substring(0, 10),
    ]

    // Choose 3 unique suggestions based on suggestionsSeed index
    const uniqueList: string[] = []
    let idx = suggestionsSeed % seeds.length
    while (uniqueList.length < 3) {
      const suggestion = seeds[idx].toLowerCase().substring(0, 10)
      if (!uniqueList.includes(suggestion) && !TAKEN_USERNAMES.includes(suggestion) && suggestion !== rawUsername) {
        uniqueList.push(suggestion)
      }
      idx = (idx + 1) % seeds.length
    }
    setUsernameSuggestions(uniqueList)
  }

  // Name filters (only allow letters on key down / change)
  const handleNameChange = (val: string, setter: (s: string) => void) => {
    const clean = val.replace(/[^a-zA-Z]/g, '')
    setter(clean)
  }

  // Username Input filter
  const handleUsernameChange = (val: string) => {
    // Only allow lowercase, numbers, period, underscore. Remove @ or anything else.
    const clean = val.toLowerCase().replace(/[^a-z0-9._]/g, '')
    setRawUsername(clean)
  }



  // Contact number changes
  const handleContactChange = (val: string, country: typeof COUNTRIES[0], setter: (s: string) => void) => {
    const cleanDigits = val.replace(/\D/g, '').substring(0, country.length)

    // Apply country format
    let formatted = ''
    let cleanIdx = 0
    const format = country.format
    for (let i = 0; i < format.length; i++) {
      if (cleanIdx >= cleanDigits.length) break
      if (format[i] === 'X') {
        formatted += cleanDigits[cleanIdx++]
      } else {
        formatted += format[i]
      }
    }
    setter(formatted)
  }

  const calculateAge = (dobString: string) => {
    const parts = dobString.split('/')
    if (parts.length !== 3) return 0
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 0

    const dobDate = new Date(year, month, day)
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const m = today.getMonth() - dobDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--
    }
    return age
  }

  // Form Validation per step
  const validatePersonal = () => {
    const newErrors: { [key: string]: string } = {}

    if (!firstName.trim()) newErrors.firstName = 'First Name is required.'
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required.'

    // Username validation
    const usernameClean = rawUsername.trim()
    if (!usernameClean) {
      newErrors.username = 'Username is required.'
    } else if (usernameClean.length < 3 || usernameClean.length > 10) {
      newErrors.username = 'Username must be between 3 and 10 characters.'
    } else if (usernameClean.startsWith('.') || usernameClean.endsWith('.')) {
      newErrors.username = 'Username cannot start or end with a period.'
    } else if (/\.\./.test(usernameClean)) {
      newErrors.username = 'Username cannot contain consecutive periods.'
    } else if (TAKEN_USERNAMES.includes(usernameClean)) {
      newErrors.username = 'This username is already claimed.'
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'E-mail address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid e-mail address.'
    }

    // DOB validation
    if (!dob) {
      newErrors.dob = 'Date of birth is required.'
    } else {
      const parts = dob.split('/')
      if (parts.length !== 3 || dob.length !== 10) {
        newErrors.dob = 'Please enter date in DD/MM/YYYY format.'
      } else {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        const year = parseInt(parts[2], 10)
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1920 || year > new Date().getFullYear()) {
          newErrors.dob = 'Please enter a valid date.'
        } else {
          const age = calculateAge(dob)
          if (age < 14) {
            newErrors.dob = 'Access restricted: You must be at least 14 years old.'
          }
        }
      }
    }

    // Contact and WhatsApp validation
    const contactLen = rawContact.replace(/\D/g, '').length
    if (contactLen < selectedCountry.length) {
      newErrors.contact = `Contact number must be ${selectedCountry.length} digits.`
    }

    const waLen = rawWhatsApp.replace(/\D/g, '').length
    if (waLen < selectedWaCountry.length) {
      newErrors.whatsapp = `WhatsApp number must be ${selectedWaCountry.length} digits.`
    }

    // Sex validation
    if (!sex) {
      newErrors.sex = 'Sex is a mandatory field.'
    } else if (sex === 'Other' && !customSex.trim()) {
      newErrors.sex = 'Please specify your sex.'
    }

    // Student selection check
    if (isStudent === null) {
      newErrors.isStudent = 'Please select if you are a student.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateAcademic = () => {
    const newErrors: { [key: string]: string } = {}

    if (!college) {
      newErrors.college = 'College selection is required.'
    } else if (college === 'Other' && !customCollege.trim()) {
      newErrors.college = 'Please specify your college name.'
    }

    if (!major) {
      newErrors.major = 'Major selection is required.'
    } else if (major === 'Other' && !customMajor.trim()) {
      newErrors.major = 'Please specify your major.'
    }

    if (!currentYear) {
      newErrors.currentYear = 'Current Academic Year is required.'
    }

    if (!passingYear) {
      newErrors.passingYear = 'Passing year is required.'
    } else {
      const year = parseInt(passingYear, 10)
      const currentCalendarYear = new Date().getFullYear()
      if (year < currentCalendarYear) {
        newErrors.passingYear = 'Graduation year cannot be in the past for active students. Set "Student" to "No" instead.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateClubForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Club Information
    if (!clubLogo) newErrors.clubLogo = 'Club logo is required.'
    if (!clubName.trim()) newErrors.clubName = 'Club name is required.'
    if (!clubCollege.trim()) newErrors.clubCollege = 'College / Institution name is required.'

    // Username validation
    const usernameClean = clubUsername.trim()
    if (!usernameClean) {
      newErrors.clubUsername = 'Club username is required.'
    } else if (usernameClean.length < 3 || usernameClean.length > 15) {
      newErrors.clubUsername = 'Username must be between 3 and 15 characters.'
    } else if (usernameClean.startsWith('.') || usernameClean.endsWith('.')) {
      newErrors.clubUsername = 'Username cannot start or end with a period.'
    } else if (/\.\./.test(usernameClean)) {
      newErrors.clubUsername = 'Username cannot contain consecutive periods.'
    } else if (TAKEN_USERNAMES.includes(usernameClean)) {
      newErrors.clubUsername = 'This username is already claimed.'
    }

    // Representative
    if (!repFirstName.trim()) newErrors.repFirstName = 'First name is required.'
    if (!repLastName.trim()) newErrors.repLastName = 'Last name is required.'
    if (!repDesignation) {
      newErrors.repDesignation = 'Designation is required.'
    } else if (repDesignation === 'Other' && !repCustomDesignation.trim()) {
      newErrors.repCustomDesignation = 'Please specify designation.'
    }

    if (!repEmail.trim()) {
      newErrors.repEmail = 'Representative email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repEmail.trim())) {
      newErrors.repEmail = 'Invalid email address format.'
    } else if (!isRepEmailAuthenticated || !repUid) {
      newErrors.repEmail = 'Please link Google Account by clicking this field.'
    }

    if (!repPhone.trim()) {
      newErrors.repPhone = 'Phone number is required.'
    } else if (repPhone.replace(/\D/g, '').length !== repCountry.length) {
      newErrors.repPhone = `Phone number must be ${repCountry.length} digits.`
    }

    // Contact Information
    if (!clubEmail.trim()) {
      newErrors.clubEmail = 'Official club email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clubEmail.trim())) {
      newErrors.clubEmail = 'Invalid email address format.'
    }

    if (!clubCity.trim()) newErrors.clubCity = 'City is required.'
    if (!clubState) newErrors.clubState = 'State is required.'

    // About the Club
    if (!clubDescription.trim()) {
      newErrors.clubDescription = 'Description is required.'
    } else {
      const words = clubDescription.trim().split(/\s+/).length
      if (words < 10) {
        newErrors.clubDescription = 'Please write a brief description (at least 10 words).'
      }
    }

    if (clubActivities.length === 0) {
      newErrors.clubActivities = 'Select at least one activity.'
    } else if (clubActivities.includes('Other') && !clubCustomActivity.trim()) {
      newErrors.clubCustomActivity = 'Please specify other activities.'
    }

    // Verification / Declaration
    if (!declarationChecked) newErrors.declarationChecked = 'Declaration checkbox must be checked.'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRepEmailClick = async () => {
    if (isRepEmailAuthenticated || isAuthenticatingRep) return
    setIsAuthenticatingRep(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      if (user && user.email) {
        setRepEmail(user.email)
        setRepUid(user.uid)
        setIsRepEmailAuthenticated(true)
        setErrors((prev) => {
          const next = { ...prev }
          delete next.repEmail
          return next
        })
      }
    } catch (err: any) {
      console.error('Google Auth Popup Error:', err)
      let errMsg = 'Google Authentication failed. Please try again.'
      if (err?.code === 'auth/popup-blocked') {
        errMsg = 'Popup blocked by browser. Please enable popups and try again.'
      } else if (err?.code === 'auth/popup-closed-by-user') {
        errMsg = 'Sign-in window closed. Please try again.'
      } else if (err?.code === 'auth/cancelled-popup-request') {
        return
      }
      setErrors((prev) => ({ ...prev, repEmail: errMsg }))
    } finally {
      setIsAuthenticatingRep(false)
    }
  }

  const handleClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateClubForm()) {
      setIsSubmittingClub(true)
      try {
        let logoUrl = ''
        let bannerUrl = ''

        // 1. Upload Logo to Firebase Storage if it's a data URL
        if (clubLogo && clubLogo.startsWith('data:')) {
          const logoRef = ref(storage, `clubs/${repUid}/logo.png`)
          await uploadString(logoRef, clubLogo, 'data_url')
          logoUrl = await getDownloadURL(logoRef)
        } else if (clubLogo) {
          logoUrl = clubLogo
        }

        // 2. Upload Banner to Firebase Storage if it's a data URL
        if (clubBanner && clubBanner.startsWith('data:')) {
          const bannerRef = ref(storage, `clubs/${repUid}/banner.png`)
          await uploadString(bannerRef, clubBanner, 'data_url')
          bannerUrl = await getDownloadURL(bannerRef)
        } else if (clubBanner) {
          bannerUrl = clubBanner
        }

        // 3. Save to Firestore with download URLs
        await setDoc(doc(db, 'clubs', repUid), {
          id: repUid,
          username: clubUsername.trim().toLowerCase(),
          clubName: clubName.trim(),
          institution: clubCollege.trim(),
          shortName: clubName.trim(),
          city: clubCity.trim(),
          state: clubState,
          country: repCountry.name || 'India',
          latitude: Number(clubLat) || 0,
          longitude: Number(clubLng) || 0,
          verified: false,
          estYear: clubEstYear,
          logo: logoUrl,
          banner: bannerUrl,
          description: clubDescription.trim(),
          activities: clubActivities,
          customActivity: clubCustomActivity.trim(),
          clubEmail: clubEmail.trim(),
          address: clubAddress.trim(),
          zipCode: clubZip.trim(),
          website: socialWebsite.trim(),
          instagram: socialInstagram.trim(),
          linkedin: socialLinkedIn.trim(),
          youtube: socialYouTube.trim(),
          facebook: socialFacebook.trim(),
          discord: socialDiscord.trim(),
          github: socialGitHub.trim(),
          repFirstName: repFirstName.trim(),
          repMiddleName: repMiddleName.trim(),
          repLastName: repLastName.trim(),
          repDesignation: repDesignation,
          repCustomDesignation: repCustomDesignation.trim(),
          repEmail: repEmail.trim(),
          repPhone: repPhone,
          createdAt: new Date().toISOString(),
        })

        sessionStorage.setItem('isaac_reg_success_msg', `REGISTRATION SUCCESSFUL! Sign in with your email (${repEmail}) and your 10-digit phone number as password.`)

        // Clear local storage and redirect to Login Gateway
        localStorage.clear()
        window.history.pushState(null, '', '/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (err: any) {
        console.error('Registration error:', err)
        setToast({ message: 'Failed to register club on Firestore database. Please check connection and try again.', type: 'error' })
      } finally {
        setIsSubmittingClub(false)
      }
    }
  }

  const handleNextStep = () => {
    if (validatePersonal()) {
      if (isStudent) {
        setActiveTab('academic')
      } else {
        submitOnboarding()
      }
    }
  }

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isStudent) {
      if (validateAcademic()) {
        submitOnboarding()
      }
    } else {
      if (validatePersonal()) {
        submitOnboarding()
      }
    }
  }

  const submitOnboarding = () => {
    // Collect profile data
    const finalUsername = rawUsername.trim().toLowerCase()

    localStorage.setItem('isaac_username', finalUsername)
    localStorage.setItem('isaac_firstname', firstName)
    localStorage.setItem('isaac_middlename', middleName)
    localStorage.setItem('isaac_lastname', lastName)
    localStorage.setItem('isaac_email', email)
    localStorage.setItem('isaac_dob', dob)
    localStorage.setItem('isaac_contact', `${selectedCountry.code} ${rawContact}`)
    localStorage.setItem('isaac_whatsapp', `${selectedWaCountry.code} ${rawWhatsApp}`)
    localStorage.setItem('isaac_sex', sex === 'Other' ? customSex : sex)
    localStorage.setItem('isaac_is_student', String(isStudent))

    if (isStudent) {
      localStorage.setItem('isaac_college', college === 'Other' ? customCollege : college)
      localStorage.setItem('isaac_major', major === 'Other' ? customMajor : major)
      localStorage.setItem('isaac_current_year', currentYear)
      localStorage.setItem('isaac_passing_year', passingYear)
    }

    localStorage.setItem('isaac_onboarded', 'true')
    onComplete(finalUsername)
  }

  // Year list starting from current year
  const startYear = new Date().getFullYear()
  const sensibleYears = Array.from({ length: 8 }, (_, i) => String(startYear + i))

  if (role === null) {
    return (
      <div className="onboarding-page-container">
        <div className="onboarding-glass-card gateway-card">
          <div className="gateway-header">
            <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="gateway-logo" />
            <h2 className="gateway-title">JOIN THE NETWORK</h2>
            <p className="gateway-subtitle">Select your registration track to initiate credentials</p>
          </div>

          <div className="gateway-options">
            <button
              type="button"
              className="gateway-option-card"
              onClick={() => handleSelectRole('user')}
            >
              <div className="gateway-icon-container">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                  <path d="M12 6a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4z" />
                  <circle cx="12" cy="10" r="1.5" />
                </svg>
              </div>
              <h3 className="gateway-card-title">USER PROFILE</h3>
              <p className="gateway-card-desc">For students, educators, astrophotographers, and individual astronomy enthusiasts.</p>
              <div className="gateway-card-arrow">INITIATE SIGNUP &rarr;</div>
            </button>

            <button
              type="button"
              className="gateway-option-card"
              onClick={() => handleSelectRole('club')}
            >
              <div className="gateway-icon-container">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="gateway-card-title">CLUB REGISTRATION</h3>
              <p className="gateway-card-desc">For official institutional clubs, regional societies, and independent observation groups.</p>
              <div className="gateway-card-arrow">REGISTER CLUB &rarr;</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (role === 'club') {
    return (
      <div className="onboarding-page-container club-registration-layout">
        <div className="onboarding-glass-card club-registration-card">
          <form className="onboarding-form club-form" onSubmit={handleClubSubmit}>
            {/* Unified LinkedIn-style Header Upload Zone */}
            <div 
              className="form-header-upload-zone"
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = () => {
                    setCropperSrc(reader.result as string)
                    setCropperType('banner')
                    setShowCropper(true)
                  }
                  reader.readAsDataURL(file)
                }
              }}
            >
              {/* Banner Area */}
              <div 
                className="form-banner-zone"
                onClick={() => {
                  document.getElementById('banner-file-input')?.click()
                }}
              >
                {clubBanner ? (
                  <img src={clubBanner} alt="Club Banner" className="form-banner-img" />
                ) : (
                  <div className="form-banner-placeholder">
                    <span className="banner-upload-text">Drag and drop files here to upload or click to select</span>
                  </div>
                )}
                <input 
                  type="file" 
                  id="banner-file-input" 
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

              {/* Horizontal Dashed Divider Line */}
              <div className="form-header-divider"></div>

              {/* Avatar Logo Circle */}
              <div 
                className={`form-logo-zone ${errors.clubLogo ? 'error-border' : ''}`}
                onClick={(e) => {
                  e.stopPropagation() // Prevent triggering the banner upload
                  document.getElementById('logo-file-input')?.click()
                }}
              >
                {clubLogo ? (
                  <img src={clubLogo} alt="Club Logo" className="form-logo-img" />
                ) : (
                  <div className="form-logo-placeholder">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#ffffff" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                )}
                <input 
                  type="file" 
                  id="logo-file-input" 
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
            </div>
            {errors.clubLogo && <div className="field-error-text" style={{ marginTop: '-40px', marginBottom: '24px', marginLeft: '48px' }}>{errors.clubLogo}</div>}

            <div className="club-form-inner-body">
              {/* ──────── SECTION 1: CLUB INFORMATION ──────── */}
              <div className="club-section-divider">
                <span className="divider-num">01</span>
                <span className="divider-label">CLUB INFORMATION</span>
              </div>



            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">CLUB NAME *</label>
                <input
                  type="text"
                  className={`form-input ${errors.clubName ? 'error-border' : ''}`}
                  placeholder="e.g. Polaris Astronomy Club"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                />
                {errors.clubName && <span className="field-error-text">{errors.clubName}</span>}
              </div>

              <div className="form-group flex-1">
                <label className="form-label">COLLEGE / INSTITUTION NAME *</label>
                <input
                  type="text"
                  className={`form-input ${errors.clubCollege ? 'error-border' : ''}`}
                  placeholder="e.g. IIT Bombay"
                  value={clubCollege}
                  onChange={(e) => setClubCollege(e.target.value)}
                />
                {errors.clubCollege && <span className="field-error-text">{errors.clubCollege}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">YEAR ESTABLISHED</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 2021"
                  min="1800"
                  max="2100"
                  value={clubEstYear}
                  onChange={(e) => setClubEstYear(e.target.value)}
                />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">CLUB USERNAME *</label>
                <div className={`username-input-wrapper ${errors.clubUsername ? 'error-border' : ''}`}>
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    className="form-input username-field"
                    placeholder="e.g. polaris_astro"
                    value={clubUsername}
                    onChange={(e) => setClubUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  />
                </div>
                {errors.clubUsername && <span className="field-error-text">{errors.clubUsername}</span>}
              </div>
            </div>

            {/* ──────── SECTION 2: CLUB REPRESENTATIVE ──────── */}
            <div className="club-section-divider">
              <span className="divider-num">02</span>
              <span className="divider-label">CLUB REPRESENTATIVE</span>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">FIRST NAME *</label>
                <input
                  type="text"
                  className={`form-input ${errors.repFirstName ? 'error-border' : ''}`}
                  placeholder="Carl"
                  value={repFirstName}
                  onChange={(e) => setRepFirstName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                />
                {errors.repFirstName && <span className="field-error-text">{errors.repFirstName}</span>}
              </div>

              <div className="form-group flex-1">
                <label className="form-label">MIDDLE NAME</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Edward"
                  value={repMiddleName}
                  onChange={(e) => setRepMiddleName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                />
              </div>

              <div className="form-group flex-1">
                <label className="form-label">LAST NAME *</label>
                <input
                  type="text"
                  className={`form-input ${errors.repLastName ? 'error-border' : ''}`}
                  placeholder="Sagan"
                  value={repLastName}
                  onChange={(e) => setRepLastName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                />
                {errors.repLastName && <span className="field-error-text">{errors.repLastName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">DESIGNATION *</label>
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
                {errors.repDesignation && <span className="field-error-text">{errors.repDesignation}</span>}
              </div>

              {repDesignation === 'Other' && (
                <div className="form-group flex-1 animate-slide-down">
                  <label className="form-label">SPECIFY DESIGNATION *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Lead Observer"
                    value={repCustomDesignation}
                    onChange={(e) => setRepCustomDesignation(e.target.value)}
                    required
                  />
                  {errors.repCustomDesignation && <span className="field-error-text">{errors.repCustomDesignation}</span>}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">EMAIL ADDRESS *</label>
                {!isRepEmailAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleRepEmailClick}
                    disabled={isAuthenticatingRep}
                    className={`google-auth-btn ${errors.repEmail ? 'error-border' : ''}`}
                  >
                    <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    {isAuthenticatingRep ? 'Connecting Google Account...' : 'Continue with Google'}
                  </button>
                ) : (
                  <div className="authenticated-email-display">
                    <span className="email-value">{repEmail}</span>
                    <span className="verified-badge">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Verified
                    </span>
                  </div>
                )}
                {errors.repEmail && <span className="field-error-text">{errors.repEmail}</span>}
              </div>

              <div className="form-group flex-1">
                <label className="form-label">PHONE NUMBER *</label>
                <div className="phone-input-row">
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
                    className={`form-input phone-number-field ${errors.repPhone ? 'error-border' : ''}`}
                    placeholder={repCountry.format}
                    value={repPhone}
                    onChange={(e) => setRepPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                {errors.repPhone && <span className="field-error-text">{errors.repPhone}</span>}
              </div>
            </div>

            {/* ──────── SECTION 3: CLUB CONTACT INFORMATION ──────── */}
            <div className="club-section-divider">
              <span className="divider-num">03</span>
              <span className="divider-label">CLUB CONTACT INFORMATION</span>
            </div>

            {/* Map Selection Zone */}
            <div className="onboarding-map-group">
              <label className="form-label">SELECT CLUB LOCATION ON MAP *</label>
              <div className="onboarding-map-wrapper">
                <div ref={onboardingMapContainerRef} className="onboarding-map-container" />
                
                {/* Fixed center pin */}
                <div className="onboarding-map-center-pin">
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" className="pin-icon">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <div className="pin-pulse" />
                </div>

                {/* Status Overlay */}
                <div className="onboarding-map-status-overlay">
                  {isResolvingAddress ? (
                    <div className="status-resolving">
                      <div className="status-spinner" />
                      <span>Resolving address...</span>
                    </div>
                  ) : geocodingError ? (
                    <span className="status-error">{geocodingError}</span>
                  ) : clubCity || clubState ? (
                    <span className="status-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{[clubCity, clubState].filter(Boolean).join(', ')}</span>
                    </span>
                  ) : (
                    <span>Drag map to set exact club location</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">OFFICIAL CLUB EMAIL *</label>
                <input
                  type="email"
                  className={`form-input ${errors.clubEmail ? 'error-border' : ''}`}
                  placeholder="club@institution.edu"
                  value={clubEmail}
                  onChange={(e) => setClubEmail(e.target.value)}
                />
                {errors.clubEmail && <span className="field-error-text">{errors.clubEmail}</span>}
              </div>

              <div className="form-group flex-1">
                <label className="form-label">ZIP / PIN CODE</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 400076"
                  value={clubZip}
                  onChange={(e) => setClubZip(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">CITY *</label>
                <input
                  type="text"
                  className={`form-input ${errors.clubCity ? 'error-border' : ''}`}
                  placeholder="e.g. Mumbai"
                  value={clubCity}
                  onChange={(e) => setClubCity(e.target.value)}
                />
                {errors.clubCity && <span className="field-error-text">{errors.clubCity}</span>}
              </div>

              <div className="form-group flex-1">
                <label className="form-label">STATE *</label>
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
                {errors.clubState && <span className="field-error-text">{errors.clubState}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">POSTAL ADDRESS</label>
              <textarea
                className="form-input textarea-field"
                rows={2}
                placeholder="Official mailing address..."
                value={clubAddress}
                onChange={(e) => setClubAddress(e.target.value)}
              />
            </div>

            {/* ──────── SECTION 4: SOCIAL PRESENCE ──────── */}
            <div className="club-section-divider">
              <span className="divider-num">04</span>
              <span className="divider-label">SOCIAL PRESENCE (OPTIONAL)</span>
            </div>

            <div className="social-links-grid">
              <div className="form-group">
                <label className="form-label">WEBSITE</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="https://..."
                  value={socialWebsite}
                  onChange={(e) => setSocialWebsite(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">INSTAGRAM</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="e.g. stargazers_society"
                  value={socialInstagram}
                  onChange={(e) => setSocialInstagram(parseSocialUsername(e.target.value, 'instagram'))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LINKEDIN</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="e.g. stargazers-society"
                  value={socialLinkedIn}
                  onChange={(e) => setSocialLinkedIn(parseSocialUsername(e.target.value, 'linkedin'))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">YOUTUBE</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="e.g. stargazers_society"
                  value={socialYouTube}
                  onChange={(e) => setSocialYouTube(parseSocialUsername(e.target.value, 'youtube'))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">FACEBOOK</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="e.g. stargazers.society"
                  value={socialFacebook}
                  onChange={(e) => setSocialFacebook(parseSocialUsername(e.target.value, 'facebook'))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">DISCORD</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="e.g. invite_code"
                  value={socialDiscord}
                  onChange={(e) => setSocialDiscord(parseSocialUsername(e.target.value, 'discord'))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GITHUB</label>
                <input
                  type="text"
                  className="form-input social-input"
                  placeholder="e.g. stargazers-society"
                  value={socialGitHub}
                  onChange={(e) => setSocialGitHub(parseSocialUsername(e.target.value, 'github'))}
                />
              </div>
            </div>

            {/* ──────── SECTION 5: ABOUT THE CLUB ──────── */}
            <div className="club-section-divider">
              <span className="divider-num">05</span>
              <span className="divider-label">ABOUT THE CLUB</span>
            </div>

            <div className="form-group">
              <label className="form-label">SHORT DESCRIPTION *</label>
              <textarea
                className={`form-input textarea-field ${errors.clubDescription ? 'error-border' : ''}`}
                rows={3}
                placeholder="2-4 lines introducing the club, its mission, and its environment..."
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
              />
              {errors.clubDescription && <span className="field-error-text">{errors.clubDescription}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">PRIMARY ACTIVITIES *</label>
              <div className="activities-checkbox-grid">
                {[
                  'Stargazing', 'Astrophotography', 'Rocketry', 'Satellite Development',
                  'Radio Astronomy', 'Workshops', 'Hackathons', 'Research',
                  'Outreach', 'Telescope Making', 'Space Technology', 'Other'
                ].map((act) => {
                  const isChecked = clubActivities.includes(act)
                  return (
                    <label key={act} className={`activity-checkbox-card ${isChecked ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleActivity(act)}
                        style={{ display: 'none' }}
                      />
                      <span className="activity-checkbox-icon">
                        {isChecked ? (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="activity-checkbox-label">{act}</span>
                    </label>
                  )
                })}
              </div>
              {errors.clubActivities && <span className="field-error-text">{errors.clubActivities}</span>}
            </div>

            {clubActivities.includes('Other') && (
              <div className="form-group animate-slide-down">
                <label className="form-label">SPECIFY OTHER ACTIVITIES *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Please specify other custom activities..."
                  value={clubCustomActivity}
                  onChange={(e) => setClubCustomActivity(e.target.value)}
                  required
                />
                {errors.clubCustomActivity && <span className="field-error-text">{errors.clubCustomActivity}</span>}
              </div>
            )}

            {/* ──────── SECTION 6: DECLARATION ──────── */}
            <div className="club-section-divider">
              <span className="divider-num">06</span>
              <span className="divider-label">DECLARATION</span>
            </div>

            <div className="form-group">
              <label className={`declaration-checkbox-label ${errors.declarationChecked ? 'error-text' : ''}`}>
                <input
                  type="checkbox"
                  checked={declarationChecked}
                  onChange={(e) => setDeclarationChecked(e.target.checked)}
                  className="declaration-native-checkbox"
                />
                <span className="declaration-text">
                  I certify that the information provided is accurate and belongs to an officially recognized astronomy or astrophysics club. *
                </span>
              </label>
              {errors.declarationChecked && <span className="field-error-text">{errors.declarationChecked}</span>}
            </div>

            {/* Actions */}
            <div className="form-action-row" style={{ marginTop: '30px', gap: '16px' }}>
              <button
                type="button"
                className="onboarding-back-btn"
                onClick={() => {
                  window.history.pushState(null, '', '/onboarding')
                  setRole(null)
                }}
              >
                &larr; Switch Track
              </button>
              <button
                type="submit"
                className="onboarding-submit-btn launcher-btn"
                style={{ flex: 1 }}
                disabled={isSubmittingClub}
              >
                {isSubmittingClub ? 'REGISTERING CLUB...' : 'REGISTER CLUB'}
              </button>
            </div>
          </div>
        </form>
        </div>

        <div className="onboarding-glass-card club-info-side-card">
          <div className="club-preview-banner">
            {clubBanner && (
              <img src={clubBanner} alt="Club Banner Preview" className="club-preview-banner-img" />
            )}
          </div>
          <div className="club-preview-avatar-row">
            <div className="club-preview-avatar-circle">
              {clubLogo ? (
                <img src={clubLogo} alt="Club Logo Preview" className="club-preview-avatar-img" />
              ) : (
                <div className="club-preview-avatar-fallback">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                    <path d="M12 6a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="club-preview-socials">
              {socialWebsite && (
                <a href={socialWebsite} target="_blank" rel="noopener noreferrer" className="preview-social-link website">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </a>
              )}
              {socialInstagram && (
                <a href={getInstagramUrl(socialInstagram)} target="_blank" rel="noopener noreferrer" className="preview-social-link instagram">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              )}
              {socialLinkedIn && (
                <a href={getLinkedInUrl(socialLinkedIn)} target="_blank" rel="noopener noreferrer" className="preview-social-link linkedin">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              )}
              {socialYouTube && (
                <a href={getYouTubeUrl(socialYouTube)} target="_blank" rel="noopener noreferrer" className="preview-social-link youtube">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
                  </svg>
                </a>
              )}
              {socialFacebook && (
                <a href={getFacebookUrl(socialFacebook)} target="_blank" rel="noopener noreferrer" className="preview-social-link facebook">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              )}
              {socialDiscord && (
                <a href={getDiscordUrl(socialDiscord)} target="_blank" rel="noopener noreferrer" className="preview-social-link discord">
                  <svg viewBox="0 0 127.14 96.36" width="16" height="16" fill="currentColor" style={{ display: 'block' }}>
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.5,2.92-2.3a75.48,75.48,0,0,0,72.15,0c.93.8,1.92,1.57,2.92,2.3a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.53-18.83C129,54.65,123.5,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                  </svg>
                </a>
              )}
              {socialGitHub && (
                <a href={getGitHubUrl(socialGitHub)} target="_blank" rel="noopener noreferrer" className="preview-social-link github">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                </a>
              )}
            </div>
          </div>
          <div className="club-preview-info-body">
            <h3 className="club-preview-name">{clubName || 'Club Name'}</h3>
            <p className="club-preview-college">{clubCollege || 'College / Institution Name'}</p>
            {clubEstYear && (
              <p className="club-preview-established">Est. {clubEstYear}</p>
            )}
          </div>
        </div>

        {showCropper && (
          <ImageCropper
            imageSrc={cropperSrc}
            onCropComplete={(croppedImage) => {
              if (cropperType === 'logo') {
                setClubLogo(croppedImage)
              } else {
                setClubBanner(croppedImage)
              }
              setShowCropper(false)
            }}
            onCancel={() => setShowCropper(false)}
            aspect={cropperType === 'logo' ? 1 : 3.2}
            circularCrop={cropperType === 'logo'}
            title={cropperType === 'logo' ? 'ADJUST LOGO CROP' : 'ADJUST BANNER CROP'}
          />
        )}
      </div>
    )
  }

  return (
    <div className="onboarding-page-container">
      <div className="onboarding-glass-card">

        {/* Left Side: Brand Panel */}
        <div className="onboarding-left-panel">
          <div className="onboarding-header">
            <img src="/logo/ISAAC logo.png" alt="ISAAC Logo" className="onboarding-logo" />
            <h2 className="onboarding-title">Initialize User Profile</h2>
            <p className="onboarding-subtitle">Configure your coordinate keys to access the synergy network</p>
          </div>

          {/* Steps Nav indicator */}
          <div className="onboarding-steps-indicator">
            <button
              className={`step-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
              type="button"
            >
              <span className="step-num">01</span> Personal Details
            </button>
            {isStudent && (
              <button
                className={`step-btn ${activeTab === 'academic' ? 'active' : ''}`}
                onClick={() => setActiveTab('academic')}
                type="button"
              >
                <span className="step-num">02</span> Academic Profile
              </button>
            )}
          </div>

          {/* Switch track button */}
          <button
            type="button"
            className="change-track-btn"
            onClick={() => {
              window.history.pushState(null, '', '/onboarding')
              setRole(null)
            }}
          >
            &larr; Switch Track
          </button>
        </div>

        {/* Right Side: Tab Forms Panel */}
        <div className="onboarding-right-panel">
          <form className="onboarding-form" onSubmit={handleFinalSubmit}>

            {/* ──────── TABS 1: PERSONAL DETAILS ──────── */}
            {activeTab === 'personal' && (
              <div className="tab-content-wrapper">

                {/* 1. Name inputs */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">FIRST NAME *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.firstName ? 'error-border' : ''}`}
                      placeholder="Carl"
                      value={firstName}
                      onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                      required
                    />
                    {errors.firstName && <span className="field-error-text">{errors.firstName}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">MIDDLE NAME</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Middle"
                      value={middleName}
                      onChange={(e) => handleNameChange(e.target.value, setMiddleName)}
                    />
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">LAST NAME *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.lastName ? 'error-border' : ''}`}
                      placeholder="Sagan"
                      value={lastName}
                      onChange={(e) => handleNameChange(e.target.value, setLastName)}
                      required
                    />
                    {errors.lastName && <span className="field-error-text">{errors.lastName}</span>}
                  </div>
                </div>

                {/* 2. Username (Starts with @ inside input box) */}
                <div className="form-group">
                  <label className="form-label">USERNAME * (Min 3, Max 10)</label>
                  <div className={`username-input-wrapper ${errors.username ? 'error-border' : ''}`}>
                    <span className="username-prefix-at">@</span>
                    <input
                      type="text"
                      className="form-input username-field"
                      placeholder="username"
                      value={rawUsername}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      maxLength={10}
                      required
                    />
                  </div>
                  {errors.username && <span className="field-error-text">{errors.username}</span>}

                  {/* Suggestions Chips wrapper */}
                  {usernameSuggestions.length > 0 && (
                    <div className="suggestions-container">
                      <span className="suggestions-label">Suggestions:</span>
                      <div className="suggestions-chips">
                        {usernameSuggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            className="suggestion-chip"
                            onClick={() => setRawUsername(sug)}
                          >
                            @{sug}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="refresh-suggestions-btn"
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
                  <span className="field-help-text">Note: Changing your username locks the old handle for 14 days.</span>
                </div>

                {/* 3. Email & DOB */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">E-MAIL *</label>
                    <input
                      type="email"
                      className={`form-input ${errors.email ? 'error-border' : ''}`}
                      placeholder="your.email@domain.com"
                      value={email}
                      onChange={(e) => !isEmailReadOnly && setEmail(e.target.value)}
                      readOnly={isEmailReadOnly}
                      required
                    />
                    {errors.email && <span className="field-error-text">{errors.email}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">DATE OF BIRTH *</label>
                    <Calander
                      value={dob}
                      onChange={setDob}
                      readOnly={isDobReadOnly}
                      error={!!errors.dob}
                      required
                    />
                    {errors.dob && <span className="field-error-text">{errors.dob}</span>}
                  </div>
                </div>

                {/* 4. Contact Number with Country Code Dropdown */}
                <div className="form-group">
                  <label className="form-label">CONTACT NUMBER *</label>
                  <div className="phone-input-row">

                    {/* Country code Dropdown */}
                    <Dropdown
                      options={COUNTRIES}
                      value={selectedCountry}
                      onChange={(country) => {
                        setSelectedCountry(country)
                        setRawContact('')
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
                      className={`form-input phone-number-input ${errors.contact ? 'error-border' : ''}`}
                      placeholder={selectedCountry.format}
                      value={rawContact}
                      onChange={(e) => handleContactChange(e.target.value, selectedCountry, setRawContact)}
                      required
                    />
                  </div>
                  {errors.contact && <span className="field-error-text">{errors.contact}</span>}
                </div>

                {/* 5. WhatsApp Number with Same as Contact checkbox */}
                <div className="form-group">
                  <div className="label-with-checkbox-row">
                    <label className="form-label">WHATSAPP NUMBER *</label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isWhatsAppSame}
                        onChange={(e) => setIsWhatsAppSame(e.target.checked)}
                      />
                      Same as Contact?
                    </label>
                  </div>

                  <div className="phone-input-row">
                    {/* WhatsApp country selector (disabled if synced) */}
                    <Dropdown
                      options={COUNTRIES}
                      value={selectedWaCountry}
                      onChange={(country) => {
                        setSelectedWaCountry(country)
                        setRawWhatsApp('')
                      }}
                      searchable
                      searchPlaceholder="Search code..."
                      disabled={isWhatsAppSame}
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
                      className={`form-input phone-number-input ${errors.whatsapp ? 'error-border' : ''}`}
                      placeholder={selectedWaCountry.format}
                      value={rawWhatsApp}
                      onChange={(e) => handleContactChange(e.target.value, selectedWaCountry, setRawWhatsApp)}
                      readOnly={isWhatsAppSame}
                      required
                    />
                  </div>
                  {errors.whatsapp && <span className="field-error-text">{errors.whatsapp}</span>}
                </div>

                {/* 6. Sex selector */}
                <div className="form-group">
                  <label className="form-label">SEX *</label>
                  <Dropdown
                    options={['Male (Adam)', 'Female (Eve)', 'Transgender']}
                    value={sex === 'Other' ? 'Other' : sex}
                    onChange={(val) => {
                      setSex(val)
                      if (val !== 'Other') setCustomSex('')
                    }}
                    placeholder="Select Sex"
                    hasOtherOption
                    onOtherSelect={() => setSex('Other')}
                    otherLabel="Other (Please specify)"
                    getOptionLabel={(val) => val === 'Other' ? `Other (${customSex || 'Not Specified'})` : val}
                    getOptionValue={(val) => val}
                    error={!!errors.sex}
                  />

                  {sex === 'Other' && (
                    <input
                      type="text"
                      className="form-input custom-sex-field"
                      placeholder="Specify your Sex"
                      value={customSex}
                      onChange={(e) => setCustomSex(e.target.value)}
                      required
                    />
                  )}
                  {errors.sex && <span className="field-error-text">{errors.sex}</span>}
                </div>

                {/* 7. Student Question Toggle */}
                <div className="form-group student-toggle-group">
                  <label className="form-label text-center">ARE YOU A STUDENT? *</label>
                  <div className="student-toggle-buttons">
                    <button
                      type="button"
                      className={`toggle-btn yes-btn ${isStudent === true ? 'selected' : ''}`}
                      onClick={() => setIsStudent(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn no-btn ${isStudent === false ? 'selected' : ''}`}
                      onClick={() => {
                        setIsStudent(false)
                        setCollege('')
                        setMajor('')
                        setCurrentYear('')
                        setPassingYear('')
                      }}
                    >
                      No
                    </button>
                  </div>
                  {errors.isStudent && <span className="field-error-text text-center">{errors.isStudent}</span>}
                </div>

                {/* Bottom navigation */}
                <button
                  type="button"
                  className="onboarding-submit-btn flow-btn"
                  onClick={handleNextStep}
                >
                  {isStudent ? 'Proceed to Academic Info' : 'LAUNCH PROFILE'}
                </button>

              </div>
            )}


            {/* ──────── TABS 2: ACADEMIC PROFILE ──────── */}
            {activeTab === 'academic' && isStudent && (
              <div className="tab-content-wrapper">

                {/* 1. College Selector Dropdown with search */}
                <div className="form-group">
                  <label className="form-label">COLLEGE / UNIVERSITY *</label>
                  <Dropdown
                    options={PRESET_COLLEGES}
                    value={college === 'Other' ? 'Other' : college}
                    onChange={(val) => {
                      setCollege(val)
                      if (val !== 'Other') setCustomCollege('')
                    }}
                    searchable
                    searchPlaceholder="Search colleges..."
                    placeholder="Select College"
                    hasOtherOption
                    onOtherSelect={() => setCollege('Other')}
                    getOptionLabel={(val) => val === 'Other' ? `Other (${customCollege || 'Not Specified'})` : val}
                    getOptionValue={(val) => val}
                    error={!!errors.college}
                  />

                  {college === 'Other' && (
                    <input
                      type="text"
                      className="form-input custom-spec-field"
                      placeholder="Type your college name..."
                      value={customCollege}
                      onChange={(e) => setCustomCollege(e.target.value)}
                      required
                    />
                  )}
                  {errors.college && <span className="field-error-text">{errors.college}</span>}
                </div>

                {/* 2. Major Selector Dropdown with search */}
                <div className="form-group">
                  <label className="form-label">MAJOR / SPECIALIZATION *</label>
                  <Dropdown
                    options={PRESET_MAJORS as unknown as string[]}
                    value={major === 'Other' ? 'Other' : major}
                    onChange={(val) => {
                      setMajor(val)
                      if (val !== 'Other') setCustomMajor('')
                    }}
                    searchable
                    searchPlaceholder="Search majors..."
                    placeholder="Select Major"
                    hasOtherOption
                    onOtherSelect={() => setMajor('Other')}
                    getOptionLabel={(val) => val === 'Other' ? `Other (${customMajor || 'Not Specified'})` : val}
                    getOptionValue={(val) => val}
                    error={!!errors.major}
                  />

                  {major === 'Other' && (
                    <input
                      type="text"
                      className="form-input custom-spec-field"
                      placeholder="Type your major..."
                      value={customMajor}
                      onChange={(e) => setCustomMajor(e.target.value)}
                      required
                    />
                  )}
                  {errors.major && <span className="field-error-text">{errors.major}</span>}
                </div>

                {/* 3. Year fields */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">CURRENT ACADEMIC YEAR *</label>
                    <Dropdown
                      options={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Postgraduate']}
                      value={currentYear}
                      onChange={setCurrentYear}
                      placeholder="Select Year"
                      getOptionLabel={(val) => val}
                      getOptionValue={(val) => val}
                      error={!!errors.currentYear}
                    />
                    {errors.currentYear && <span className="field-error-text">{errors.currentYear}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">YEAR OF PASSING *</label>
                    <Dropdown
                      options={[String(startYear - 1), ...sensibleYears]}
                      value={passingYear}
                      onChange={setPassingYear}
                      placeholder="Select Passing Year"
                      getOptionLabel={(val) => val === String(startYear - 1) ? `${startYear - 1} (Graduate / Past)` : val}
                      getOptionValue={(val) => val}
                      error={!!errors.passingYear}
                    />
                    {errors.passingYear && <span className="field-error-text">{errors.passingYear}</span>}
                  </div>
                </div>

                {/* Smart Note for Graduate students */}
                {passingYear && parseInt(passingYear, 10) < startYear && (
                  <div className="onboarding-warning-box">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="warning-bulb-icon" style={{ marginRight: '8px', flexShrink: 0 }}>
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.1.7.9 1.3 1.6 1.5 2.5" />
                      <path d="M9 18h6M10 22h4" />
                    </svg>
                    <span>If you have already graduated, please navigate back and select "No" for "Are you a Student?". Active academic details are reserved for current college students.</span>
                  </div>
                )}

                {/* Submit button and Back button */}
                <div className="form-action-row">
                  <button
                    type="button"
                    className="onboarding-back-btn"
                    onClick={() => setActiveTab('personal')}
                  >
                    Back to Personal Info
                  </button>
                  <button
                    type="submit"
                    className="onboarding-submit-btn launcher-btn"
                    disabled={!!(passingYear && parseInt(passingYear, 10) < startYear)}
                  >
                    LAUNCH PROFILE
                  </button>
                </div>

              </div>
            )}

          </form>
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
