import { useEffect, useRef, useState } from 'react'
import { createBrandedVehicleImageFile, detectLicensePlate } from '../../utils/vehicleBranding'

function fallbackRect(width, height) {
  const w = 24
  return { x: 38, y: 72, w, h: w * width / height / 4.6, angle: 0 }
}

function normalizeAngle(value) {
  let angle = value
  while (angle > 180) angle -= 360
  while (angle < -180) angle += 360
  return Math.round(angle * 10) / 10
}

export default function PlateBrandingEditor({ file, shopName, logoUrl, accentColor, onConfirm, onSkip, onCancel }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [dimensions, setDimensions] = useState({ width: 4, height: 3 })
  const [rect, setRect] = useState({ x: 38, y: 72, w: 24, h: 7, angle: 0 })
  const [detecting, setDetecting] = useState(true)
  const [detected, setDetected] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [detectionError, setDetectionError] = useState('')
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
      setDetectionError('')
      try {
        const candidate = await detectLicensePlate(file)
        if (!active) return
        if (candidate) {
          setRect({ x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h, angle: candidate.angle || 0 })
          setConfidence(candidate.confidence || 0)
          setDetected(true)
        } else {
          setDetected(false)
          setDetectionError('Aucune plaque trouvée automatiquement. Tu peux placer le cadre toi-même.')
        }
      } catch (detectionFailure) {
        if (!active) return
        console.warn('Analyse automatique de la plaque :', detectionFailure)
        setDetected(false)
        setDetectionError(detectionFailure?.message || 'La détection automatique a échoué. Tu peux placer le cadre toi-même.')
      } finally {
        if (active) setDetecting(false)
      }
    }
    image.onerror = () => {
      if (active) {
        setDetecting(false)
        setDetectionError('Impossible de lire cette photo. Tu peux la conserver sans personnalisation.')
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
    const stage = stageRef.current
    const bounds = stage?.getBoundingClientRect()
    if (!stage || !bounds) return
    try { stage.setPointerCapture(event.pointerId) } catch {}
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      rect: { ...rect },
      bounds,
    }
  }

  function moveDrag(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.clientX) / Math.max(drag.bounds.width, 1) * 100
    const dy = (event.clientY - drag.clientY) / Math.max(drag.bounds.height, 1) * 100

    if (drag.mode === 'move') {
      setRect({
        ...drag.rect,
        x: Math.max(0, Math.min(100 - drag.rect.w, drag.rect.x + dx)),
        y: Math.max(0, Math.min(100 - drag.rect.h, drag.rect.y + dy)),
      })
      return
    }

    if (drag.mode === 'rotate') {
      const centerX = drag.bounds.left + (drag.rect.x + drag.rect.w / 2) / 100 * drag.bounds.width
      const centerY = drag.bounds.top + (drag.rect.y + drag.rect.h / 2) / 100 * drag.bounds.height
      const startAngle = Math.atan2(drag.clientY - centerY, drag.clientX - centerX)
      const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX)
      const delta = (currentAngle - startAngle) * 180 / Math.PI
      setRect({ ...drag.rect, angle: normalizeAngle((drag.rect.angle || 0) + delta) })
      return
    }

    if (drag.mode === 'resize') {
      const angle = -(drag.rect.angle || 0) * Math.PI / 180
      const localDx = dx * Math.cos(angle) - dy * Math.sin(angle)
      const w = Math.max(8, Math.min(72, drag.rect.w + localDx))
      const h = w * dimensions.width / dimensions.height / 4.6
      const centerX = drag.rect.x + drag.rect.w / 2
      const centerY = drag.rect.y + drag.rect.h / 2
      setRect({
        ...drag.rect,
        x: Math.max(0, Math.min(100 - w, centerX - w / 2)),
        y: Math.max(0, Math.min(100 - h, centerY - h / 2)),
        w,
        h,
      })
    }
  }

  function stopDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  function setRotation(value) {
    setRect(current => ({ ...current, angle: normalizeAngle(Number(value) || 0) }))
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

  async function skipBranding() {
    if (applying) return
    setError('')
    setApplying(true)
    try {
      await onSkip?.()
    } catch (skipError) {
      setError(skipError?.message || 'La photo n’a pas pu être enregistrée.')
    } finally {
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
            <p>La plaque est recherchée automatiquement. Vérifie le cadre, tourne-le et ajuste sa taille.</p>
          </div>
          <button type="button" className="plate-branding-close" onClick={onCancel} disabled={applying} aria-label="Fermer">×</button>
        </header>

        <div className="plate-branding-status">
          {detecting ? (
            <><span className="plate-branding-spinner" /> Téléchargement du détecteur (première utilisation), puis analyse de la photo…</>
          ) : detected ? (
            <><span className="plate-branding-status-dot is-good" /> Plaque repérée automatiquement · confiance {Math.round(confidence * 100)} %</>
          ) : (
            <><span className="plate-branding-status-dot is-warning" /> {detectionError || 'Plaque non détectée : place le cadre manuellement.'}</>
          )}
        </div>

        <div
          className="plate-branding-stage"
          ref={stageRef}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
        >
          {previewUrl && <img src={previewUrl} alt="Aperçu du véhicule" draggable="false" />}
          {!detecting && (
            <div
              className="plate-branding-overlay"
              style={{
                left: rect.x + '%',
                top: rect.y + '%',
                width: rect.w + '%',
                height: rect.h + '%',
                transform: `rotate(${rect.angle || 0}deg)`,
              }}
              onPointerDown={event => startDrag('move', event)}
              role="group"
              aria-label="Zone de la plaque personnalisée"
            >
              {logoUrl
                ? <img className="plate-branding-logo" src={logoUrl} alt="" draggable="false" />
                : <span className="plate-branding-name">{shopName || 'Votre showroom'}</span>}
              <button type="button" className="plate-branding-rotate" onPointerDown={event => startDrag('rotate', event)} aria-label="Tourner la plaque" title="Faire tourner la plaque">
                <span aria-hidden="true">↻</span>
              </button>
              <span className="plate-branding-resize" onPointerDown={event => startDrag('resize', event)} aria-hidden="true" title="Redimensionner" />
            </div>
          )}
        </div>

        <div className="plate-branding-controls">
          <div className="plate-branding-control-heading">
            <label htmlFor="plate-rotation">Rotation</label>
            <strong>{Math.round(rect.angle || 0)}°</strong>
          </div>
          <input
            id="plate-rotation"
            type="range"
            min="-180"
            max="180"
            step="1"
            value={Math.round(rect.angle || 0)}
            onChange={event => setRotation(event.target.value)}
            disabled={detecting || applying}
          />
          <div className="plate-branding-control-hint">Déplace le bouton ↻ au-dessus de la plaque ou utilise le curseur pour régler précisément l’angle.</div>
        </div>

        <div className="plate-branding-preview-caption">
          <span>APERÇU DU MARQUAGE</span>
          <strong>{shopName || 'Votre showroom'}</strong>
          <small>{logoUrl ? 'Logo actuel du showroom' : 'Nom du showroom'}</small>
        </div>

        {error && <p className="plate-branding-error" role="alert">{error}</p>}
        <footer className="plate-branding-footer">
          <button type="button" className="plate-branding-secondary" onClick={onCancel} disabled={applying}>Annuler</button>
          <button type="button" className="plate-branding-plain" onClick={skipBranding} disabled={applying}>Garder sans modifier</button>
          <button type="button" className="plate-branding-primary" onClick={applyBranding} disabled={applying || detecting}>
            {applying ? 'Préparation…' : '✓ Appliquer sur la plaque'}
          </button>
        </footer>
        <p className="plate-branding-note">Le modèle de détection s’exécute dans ton navigateur. La photo reste sur ton appareil jusqu’à son enregistrement dans le showroom. L’original est conservé pour changer le logo ou le nom par la suite.</p>
      </section>
    </div>
  )
}
