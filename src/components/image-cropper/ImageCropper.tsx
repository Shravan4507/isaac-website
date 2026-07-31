import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import './ImageCropper.css'

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedImage: string) => void
  onCancel: () => void
  aspect?: number
  circularCrop?: boolean
  title?: string
}

type AspectOption = { label: string; value: number | undefined }

const ASPECT_OPTIONS: AspectOption[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '9:16', value: 9 / 16 },
  { label: '2:3', value: 2 / 3 },
]

const ImageCropper = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspect: initialAspect = 1,
  circularCrop = false,
  title = 'IMAGE CROPPER'
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 0, y: 0, width: 0, height: 0 })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [scale, setScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(initialAspect)
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'webp'>('png')
  const [outputQuality, setOutputQuality] = useState(100)

  const imgRef = useRef<HTMLImageElement>(null)
  const cropperBodyRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const mobilePreviewRef = useRef<HTMLCanvasElement>(null)

  // Mutable refs for event handlers (avoids stale closures)
  const scaleRef = useRef(1)
  scaleRef.current = scale
  const panRef = useRef({ x: 0, y: 0 })
  panRef.current = { x: panX, y: panY }
  const lastPointerRef = useRef({ x: 0, y: 0 })

  const effectiveAspect = circularCrop ? 1 : selectedAspect

  // ---------------------------------------------------------------------------
  // Interaction: Wheel zoom + Mouse drag pan + Touch pan/pinch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cropperBody = cropperBodyRef.current
    if (!cropperBody) return

    // --- Wheel = zoom ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const direction = e.deltaY < 0 ? 1 : -1
      const newScale = Math.max(0.2, Math.min(5.0, scaleRef.current + direction * 0.05))
      setScale(newScale)
    }

    // --- Mouse drag = pan ---
    let mouseDown = false

    const handleMouseDown = (e: MouseEvent) => {
      // Only left click
      if (e.button !== 0) return
      mouseDown = true
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      setIsDragging(true)
      e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDown) return
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      setPanX(prev => prev + dx)
      setPanY(prev => prev + dy)
    }

    const handleMouseUp = () => {
      mouseDown = false
      setIsDragging(false)
    }

    // --- Touch: 1 finger = pan, 2 fingers = pinch zoom ---
    let initialTouchDistance = 0
    let initialTouchScale = 1
    let touchPanActive = false

    const getTouchDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Capture phase: block ReactCrop from intercepting ANY touch
    const handleTouchCapture = (e: TouchEvent) => {
      e.stopPropagation()
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault()
        touchPanActive = false
        initialTouchDistance = getTouchDistance(e.touches)
        initialTouchScale = scaleRef.current
      } else if (e.touches.length === 1) {
        // Single finger pan
        e.preventDefault()
        touchPanActive = true
        lastPointerRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setIsDragging(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDistance > 0) {
        e.preventDefault()
        const currentDistance = getTouchDistance(e.touches)
        const ratio = currentDistance / initialTouchDistance
        setScale(Math.max(0.2, Math.min(5.0, initialTouchScale * ratio)))
      } else if (e.touches.length === 1 && touchPanActive) {
        e.preventDefault()
        const dx = e.touches[0].clientX - lastPointerRef.current.x
        const dy = e.touches[0].clientY - lastPointerRef.current.y
        lastPointerRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setPanX(prev => prev + dx)
        setPanY(prev => prev + dy)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) initialTouchDistance = 0
      if (e.touches.length === 0) {
        touchPanActive = false
        setIsDragging(false)
      }
    }

    // Attach listeners
    cropperBody.addEventListener('wheel', handleWheel, { passive: false })
    cropperBody.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    cropperBody.addEventListener('touchstart', handleTouchCapture, true)
    cropperBody.addEventListener('touchmove', handleTouchCapture, true)
    cropperBody.addEventListener('touchend', handleTouchCapture, true)
    cropperBody.addEventListener('touchstart', handleTouchStart, { passive: false })
    cropperBody.addEventListener('touchmove', handleTouchMove, { passive: false })
    cropperBody.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      cropperBody.removeEventListener('wheel', handleWheel)
      cropperBody.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      cropperBody.removeEventListener('touchstart', handleTouchCapture, true)
      cropperBody.removeEventListener('touchmove', handleTouchCapture, true)
      cropperBody.removeEventListener('touchend', handleTouchCapture, true)
      cropperBody.removeEventListener('touchstart', handleTouchStart)
      cropperBody.removeEventListener('touchmove', handleTouchMove)
      cropperBody.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key === 'Enter') { handleSave(); return }
      if (e.key === '+' || e.key === '=') { setScale(s => Math.min(5, s + 0.1)); return }
      if (e.key === '-') { setScale(s => Math.max(0.2, s - 0.1)); return }
      if (e.key === 'r' || e.key === 'R') { setRotation(r => (r + 90) % 360); return }
      if (e.key === 'g' || e.key === 'G') { setShowGrid(g => !g); return }
      if (e.key === 'h' || e.key === 'H') { setFlipH(f => !f); return }
      if (e.key === 'v' || e.key === 'V') { setFlipV(f => !f); return }
      if (e.key === '0') { handleResetAll(); return }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Fixed crop helpers — crop box is always centered, never user-adjustable
  // ---------------------------------------------------------------------------
  const computeFixedCrop = useCallback((aspect: number | undefined, w: number, h: number) => {
    const a = aspect ?? w / h
    const percentCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, a, w, h),
      w, h
    )
    setCrop(percentCrop)
    setCompletedCrop({
      unit: 'px',
      x: (percentCrop.x / 100) * w,
      y: (percentCrop.y / 100) * h,
      width: (percentCrop.width / 100) * w,
      height: (percentCrop.height / 100) * h
    })
  }, [])

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    computeFixedCrop(effectiveAspect, width, height)
  }

  const handleResetAll = useCallback(() => {
    setScale(1)
    setPanX(0)
    setPanY(0)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    if (imgRef.current) {
      computeFixedCrop(effectiveAspect, imgRef.current.width, imgRef.current.height)
    }
  }, [effectiveAspect, computeFixedCrop])

  const handleAspectChange = (opt: AspectOption) => {
    setSelectedAspect(opt.value)
    setPanX(0)
    setPanY(0)
    if (imgRef.current) {
      const a = circularCrop ? 1 : opt.value
      setTimeout(() => {
        if (imgRef.current) computeFixedCrop(a, imgRef.current.width, imgRef.current.height)
      }, 0)
    }
  }

  // ---------------------------------------------------------------------------
  // Live preview — accounts for pan offset
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const image = imgRef.current
    if (!image || !completedCrop) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const w = image.width
    const h = image.height

    // Map crop box to natural image coords accounting for pan + scale
    const natCropX = ((completedCrop.x - panX - w / 2) / scale + w / 2) * scaleX
    const natCropY = ((completedCrop.y - panY - h / 2) / scale + h / 2) * scaleY
    const natCropW = (completedCrop.width / scale) * scaleX
    const natCropH = (completedCrop.height / scale) * scaleY

    const drawPreview = (canvas: HTMLCanvasElement | null, size: number) => {
      if (!canvas) return
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, size, size)

      const fitScale = Math.min(size / natCropW, size / natCropH)
      const drawW = natCropW * fitScale
      const drawH = natCropH * fitScale
      const offsetX = (size - drawW) / 2
      const offsetY = (size - drawH) / 2

      ctx.save()
      ctx.translate(offsetX + drawW / 2, offsetY + drawH / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      ctx.translate(-(drawW / 2), -(drawH / 2))
      ctx.drawImage(image, natCropX, natCropY, natCropW, natCropH, 0, 0, drawW, drawH)
      ctx.restore()
    }

    drawPreview(previewCanvasRef.current, 120)
    drawPreview(mobilePreviewRef.current, 56)
  }, [completedCrop, scale, panX, panY, rotation, flipH, flipV])

  // ---------------------------------------------------------------------------
  // Output size
  // ---------------------------------------------------------------------------
  const outputSize = useMemo(() => {
    if (!imgRef.current || !completedCrop) return { w: 0, h: 0 }
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
    return {
      w: Math.round((completedCrop.width / scale) * scaleX),
      h: Math.round((completedCrop.height / scale) * scaleY)
    }
  }, [completedCrop, scale])

  // ---------------------------------------------------------------------------
  // Final crop export — accounts for pan offset
  // ---------------------------------------------------------------------------
  const getCroppedImg = (): string => {
    const image = imgRef.current
    if (!image || !completedCrop) return ''

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const w = image.width
    const h = image.height

    // Map crop box to natural image coords
    const natX = ((completedCrop.x - panX - w / 2) / scale + w / 2) * scaleX
    const natY = ((completedCrop.y - panY - h / 2) / scale + h / 2) * scaleY
    const natW = (completedCrop.width / scale) * scaleX
    const natH = (completedCrop.height / scale) * scaleY

    const canvas = document.createElement('canvas')
    canvas.width = natW
    canvas.height = natH

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
    ctx.drawImage(image, natX, natY, natW, natH, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
    return canvas.toDataURL(mimeMap[outputFormat], outputQuality / 100)
  }

  const handleSave = () => {
    const croppedDataUrl = getCroppedImg()
    if (croppedDataUrl) onCropComplete(croppedDataUrl)
  }

  // Image transform: translate for pan, then scale + flip + rotate
  const imgTransform = `translate(${panX}px, ${panY}px) scale(${flipH ? -scale : scale}, ${flipV ? -scale : scale}) rotate(${rotation}deg)`

  // ---------------------------------------------------------------------------
  // SVG Icons
  // ---------------------------------------------------------------------------
  const RotateLeftIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
  const RotateRightIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
  const FlipHIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M16 6l4 6-4 6M8 6l-4 6 4 6" />
    </svg>
  )
  const FlipVIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h20M6 8l6-4 6 4M6 16l6 4 6-4" />
    </svg>
  )
  const ResetIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
  const GridIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  )
  const ZoomInIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
  const ZoomOutIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )

  const content = (
    <div className="cropper-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="cropper-modal">

        {/* ========== HEADER ========== */}
        <div className="cropper-header">
          <div className="cropper-header-left">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />
            </svg>
            <h3>{title}</h3>
          </div>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        {/* ========== TOP TOOLBAR ========== */}
        <div className="cropper-top-toolbar">
          <button type="button" className="tt-btn" onClick={() => setRotation(r => (r - 90 + 360) % 360)} title="Rotate Left (R)">
            <RotateLeftIcon /><span>Rotate Left</span>
          </button>
          <button type="button" className="tt-btn" onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate Right (R)">
            <RotateRightIcon /><span>Rotate Right</span>
          </button>
          <div className="tt-divider" />
          <button type="button" className={`tt-btn ${flipH ? 'active' : ''}`} onClick={() => setFlipH(f => !f)} title="Flip Horizontal (H)">
            <FlipHIcon /><span>Flip H</span>
          </button>
          <button type="button" className={`tt-btn ${flipV ? 'active' : ''}`} onClick={() => setFlipV(f => !f)} title="Flip Vertical (V)">
            <FlipVIcon /><span>Flip V</span>
          </button>
          <div className="tt-divider" />
          <button type="button" className="tt-btn" onClick={handleResetAll} title="Reset All (0)">
            <ResetIcon /><span>Reset</span>
          </button>
        </div>

        {/* ========== MAIN BODY ========== */}
        <div className="cropper-main">

          {/* --- Aspect Ratio Sidebar (desktop) --- */}
          <div className="aspect-sidebar">
            <span className="sidebar-label">Aspect Ratio</span>
            {ASPECT_OPTIONS.map(opt => (
              <button
                key={opt.label}
                type="button"
                className={`aspect-btn ${(effectiveAspect === opt.value || (effectiveAspect === undefined && opt.value === undefined)) ? 'active' : ''}`}
                onClick={() => handleAspectChange(opt)}
                disabled={circularCrop}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* --- Center crop area --- */}
          <div className="cropper-center">
            <div
              className={`cropper-body ${showGrid ? 'show-grid' : ''} ${isDragging ? 'is-dragging' : ''}`}
              ref={cropperBodyRef}
            >
              <ReactCrop
                crop={crop}
                onChange={() => {/* locked — no-op */}}
                onComplete={() => {/* locked — no-op */}}
                aspect={effectiveAspect}
                circularCrop={circularCrop}
                locked
              >
                <img
                  ref={imgRef}
                  alt="Crop area"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  draggable={false}
                  style={{
                    maxHeight: '55vh',
                    width: 'auto',
                    display: 'block',
                    transform: imgTransform,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </ReactCrop>
            </div>

            {/* --- Bottom controls --- */}
            <div className="cropper-bottom-controls">
              {/* Zoom */}
              <div className="control-row">
                <span className="control-label">Zoom</span>
                <div className="zoom-slider-group">
                  <button type="button" className="zoom-btn" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}><ZoomOutIcon /></button>
                  <input
                    type="range"
                    className="zoom-slider"
                    min="20"
                    max="500"
                    value={Math.round(scale * 100)}
                    onChange={(e) => setScale(Number(e.target.value) / 100)}
                  />
                  <button type="button" className="zoom-btn" onClick={() => setScale(s => Math.min(5, s + 0.1))}><ZoomInIcon /></button>
                  <span className="zoom-pct">{Math.round(scale * 100)}%</span>
                </div>
              </div>

              {/* Rotation + Grid */}
              <div className="control-row">
                <div className="rotation-group">
                  <button type="button" className="rot-step-btn" onClick={() => setRotation(r => (r - 90 + 360) % 360)}>-90°</button>
                  <input
                    type="number"
                    className="rotation-input"
                    value={rotation}
                    onChange={(e) => setRotation(((Number(e.target.value) % 360) + 360) % 360)}
                    min="0"
                    max="359"
                  />
                  <button type="button" className="rot-step-btn" onClick={() => setRotation(r => (r + 90) % 360)}>+90°</button>
                </div>
                <button
                  type="button"
                  className={`grid-toggle-btn ${showGrid ? 'active' : ''}`}
                  onClick={() => setShowGrid(g => !g)}
                  title="Toggle Grid (G)"
                >
                  <GridIcon />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* --- Right Preview Panel (desktop) --- */}
          <div className="preview-panel">
            <span className="panel-label">Preview</span>
            <div className={`preview-canvas-wrap ${circularCrop ? 'circular' : ''}`}>
              <canvas ref={previewCanvasRef} className="preview-canvas" />
            </div>

            <div className="output-info">
              <span className="panel-label">Output Size</span>
              <div className="output-dims">
                <div className="dim-field"><span className="dim-label">W</span><span className="dim-value">{outputSize.w}px</span></div>
                <div className="dim-field"><span className="dim-label">H</span><span className="dim-value">{outputSize.h}px</span></div>
              </div>
            </div>

            <div className="output-settings">
              <div className="setting-field">
                <span className="setting-label">Format</span>
                <select className="setting-select" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpeg' | 'webp')}>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div className="setting-field">
                <span className="setting-label">Quality</span>
                <select className="setting-select" value={outputQuality} onChange={(e) => setOutputQuality(Number(e.target.value))}>
                  <option value={100}>100%</option>
                  <option value={90}>90%</option>
                  <option value={80}>80%</option>
                  <option value={70}>70%</option>
                  <option value={50}>50%</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ========== MOBILE: Aspect Ratio Scroller ========== */}
        <div className="mobile-aspect-bar">
          <span className="mobile-aspect-label">Aspect</span>
          <div className="mobile-aspect-scroll">
            {ASPECT_OPTIONS.map(opt => (
              <button
                key={opt.label}
                type="button"
                className={`aspect-pill ${(effectiveAspect === opt.value || (effectiveAspect === undefined && opt.value === undefined)) ? 'active' : ''}`}
                onClick={() => handleAspectChange(opt)}
                disabled={circularCrop}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========== MOBILE: Output Settings ========== */}
        <div className="mobile-output-row">
          <div className="mobile-output-field">
            <span>Format</span>
            <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpeg' | 'webp')}>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div className="mobile-output-field">
            <span>Quality</span>
            <select value={outputQuality} onChange={(e) => setOutputQuality(Number(e.target.value))}>
              <option value={100}>100%</option>
              <option value={90}>90%</option>
              <option value={80}>80%</option>
              <option value={70}>70%</option>
              <option value={50}>50%</option>
            </select>
          </div>
          <div className="mobile-preview-mini">
            <canvas ref={mobilePreviewRef} className="preview-canvas-mobile" width="56" height="56" />
          </div>
        </div>

        {/* ========== FOOTER ========== */}
        <div className="cropper-footer">
          <div className="keyboard-hints">
            <span><kbd>Esc</kbd> Cancel</span>
            <span><kbd>Enter</kbd> Apply</span>
            <span><kbd>+/-</kbd> Zoom</span>
            <span><kbd>R</kbd> Rotate</span>
            <span><kbd>G</kbd> Grid</span>
            <span><kbd>H/V</kbd> Flip</span>
            <span><kbd>0</kbd> Reset</span>
          </div>
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onCancel}>CANCEL</button>
            <button className="save-btn" onClick={handleSave}>APPLY CROP</button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default ImageCropper
