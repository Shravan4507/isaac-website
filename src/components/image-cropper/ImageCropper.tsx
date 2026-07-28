import { useState, useRef, useEffect } from 'react'
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

const ImageCropper = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspect = 1,
  circularCrop = false,
  title = 'ADJUST CROP'
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [scale, setScale] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)
  const cropperBodyRef = useRef<HTMLDivElement>(null)

  const scaleRef = useRef<number>(1)
  scaleRef.current = scale

  useEffect(() => {
    const cropperBody = cropperBodyRef.current
    if (!cropperBody) return

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault()

      const currentScale = scaleRef.current
      const zoomStep = 0.05
      const direction = e.deltaY < 0 ? 1 : -1 // scroll up = zoom in (enlarge), scroll down = zoom out (shrink)

      let newScale = currentScale + direction * zoomStep
      if (newScale < 0.2) newScale = 0.2
      if (newScale > 5.0) newScale = 5.0

      setScale(newScale)
    }

    cropperBody.addEventListener('wheel', handleWheelEvent, { passive: false })
    return () => {
      cropperBody.removeEventListener('wheel', handleWheelEvent)
    }
  }, [])

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        width,
        height
      ),
      width,
      height
    )
    setCrop(initialCrop)
    setCompletedCrop({
      unit: 'px',
      x: (initialCrop.x / 100) * width,
      y: (initialCrop.y / 100) * height,
      width: (initialCrop.width / 100) * width,
      height: (initialCrop.height / 100) * height
    })
  }

  const handleCenterCrop = () => {
    if (!imgRef.current) return
    const { width, height } = imgRef.current
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        width,
        height
      ),
      width,
      height
    )
    setCrop(initialCrop)
    setCompletedCrop({
      unit: 'px',
      x: (initialCrop.x / 100) * width,
      y: (initialCrop.y / 100) * height,
      width: (initialCrop.width / 100) * width,
      height: (initialCrop.height / 100) * height
    })
  }

  const handleResetAll = () => {
    setScale(1)
    handleCenterCrop()
  }

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop, currentScale: number): string => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // Width and height of crop box
    const unscaledCropWidth = crop.width / currentScale
    const unscaledCropHeight = crop.height / currentScale

    canvas.width = unscaledCropWidth * scaleX
    canvas.height = unscaledCropHeight * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Fill background with dark space background
    ctx.fillStyle = '#000000ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Center offsets
    const displayCenterX = image.width / 2
    const displayCenterY = image.height / 2
    const cropDisplayOffsetX = crop.x - displayCenterX
    const cropDisplayOffsetY = crop.y - displayCenterY

    // unscaled crop coordinates
    const unscaledCropX = displayCenterX + cropDisplayOffsetX / currentScale
    const unscaledCropY = displayCenterY + cropDisplayOffsetY / currentScale

    ctx.drawImage(
      image,
      unscaledCropX * scaleX,
      unscaledCropY * scaleY,
      unscaledCropWidth * scaleX,
      unscaledCropHeight * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    return canvas.toDataURL('image/webp', 0.9)
  }

  const handleSave = () => {
    if (imgRef.current && completedCrop) {
      const croppedDataUrl = getCroppedImg(imgRef.current, completedCrop, scale)
      onCropComplete(croppedDataUrl)
    }
  }

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        <div className="cropper-body" ref={cropperBodyRef}>
          <ReactCrop
            crop={crop}
            onChange={(_: PixelCrop, percentCrop: Crop) => setCrop(percentCrop)}
            onComplete={(c: PixelCrop) => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop={circularCrop}
          >
            <img
              ref={imgRef}
              alt="Crop area"
              src={imageSrc}
              onLoad={onImageLoad}
              style={{
                maxHeight: '55vh',
                width: 'auto',
                display: 'block',
                transform: `scale(${scale})`,
                transition: 'transform 0.08s ease-out'
              }}
            />
          </ReactCrop>
        </div>

        <div className="cropper-toolbar">
          <button type="button" className="toolbar-btn" onClick={handleCenterCrop}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'block' }}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Center Crop
          </button>
          <div className="toolbar-divider"></div>
          <button type="button" className="toolbar-btn" onClick={handleResetAll}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'block' }}>
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Reset
          </button>
        </div>

        <div className="cropper-footer">
          <button className="cancel-btn" onClick={onCancel}>CANCEL</button>
          <button className="save-btn" onClick={handleSave}>APPLY CROP</button>
        </div>
      </div>
    </div>
  )
}

export default ImageCropper
