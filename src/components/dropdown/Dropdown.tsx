import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Dropdown.css'
interface DropdownProps<T> {
  options: T[]
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  getOptionLabel?: (option: T) => string
  getOptionValue?: (option: T) => string
  renderOption?: (option: T) => React.ReactNode
  renderTrigger?: (value: T | null) => React.ReactNode
  hasOtherOption?: boolean
  onOtherSelect?: () => void
  otherLabel?: string
  error?: boolean
  className?: string
  disabled?: boolean
}

export default function Dropdown<T>({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  searchable = false,
  searchPlaceholder = 'Search...',
  getOptionLabel = (opt) => String(opt),
  getOptionValue = (opt) => String(opt),
  renderOption,
  renderTrigger,
  hasOtherOption = false,
  onOtherSelect,
  otherLabel = 'Other (Specify Below)',
  error = false,
  className = '',
  disabled = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUpward: false })
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      
      const isCountrySelector = className.includes('country-code-selector')
      const menuWidth = isCountrySelector ? 260 : rect.width
      const menuHeight = 240 // Max height estimate
      
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow
      
      let left = rect.left
      if (left + menuWidth > window.innerWidth) {
        left = Math.max(10, rect.right - menuWidth)
      }
      if (left < 0) left = 10

      const top = openUpward 
        ? rect.top - menuHeight - 6 
        : rect.bottom + 6

      setCoords({
        top,
        left,
        width: menuWidth,
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedInsideContainer = dropdownRef.current?.contains(target)
      const clickedInsidePortal = portalRef.current?.contains(target)
      
      if (!clickedInsideContainer && !clickedInsidePortal) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter((option) => {
    if (!searchable || !searchQuery.trim()) return true
    const label = getOptionLabel(option).toLowerCase()
    return label.includes(searchQuery.toLowerCase())
  })

  const handleSelect = (option: T) => {
    if (disabled) return
    onChange(option)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleOtherClick = () => {
    if (disabled) return
    if (onOtherSelect) {
      onOtherSelect()
    }
    setIsOpen(false)
    setSearchQuery('')
  }

  const triggerText = value ? getOptionLabel(value) : placeholder

  return (
    <div 
      className={`custom-search-dropdown ${disabled ? 'disabled' : ''} ${className}`} 
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`dropdown-trigger-btn ${error ? 'error-border' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {renderTrigger ? (
          renderTrigger(value)
        ) : (
          <span>{triggerText}</span>
        )}
        <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && !disabled && createPortal(
        <div 
          ref={portalRef}
          className={`dropdown-options-list ${coords.openUpward ? 'open-upward' : ''}`}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999
          }}
        >
          {searchable && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="dropdown-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          )}
          <div className="options-scroll">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const label = getOptionLabel(option)
                const val = getOptionValue(option)
                return (
                  <button
                    key={`${val}-${index}`}
                    type="button"
                    className="option-item"
                    onClick={() => handleSelect(option)}
                  >
                    {renderOption ? renderOption(option) : label}
                  </button>
                )
              })
            ) : (
              <div className="no-options-found">No options found</div>
            )}
            
            {hasOtherOption && (
              <button
                type="button"
                className="option-item other-option"
                onClick={handleOtherClick}
              >
                {otherLabel}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
