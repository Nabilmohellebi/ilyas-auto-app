import { useEffect, useRef, useState } from 'react'
import { createBrandedVehicleImageFile, detectLicensePlate } from '../../utils/vehicleBranding'

function fallbackRect(width, height) {
  const w = 24
  return { x: 38, y: 69, w, h: w * width / height / 4.6 }
}

export default function PlateBrandingEditor({ file, shopName, logoUrl, accentColor, onConfirm, onSkip, onCancel }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [dimensions, setDimensions] = useState({ width: 4, height: 3 })
  const [rect, setRect] = useState({ x: 38, y: 69, w: 24, h: 7 })
  const [detecting, setDetecting] = useState(true)
  const [detected, setDetected] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const stageRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    let active = true
    const image = new Image()
    image.onload = async () => {
      if (!active) return
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight })
      setRect(fallbackRect(image.naturalWidth, image.naturalHeight))
      setDetecting(true)
      const candidate = await detectLicensePlate(file)
      if (!active) return
      if (candidate) {
        setRect({ x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h })
        setDetected(true)
      } else {
        setDetected(false)
      }
      setDetecting(false)
    }
    image.onerror = () => {
      if (active) {
        setDetecting(false)
        setError('Impossible de lire cette photo. Tu peux la conserver sans personnalisation.')
      }
    }
    image.src = url
    return () => {
      active = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  function startDrag(mode, event) {
    event.preventDefault()
    event.stopPropagation()
    if (detecting || applying) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rect: { ...rect },
    }
  }

  function moveDrag(event) {
    const drag = dragRef.current
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.x) / Math.max(bounds.width, 1) * 100
    const dy = (event.clientY - drag.y) / Math.max(bounds.height, 1) * 100
    if (drag.mode === 'move') {
      setRect(current => ({
        ...current,
        x: Math.max(0, Math.min(100 - current.w, drag.rect.x + dx)),
        y: Math.max(0, Math.min(100 - current.h, drag.rect.y + dy)),
      }))
    } else {
      const w = Math.max(MIN_WIDTH, Math.min(65, drag.rect.w + dx))
      const h = w * dimensions.width / dimensions.height / 4.6
      setRect(current => ({
        ...current,
        w,
        h,
        x: Math.min(current.x, 100 - w),
        y: Math.min(current.y, 100 - h),
      }))
    }
  }

  function stopDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  async function applyBranding() {
    if (!file || applying || detecting) return
    setApplying(true)
    setError('')
    try {
      const brandedFile = await createBrandedVehicleImageFile(file, rect, { shopName, logoUrl, accentColor })
      await onConfirm?.({ originalFile: file, brandedFile, plateRect: rect })
    } catch (applyError) {
      setError(applyError?.message || 'Impossible de personnaliser cette photo.')
      setApplying(false)
    }
  }

  return (
    <div className="plate-branding-backdrop" role="presentation">
      <section className="plate-branding-dialog" role="dialog" aria-modal="true" aria-labelledby="plate-branding-title">
        <header className="plate-branding-header">
          <div>
            <span className="plate-branding-eyebrow">IDENTITÉ DU SHOWROOM</span>
            <h2 id="plate-branding-title">Personnaliser la plaque</h2>
            <p>Le repérage est automatique. Vérifie la zone et déplace le cadre si nécessaire.</p>
          </div>
          <button type="button" className="plate-branding-close" onClick={onCancel} disabled={applying} aria-label="Fermer">×</button>
        </header>

        <div className="plate-branding-status">
          {detecting ? (
            <><span className="plate-branding-spinner" /> Analyse de la photo en cours…</>
          ) : detected ? (
            <><span className="plate-branding-status-dot is-good" /> Plaque probable repérée automatiquement · vérifie le cadrage</>
          ) : (
            <><span className="plate-branding-status-dot is-warning" /> Aucune plaque repérée avec certitude · place le cadre manuellement ou conserve la photo</>
          )}
        </div>

        <div
          className="plate-branding-stage"
          ref={stageRef}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          {previewUrl && <img src={previewUrl} alt="Aperçu du véhicule" draggable="false" />}
          {!detecting && (
            <div
              className="plate-branding-overlay"
              style={{ left: rect.x + '%', top: rect.y + '%', width: rect.w + '%', height: rect.h + '%' }}
              onPointerDown={event => startDrag('move', event)}
              role="group"
              aria-label="Zone personnalisée, fais glisser pour ajuster sa position"
            >
              {logoUrl
                ? <img className="plate-branding-logo" src={logoUrl} alt="" draggable="false" />
                : <span className="plate-branding-name">{shopName || 'Votre showroom'}</span>}
              <span className="plate-branding-resize" onPointerDown={event => startDrag('resize', event)} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="plate-branding-preview-caption">
          <span>APERÇU DU MARQUAGE</span>
          <strong>{shopName || 'Votre showroom'}</strong>
          <small>{logoUrl ? 'Logo actuel du showroom' : 'Le nom du showroom sera affiché'}</small>
        </div>

        {error && <p className="plate-branding-error" role="alert">{error}</p>}
        <footer className="plate-branding-footer">
          <button type="button" className="plate-branding-secondary" onClick={onCancel} disabled={applying}>Annuler</button>
          <button type="button" className="plate-branding-plain" onClick={onSkip} disabled={applying}>Garder sans modifier</button>
          <button type="button" className="plate-branding-primary" onClick={applyBranding} disabled={applying || detecting}>
            {applying ? 'Préparation…' : '✓ Appliquer le logo'}
          </button>
        </footer>
        <p className="plate-branding-note">La photo originale est conservée séparément. Tu pourras ainsi changer le nom ou le logo et actualiser les marquages des photos déjà traitées.</p>
      </section>
    </div>
  )
}

const MIN_WIDTH = 8
