import { useState, useRef } from 'react'
import { fmt } from '../utils/notify'
import { ORIGINS, flagURI, STATUTS, PLACEHOLDER_IMG } from '../data/vehicles-data'
import FinancingCalculator from './FinancingCalculator'

function statutOf(key) { return STATUTS.find(s => s.key === key) || STATUTS[0] }

export default function VehicleDetail({ vehicle: v, onClose, onReserve }) {
  const images = Array.isArray(v.images) && v.images.length > 0 ? v.images : (v.img ? [{ url: v.img }] : [])
  const gallery = Array.isArray(v.images_gallery) ? v.images_gallery : []
  const [idx, setIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const touchX = useRef(null)

  const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
  const st = statutOf(v.statut)
  const disabled = v.statut === 'vendu'
  const specs = Array.isArray(v.specs) ? v.specs : []

  function next() { setIdx(i => (i + 1) % images.length) }
  function prev() { setIdx(i => (i - 1 + images.length) % images.length) }

  function onTouchStart(e) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchX.current === null || images.length < 2) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev() }
    touchX.current = null
  }

  return (
    <div className="vd-ov">
      {/* Bouton fermer flottant — ne bloque plus la photo */}
      <button className="vd-close-float" onClick={onClose}>✕</button>

      <div className="vd-layout">
        {/* ── Colonne galerie (carrousel) ── */}
        <div className="vd-gallery-col">
          {images.length > 0 ? (
            <div className="vd-gallery" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <img src={images[idx]?.url || PLACEHOLDER_IMG} alt="" onClick={() => setLb(true)} />
              {images.length > 1 && <>
                <button className="vd-arrow left" onClick={prev}>‹</button>
                <button className="vd-arrow right" onClick={next}>›</button>
                <div className="vd-dots">
                  {images.map((_, i) => <div key={i} className={`vd-dot ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)} />)}
                </div>
                <div className="vd-counter">{idx + 1}/{images.length}</div>
              </>}
              <div className="vd-statut-float" style={{ background: st.color }}>{st.label}</div>
              {disabled && <div className="stamp-sold">Vendu</div>}
            </div>
          ) : (
            <div className="vd-gallery vd-gallery-empty">🚗</div>
          )}

          {images.length > 1 && (
            <div className="vd-thumbs">
              {images.map((img, i) => (
                <div key={i} className={`vd-thumb ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)}>
                  <img src={img.url} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Colonne infos ── */}
        <div className="vd-info-col">
          <div className="vd-info">
            {v.badge && <span className="vd-badge">{v.badge}</span>}
            <h1 className="vd-title">{v.marque} {v.modele}</h1>
            <div className="vd-price-row">
              <span className="vd-price">{fmt(v.prix)}</span>
              {disc > 0 && <><span className="vd-old-price">{fmt(v.prix_old)}</span><span className="vd-disc">-{disc}%</span></>}
            </div>

            <div className="vd-specs-grid">
              <div><span className="ic">🛣️</span>{v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : 'Neuf / 0 km'}</div>
              <div><span className="ic">⚙️</span>{v.transmission}</div>
              <div><span className="ic">⛽</span>{v.carburant}</div>
              <div><span className="ic">📅</span>{v.annee}</div>
              <div><img src={flagURI(v.provenance)} style={{ width: 15, height: 11, borderRadius: 2 }} alt="" />{ORIGINS[v.provenance]?.label || 'Monde'}</div>
            </div>

            <button className="btn-hero-primary vd-reserve-desktop" disabled={disabled} onClick={() => !disabled && onReserve(v)}>
              {disabled ? '🚫 Véhicule vendu' : '🚘 Réserver ce véhicule'}
            </button>

            {v.description && (
              <div className="vd-section">
                <h3>📝 Description</h3>
                <p className="vd-description">{v.description}</p>
              </div>
            )}

            {!disabled && <FinancingCalculator prix={v.prix} />}

            {specs.length > 0 && (
              <div className="vd-section">
                <h3>⚙️ Équipements & Options</h3>
                <div className="vd-equip-grid">
                  {specs.map((s, i) => <div key={i} className="vd-equip-item"><span>✓</span>{s}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Galerie grand format — pleine largeur, après la description ── */}
      {gallery.length > 0 && (
        <div className="vd-gallery-full-wrap">
          <div className="vd-gallery-full-title">📸 Plus de photos</div>
          <div className="vd-gallery-full">
            {gallery.map((img, i) => <img key={i} src={img.url} alt="" loading="lazy" />)}
          </div>
        </div>
      )}

      {/* Barre sticky — mobile uniquement */}
      <div className="vd-bottom">
        <div className="vd-bottom-price">
          <span className="lbl">Prix</span>
          <strong>{fmt(v.prix)}</strong>
        </div>
        <button className="btn-hero-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={disabled} onClick={() => !disabled && onReserve(v)}>
          {disabled ? '🚫 Véhicule vendu' : '🚘 Réserver ce véhicule'}
        </button>
      </div>

      {/* Lightbox plein écran */}
      {lb && images.length > 0 && (
        <div className="vd-lightbox" onClick={() => setLb(false)}>
          <img src={images[idx]?.url} alt="" onClick={e => e.stopPropagation()} />
          {images.length > 1 && <>
            <button className="vd-arrow left" onClick={e => { e.stopPropagation(); prev() }}>‹</button>
            <button className="vd-arrow right" onClick={e => { e.stopPropagation(); next() }}>›</button>
          </>}
          <button className="btn-close" onClick={() => setLb(false)} style={{ position: 'absolute', top: 16, right: 16 }}>✕</button>
        </div>
      )}
    </div>
  )
}
