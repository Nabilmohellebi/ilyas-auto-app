import { useEffect, useRef, useState } from 'react'


function removeBorderConnectedWhiteBackground(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Le navigateur ne peut pas traiter cette image.')

  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = image
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  let tail = 0

  // Ne cible que les pixels presque blancs reliés au bord de l’image.
  // Les zones blanches enfermées dans le logo restent donc intactes.
  const isBackgroundPixel = pixel => {
    const offset = pixel * 4
    if (data[offset + 3] === 0) return false
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const darkest = Math.min(red, green, blue)
    const brightest = Math.max(red, green, blue)
    return darkest >= 220 && brightest - darkest <= 34
  }

  const addPixel = pixel => {
    if (pixel < 0 || pixel >= total || visited[pixel] || !isBackgroundPixel(pixel)) return
    visited[pixel] = 1
    queue[tail++] = pixel
  }

  for (let x = 0; x < width; x += 1) {
    addPixel(x)
    addPixel((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    addPixel(y * width)
    addPixel(y * width + width - 1)
  }

  // Parcours itératif à quatre voisins : évite de supprimer les blancs isolés.
  for (let head = 0; head < tail; head += 1) {
    const pixel = queue[head]
    const x = pixel % width
    if (x > 0) addPixel(pixel - 1)
    if (x < width - 1) addPixel(pixel + 1)
    if (pixel >= width) addPixel(pixel - width)
    if (pixel + width < total) addPixel(pixel + width)
  }

  // Rend le blanc transparent et adoucit les contours anti-crénelés.
  for (let index = 0; index < tail; index += 1) {
    const offset = queue[index] * 4
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const alpha = Math.max(0, 255 - Math.min(red, green, blue))

    if (alpha <= 3) {
      data[offset] = 0
      data[offset + 1] = 0
      data[offset + 2] = 0
      data[offset + 3] = 0
      continue
    }

    const matte = 255 - alpha
    data[offset] = Math.max(0, Math.min(255, Math.round((red - matte) * 255 / alpha)))
    data[offset + 1] = Math.max(0, Math.min(255, Math.round((green - matte) * 255 / alpha)))
    data[offset + 2] = Math.max(0, Math.min(255, Math.round((blue - matte) * 255 / alpha)))
    data[offset + 3] = Math.round(data[offset + 3] * alpha / 255)
  }

  context.putImageData(image, 0, 0)
}

function clampOffset(offset, drawWidth, drawHeight, width, height) {
  return {
    x: Math.max(width - drawWidth, Math.min(0, offset.x)),
    y: Math.max(height - drawHeight, Math.min(0, offset.y)),
  }
}

export default function ImageCropper({
  file,
  aspectRatio = 1,
  title = 'Ajuster la photo',
  outputFormat = 'image/jpeg',
  allowWhiteBackgroundRemoval = false,
  onCancel,
  onConfirm,
}) {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const dragRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [removeWhiteBackground, setRemoveWhiteBackground] = useState(Boolean(allowWhiteBackgroundRemoval))

  useEffect(() => {
    if (!file) return undefined
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    let active = true
    setReady(false)
    setError('')
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setRemoveWhiteBackground(Boolean(allowWhiteBackgroundRemoval))
    image.onload = () => {
      if (!active) return
      imageRef.current = image
      setReady(true)
    }
    image.onerror = () => {
      if (active) setError('Cette image ne peut pas être ouverte pour le recadrage.')
    }
    image.src = objectUrl
    return () => {
      active = false
      URL.revokeObjectURL(objectUrl)
      imageRef.current = null
    }
  }, [file, allowWhiteBackgroundRemoval])

  function drawCrop(canvas, targetWidth, targetHeight, currentZoom, currentOffset, transparentWhiteBackground) {
    const image = imageRef.current
    if (!image || !canvas) return null
    const context = canvas.getContext('2d')
    if (!context) return null
    const baseScale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight)
    const scale = baseScale * currentZoom
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    const clamped = clampOffset(currentOffset, drawWidth, drawHeight, targetWidth, targetHeight)
    const x = (targetWidth - drawWidth) / 2 + clamped.x
    const y = (targetHeight - drawHeight) / 2 + clamped.y
    context.clearRect(0, 0, targetWidth, targetHeight)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, x, y, drawWidth, drawHeight)
    if (transparentWhiteBackground) {
      try { removeBorderConnectedWhiteBackground(canvas) } catch (processingError) { console.warn('Aperçu de transparence indisponible :', processingError) }
    }
    return { drawWidth, drawHeight }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!ready || !canvas || !imageRef.current) return
    canvas.width = 960
    canvas.height = Math.round(960 / aspectRatio)
    drawCrop(canvas, canvas.width, canvas.height, zoom, offset, removeWhiteBackground)
  }, [ready, zoom, offset, aspectRatio, removeWhiteBackground])

  function handlePointerDown(event) {
    if (!ready) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY }
  }

  function handlePointerMove(event) {
    if (!dragRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const dx = (event.clientX - dragRef.current.x) * scaleX
    const dy = (event.clientY - dragRef.current.y) * scaleY
    dragRef.current = { x: event.clientX, y: event.clientY }
    setOffset(current => {
      const image = imageRef.current
      if (!image) return current
      const cw = canvasRef.current.width
      const ch = canvasRef.current.height
      const base = Math.max(cw / image.naturalWidth, ch / image.naturalHeight)
      const drawWidth = image.naturalWidth * base * zoom
      const drawHeight = image.naturalHeight * base * zoom
      return clampOffset({ x: current.x + dx, y: current.y + dy }, drawWidth, drawHeight, cw, ch)
    })
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleZoom(value) {
    setZoom(Number(value))
    setOffset(current => {
      const image = imageRef.current
      const canvas = canvasRef.current
      if (!image || !canvas) return current
      const base = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const drawWidth = image.naturalWidth * base * Number(value)
      const drawHeight = image.naturalHeight * base * Number(value)
      return clampOffset(current, drawWidth, drawHeight, canvas.width, canvas.height)
    })
  }

  function applyCrop() {
    const image = imageRef.current
    const preview = canvasRef.current
    if (!image || !preview || working) return
    setWorking(true)
    setError('')
    const output = document.createElement('canvas')
    output.width = 1600
    output.height = Math.round(output.width / aspectRatio)
    const ctx = output.getContext('2d')
    const base = Math.max(output.width / image.naturalWidth, output.height / image.naturalHeight)
    const scale = base * zoom
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    const multiplier = output.width / preview.width
    const clamped = clampOffset(
      { x: offset.x * multiplier, y: offset.y * multiplier },
      drawWidth,
      drawHeight,
      output.width,
      output.height
    )
    const x = (output.width - drawWidth) / 2 + clamped.x
    const y = (output.height - drawHeight) / 2 + clamped.y
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, x, y, drawWidth, drawHeight)
    if (removeWhiteBackground) {
      try {
        removeBorderConnectedWhiteBackground(output)
      } catch (processingError) {
        setError(processingError?.message || 'Impossible de rendre le fond transparent.')
        setWorking(false)
        return
      }
    }
    output.toBlob(blob => {
      if (!blob) {
        setError('Impossible de préparer cette image. Essaie un autre fichier.')
        setWorking(false)
        return
      }
      const extension = outputFormat === 'image/png' ? 'png' : 'jpg'
      const baseName = (file?.name || 'image').replace(/\.[^.]+$/, '')
      const croppedFile = new File([blob], baseName + '-recadree.' + extension, {
        type: outputFormat,
        lastModified: Date.now(),
      })
      Promise.resolve(onConfirm?.(croppedFile)).catch(err => {
        setError(err?.message || 'Une erreur est survenue pendant l’import.')
        setWorking(false)
      })
    }, outputFormat, outputFormat === 'image/jpeg' ? 0.9 : undefined)
  }

  return (
    <div className="image-cropper-backdrop" role="presentation">
      <section className="image-cropper-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header className="image-cropper-header">
          <div>
            <span className="image-cropper-eyebrow">PERSONNALISATION PHOTO</span>
            <h2>{title}</h2>
            <p>Fais glisser l’image pour la positionner, puis règle le zoom.</p>
          </div>
          <button type="button" className="image-cropper-close" onClick={onCancel} disabled={working} aria-label="Fermer">×</button>
        </header>

        <div className="image-cropper-stage-wrap">
          {ready ? (
            <canvas
              ref={canvasRef}
              className="image-cropper-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
            />
          ) : (
            <div className="image-cropper-loading">{error || 'Préparation de l’aperçu…'}</div>
          )}
        </div>

        <div className="image-cropper-controls">
          <div className="image-cropper-zoom-label">
            <label htmlFor="image-cropper-zoom">Zoom</label>
            <strong>{zoom.toFixed(1)}×</strong>
          </div>
          <input
            id="image-cropper-zoom"
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={event => handleZoom(event.target.value)}
            disabled={!ready || working}
          />
          {allowWhiteBackgroundRemoval && (
            <label className="image-cropper-background-toggle">
              <input
                type="checkbox"
                checked={removeWhiteBackground}
                onChange={event => setRemoveWhiteBackground(event.target.checked)}
                disabled={!ready || working}
              />
              <span>
                <strong>Supprimer le fond blanc automatiquement</strong>
                <small>Le fond relié aux bords devient transparent pour laisser apparaître le thème clair ou sombre du showroom. Les zones blanches isolées du logo sont conservées autant que possible.</small>
              </span>
            </label>
          )}
          <div className="image-cropper-hint">Astuce : tu peux aussi déplacer l’image directement avec la souris ou le doigt.</div>
        </div>

        {error && ready && <p className="image-cropper-error" role="alert">{error}</p>}

        <footer className="image-cropper-footer">
          <button type="button" className="image-cropper-cancel" onClick={onCancel} disabled={working}>Annuler</button>
          <button type="button" className="image-cropper-confirm" onClick={applyCrop} disabled={!ready || working}>
            {working ? 'Préparation…' : '✓ Utiliser cette photo'}
          </button>
        </footer>
      </section>
    </div>
  )
}
