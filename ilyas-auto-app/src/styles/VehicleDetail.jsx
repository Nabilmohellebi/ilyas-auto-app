import { useState, useRef } from 'react'
import { fmt } from '../utils/notify'
import { ORIGINS, flagURI, PLACEHOLDER_IMG } from '../data/vehicles-data'
import { statutLabel } from '../i18n/translations'
import { useLang } from '../i18n/LangContext'
import FinancingCalculator from './FinancingCalculator'

function statutColor(key) {
  return key === 'disponible' ? '#22c55e' : key === 'reserve' ? '#f59e0b' : '#6b7280'
}

function getEmbedUrl(url) {
  if (!url) return null
  url = url.trim()
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let id = null
    try {
      if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1]?.split(/[?&#]/)[0]
      else if (url.includes('youtube.com/shorts/')) id = url.split('youtube.com/shorts/')[1]?.split(/[?&#]/)[0]
      else id = new URL(url).searchParams.get('v')
    } catch { id = null }
    return id ? { type: 'youtube', src: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` } : null
  }
  if (url.includes('tiktok.com')) {
    const id = url.match(/\/video\/([0-9]+)/)?.[1] || url.match(/([0-9]{15,})/)?.[1]
    if (id) return { type: 'tiktok', src: `https://www.tiktok.com/embed/v2/${id}` }
    return { type: 'external', src: url }
  }
  if (url.includes('instagram.com/reel') || url.includes('instagram.com/p/')) {
    const id = url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1]
    if (id) return { type: 'instagram', src: `https://www.instagram.com/p/${id}/embed/` }
  }
  if (url.includes('facebook.com') && url.includes('video')) {
    return { type: 'facebook', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false` }
  }
  return { type: 'external', src: url }
}

export default function VehicleDetail({ vehicle: v, onClose, onReserve }) {
  const { lang, t } = useLang()
  const images = Array.isArray(v.images) && v.images.length > 0 ? v.images : (v.img ? [{ url: v.img }] : [])
  const gallery = Array.isArray(v.images_gallery) ? v.images_gallery : []
  const [idx, setIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const touchX = useRef(null)

  const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
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
      <button className="vd-close-float" onClick={onClose}>✕</button>

      <div className="vd-layout">
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
              <div className="vd-statut-float" style={{ background: statutColor(v.statut) }}>{statutLabel(v.statut, lang)}</div>
              {disabled && <div className="stamp-sold">{lang === 'ar' ? 'مباعة' : 'Vendu'}</div>}
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

        <div className="vd-info-col">
          <div className="vd-info">
            {v.badge && <span className="vd-badge">{v.badge}</span>}
            <h1 className="vd-title">{v.marque} {v.modele}</h1>
            <div className="vd-price-row">
              <span className="vd-price">{fmt(v.prix)}</span>
              {disc > 0 && <><span className="vd-old-price">{fmt(v.prix_old)}</span><span className="vd-disc">-{disc}%</span></>}
            </div>

            <div className="vd-specs-grid">
              <div><span className="ic">🛣️</span>{v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : t.card.neuf}</div>
              <div><span className="ic">⚙️</span>{v.transmission}</div>
              <div><span className="ic">⛽</span>{v.carburant}</div>
              <div><span className="ic">📅</span>{v.annee}</div>
              <div><img src={flagURI(v.provenance)} style={{ width: 15, height: 11, borderRadius: 2 }} alt="" />{ORIGINS[v.provenance]?.label || 'Monde'}</div>
            </div>

            <button className="btn-hero-primary vd-reserve-desktop" disabled={disabled} onClick={() => !disabled && onReserve(v)}>
              {disabled ? t.detail.vendu : t.detail.reserver}
            </button>

            {v.video_url && (() => {
              const embed = getEmbedUrl(v.video_url)
              if (!embed) return null
              if (embed.type === 'external') {
                const isTikTok = embed.src.includes('tiktok')
                const isInsta = embed.src.includes('instagram')
                const icon = isTikTok ? '🎵' : isInsta ? '📸' : '▶️'
                const platform = isTikTok ? 'TikTok' : isInsta ? 'Instagram' : ''
                return (
                  <a href={embed.src} target="_blank" rel="noreferrer" className="vd-video-card">
                    <div className="ic">{icon}</div>
                    <div>
                      <div className="txt-title">{t.detail.video} {platform}</div>
                    </div>
                  </a>
                )
              }
              return (
                <div className="vd-video-embed" style={{ paddingBottom: embed.type === 'tiktok' ? '150%' : '56.25%' }}>
                  <iframe src={embed.src} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
              )
            })()}

            {v.description && (
              <div className="vd-section">
                <h3>{t.detail.description}</h3>
                <p className="vd-description">{v.description}</p>
              </div>
            )}

            {!disabled && <FinancingCalculator prix={v.prix} />}

            {specs.length > 0 && (
              <div className="vd-section">
                <h3>{t.detail.equipements}</h3>
                <div className="vd-equip-grid">
                  {specs.map((s, i) => <div key={i} className="vd-equip-item"><span>✓</span>{s}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {gallery.length > 0 && (
        <div className="vd-gallery-full-wrap">
          <div className="vd-gallery-full-title">{t.detail.plusPhotos}</div>
          <div className="vd-gallery-full">
            {gallery.map((img, i) => <img key={i} src={img.url} alt="" loading="lazy" />)}
          </div>
        </div>
      )}

      <div className="vd-bottom">
        <div className="vd-bottom-price">
          <span className="lbl">{t.detail.prix}</span>
          <strong>{fmt(v.prix)}</strong>
        </div>
        <button className="btn-hero-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={disabled} onClick={() => !disabled && onReserve(v)}>
          {disabled ? t.detail.vendu : t.detail.reserver}
        </button>
      </div>

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
