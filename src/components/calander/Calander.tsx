import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Calander.css'

interface CalanderProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  error?: boolean
  placeholder?: string
  required?: boolean
  className?: string
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Calander({
  value,
  onChange,
  readOnly = false,
  error = false,
  placeholder = 'DD/MM/YYYY',
  required = false,
  className = '',
}: CalanderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280, openUpward: false })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  
  // Year grid state (start year of the 16-year block)
  const [yearGridStart, setYearGridStart] = useState(Math.floor(today.getFullYear() / 16) * 16)

  // Update year grid start whenever currentYear changes
  useEffect(() => {
    setYearGridStart(Math.floor(currentYear / 16) * 16)
  }, [currentYear])

  // Parse parent's value when it is valid to update the calendar view
  useEffect(() => {
    if (value) {
      const parts = value.split('/')
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        const y = parseInt(parts[2], 10)
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m < 12 && y > 1900) {
          setCurrentMonth(m)
          setCurrentYear(y)
        }
      }
    }
  }, [value])

  // Handle open/close animation mounting states
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsClosing(false)
      setView('days') // Reset to day view when opening
    } else if (shouldRender) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
      }, 200) // Match CSS transition duration
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close calendar on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedInsideContainer = containerRef.current?.contains(target)
      const clickedInsidePortal = portalRef.current?.contains(target)
      
      if (!clickedInsideContainer && !clickedInsidePortal) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [shouldRender])

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const calendarWidth = 280
      const calendarHeight = 310 // Height of premium calendar dropdown
      
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      const openUpward = spaceBelow < calendarHeight && spaceAbove > spaceBelow
      
      let left = rect.left
      if (left + calendarWidth > window.innerWidth) {
        left = Math.max(10, rect.right - calendarWidth)
      }
      if (left < 0) left = 10

      const top = openUpward 
        ? rect.top - calendarHeight - 6 
        : rect.bottom + 6

      setCoords({
        top,
        left,
        width: calendarWidth,
        openUpward
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener('scroll', updateCoords, true)
      window.addEventListener('resize', updateCoords)
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [isOpen])

  const handleTextChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    let formatted = ''

    if (digits.length > 0) {
      formatted += digits.substring(0, 2)
    }
    if (digits.length > 2) {
      formatted += '/' + digits.substring(2, 4)
    }
    if (digits.length > 4) {
      formatted += '/' + digits.substring(4, 8)
    }

    onChange(formatted)
  }

  const navigate = (direction: number) => {
    if (view === 'days') {
      let nextMonth = currentMonth + direction
      let nextYear = currentYear
      if (nextMonth < 0) {
        nextMonth = 11
        nextYear -= 1
      } else if (nextMonth > 11) {
        nextMonth = 0
        nextYear += 1
      }
      setCurrentMonth(nextMonth)
      setCurrentYear(nextYear)
    } else if (view === 'years') {
      setYearGridStart(prev => prev + (direction * 16))
    }
  }

  const selectDay = (dayNum: number) => {
    if (readOnly) return
    const dStr = String(dayNum).padStart(2, '0')
    const mStr = String(currentMonth + 1).padStart(2, '0')
    onChange(`${dStr}/${mStr}/${currentYear}`)
    setIsOpen(false)
  }

  const selectMonth = (monthIdx: number) => {
    setCurrentMonth(monthIdx)
    setView('days')
  }

  const selectYear = (year: number) => {
    setCurrentYear(year)
    setView('months')
  }

  const handleToday = () => {
    const dStr = String(today.getDate()).padStart(2, '0')
    const mStr = String(today.getMonth() + 1).padStart(2, '0')
    onChange(`${dStr}/${mStr}/${today.getFullYear()}`)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  // Days calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
  const daysArray = []
  
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i)
  }

  const isSelected = (dayNum: number) => {
    if (!value) return false
    const parts = value.split('/')
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      const y = parseInt(parts[2], 10)
      return d === dayNum && m === currentMonth && y === currentYear
    }
    return false
  }

  const isToday = (dayNum: number) => {
    return dayNum === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear()
  }

  const yearsArray = Array.from({ length: 16 }, (_, i) => yearGridStart + i)

  return (
    <div className={`dob-input-wrapper ${className}`} ref={containerRef}>
      <input
        type="text"
        className={`form-input dob-text-field ${error ? 'error-border' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onFocus={() => !readOnly && setIsOpen(true)}
        readOnly={readOnly}
        maxLength={10}
        required={required}
      />
      {!readOnly && (
        <button
          type="button"
          className="calendar-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      )}

      {shouldRender && !readOnly && createPortal(
        <div 
          ref={portalRef}
          className={`calendar-dropdown ${coords.openUpward ? 'open-upward' : ''} ${isClosing ? 'closing' : 'visible'}`}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999
          }}
        >
          <div className="calendar-header">
            {view !== 'months' ? (
              <button type="button" className="calendar-nav-btn" onClick={() => navigate(-1)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            ) : (
              <span className="nav-placeholder" />
            )}

            <div className="calendar-view-toggles">
              <button 
                type="button" 
                className={`calendar-view-btn ${view === 'months' ? 'active' : ''}`}
                onClick={() => setView(view === 'months' ? 'days' : 'months')}
              >
                {MONTHS[currentMonth]}
              </button>
              <button 
                type="button" 
                className={`calendar-view-btn ${view === 'years' ? 'active' : ''}`}
                onClick={() => setView(view === 'years' ? 'days' : 'years')}
              >
                {currentYear}
              </button>
            </div>

            {view !== 'months' ? (
              <button type="button" className="calendar-nav-btn" onClick={() => navigate(1)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ) : (
              <span className="nav-placeholder" />
            )}
          </div>

          <div className="calendar-body-container">
            {view === 'days' && (
              <div className="calendar-grid fade-in-grid">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="calendar-weekday">
                    {day}
                  </span>
                ))}

                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <span key={`empty-${idx}`} className="calendar-day empty" />
                  }
                  const selected = isSelected(day)
                  const current = isToday(day)
                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      className={`calendar-day ${selected ? 'selected' : ''} ${current ? 'today-indicator' : ''}`}
                      onClick={() => selectDay(day)}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            )}

            {view === 'months' && (
              <div className="calendar-months-grid fade-in-grid">
                {FULL_MONTH_NAMES.map((name, idx) => (
                  <button
                    key={name}
                    type="button"
                    className={`calendar-month-item ${idx === currentMonth ? 'selected' : ''}`}
                    onClick={() => selectMonth(idx)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {view === 'years' && (
              <div className="calendar-years-grid fade-in-grid">
                {yearsArray.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`calendar-year-item ${yr === currentYear ? 'selected' : ''}`}
                    onClick={() => selectYear(yr)}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="calendar-footer">
            <button type="button" className="calendar-footer-btn" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="calendar-footer-btn" onClick={handleToday}>
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
