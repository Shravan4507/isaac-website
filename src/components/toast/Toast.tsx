import { useEffect, useState } from 'react'
import './Toast.css'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type = 'info', duration = 4000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300) // matches transition exit animation duration
  }

  // Handle swipe-to-dismiss gesture tracking
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      setDragOffset(Math.max(0, deltaX))
    }

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - startX
      setDragOffset(Math.max(0, deltaX))
    }

    const handleDragEnd = () => {
      setIsDragging(false)
      if (dragOffset > 100) {
        handleClose()
      } else {
        setDragOffset(0)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleDragEnd)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleDragEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleDragEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, startX, dragOffset])

  const handleDragStart = (clientX: number) => {
    setIsDragging(true)
    setStartX(clientX)
    setDragOffset(0)
  }

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#22c55e" strokeWidth="2.5" fill="none" className="toast-icon">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )
      case 'error':
        return (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" className="toast-icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#3b82f6" strokeWidth="2.5" fill="none" className="toast-icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
    }
  }

  return (
    <div
      className={`toast-wrapper ${type} ${isExiting ? 'exit' : 'enter'}`}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      style={isDragging ? {
        transform: `translateX(${dragOffset}px)`,
        opacity: Math.max(0.1, 1 - dragOffset / 250),
        transition: 'none',
        cursor: 'grabbing'
      } : {
        cursor: 'grab'
      }}
    >
      <div className="toast-content">
        {renderIcon()}
        <span className="toast-message">{message}</span>
      </div>
      <button
        className="toast-close-btn"
        onClick={handleClose}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label="Close notification"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
