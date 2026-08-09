import { useState } from 'react'
import { fmt } from '../utils/notify'
import { ORIGINS, flagURI, STATUTS, PLACEHOLDER_IMG } from '../data/vehicles-data'

function statutOf(key) { return STATUTS.find(s => s.key === key) || STATUTS[0] }

export default function VehicleDetail({ vehicle: v, onClose, onReserve }) {
  const images = Array.isArray(v.images) && v.images.length > 0 ? v.images : (v.img ? [{ url: v.img }] : [])
  const [idx, setIdx] = useState(0)
  const [lb, setLb] = useState(false)

  const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
  const st = statutOf(v.statut)
  const disabled = v.statut === 'vendu'
  const specs = Array.isArray(v.specs) ? v.specs : []

  function next() { setIdx(i => (i + 1) % images.length) }
  function prev() { setIdx(i => (i - 1 + images.length) % images.length) }

  return (
    <div className="vd-ov">
      {/* Header sticky */}
      <div className="vd-hdr">
        <button className="btn-close" onClick={onClose}>✕</button>
        <span className="vd-hdr-title">{v.marque} {v.modele}</span>
      </div>

      <div className="vd-body">
        {/* Galerie */}
        {images.length > 0 ? (
          <div className="vd-gallery">
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
          </div>
        ) : (
          <div className="vd-gallery" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70 }}>🚗</div>
        )}

        {/* Miniatures */}
        {images.length > 1 && (
          <div className="vd-thumbs">
            {images.map((img, i) => (
              <div key={i} className={`vd-thumb ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)}>
                <img src={img.url} alt="" />
              </div>
            ))}
          </div>
        )}

        {/* Infos */}
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

          {v.description && (
            <div className="vd-section">
              <h3>📝 Description</h3>
              <p className="vd-description">{v.description}</p>
            </div>
          )}

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

      {/* Barre sticky */}
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
          <img src={images[idx]?.url} alt="" />
          <button className="btn-close" onClick={() => setLb(false)} style={{ position: 'absolute', top: 16, right: 16 }}>✕</button>
        </div>
      )}
    </div>
  )
}
