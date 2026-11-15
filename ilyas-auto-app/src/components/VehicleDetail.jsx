import { useState, useRef } from 'react'
import { fmt } from '../utils/notify'
import { ORIGINS, flagURI, PLACEHOLDER_IMG } from '../data/vehicles-data'
import { statutLabel } from '../i18n/translations'
import { useLang } from '../i18n/LangContext'
import FinancingCalculator from './FinancingCalculator'
import { sortEquipment, sortTechnicalSpecs } from '../utils/vehicleSpecifications'

function escapePrintHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char])
}

function safePrintImageUrl(value) {
  try {
    const url = new URL(String(value || ''), window.location.origin)
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function printVehicleSheet(v, images, shopName = 'Nabil Auto') {
  const specs = sortEquipment(v.specs)
  const technicalSpecs = sortTechnicalSpecs(v.technical_specs)
  const name = escapePrintHtml(`${v.marque} ${v.modele}`)
  const safeShopName = escapePrintHtml(shopName)
  const description = escapePrintHtml(v.description)
  const condition = v.etat_vehicule || (Number(v.km || 0) > 0 ? 'occasion' : 'neuf')
  const imageUrl = safePrintImageUrl(images[0]?.url)
  const imageAlt = escapePrintHtml(name)
  const origin = escapePrintHtml(ORIGINS[v.provenance]?.label || 'Monde')
  const specItems = specs.map(item => `<li>${escapePrintHtml(item)}</li>`).join('')
  const technicalItems = technicalSpecs.map(item => `<div><small>${escapePrintHtml(item.label)}</small><strong>${escapePrintHtml(item.value)}</strong></div>`).join('')
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color:#111; padding: 28px; }
    .hdr { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #e63946; padding-bottom:14px; margin-bottom:20px; }
    .brand { font-size:22px; font-weight:900; }
    .brand em { color:#e63946; font-style:normal; }
    .date { font-size:11px; color:#888; }
    img.main { width:100%; max-height:340px; object-fit:cover; border-radius:10px; margin-bottom:16px; }
    h1 { font-size:24px; margin-bottom:4px; }
    .price { font-size:26px; font-weight:900; color:#e63946; margin-bottom:16px; }
    .specs { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px; }
    .specs div { background:#f7f7f7; border-radius:8px; padding:8px 12px; font-size:13px; }
    .technical-specs { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:16px; }
    .technical-specs div { background:#f7f7f7; border-radius:8px; padding:9px 12px; font-size:13px; }
    .technical-specs small { display:block; color:#777; margin-bottom:4px; }
    .technical-specs strong { display:block; color:#222; }
    .section-title { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:#555; margin-bottom:8px; border-top:1px solid #eee; padding-top:14px; }
    p.desc { font-size:13px; line-height:1.7; margin-bottom:16px; }
    ul { padding-left:18px; margin-bottom:16px; }
    li { font-size:13px; margin-bottom:4px; }
    .footer { margin-top:24px; border-top:1px solid #eee; padding-top:14px; font-size:11px; color:#999; }
    @media print { button { display:none !important; } }
  </style></head><body>
    <button onclick="window.print()" style="background:#e63946;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:13px;cursor:pointer;margin-bottom:16px;">🖨️ Imprimer / Enregistrer en PDF</button>
    <div class="hdr"><div class="brand">${safeShopName}</div><div class="date">${new Date().toLocaleDateString('fr-FR')}</div></div>
    ${imageUrl ? `<img class="main" src="${escapePrintHtml(imageUrl)}" alt="${imageAlt}" />` : ''}
    <h1>${name}</h1>
    <div class="price">${fmt(v.prix)}</div>
    <div class="specs">
      <div>🚘 État : ${condition === 'occasion' ? 'Occasion' : 'Neuf'}</div>
      <div>📅 Année : ${escapePrintHtml(v.annee)}</div>
      <div>🛣️ Km : ${Number(v.km || 0).toLocaleString('fr-FR')} km</div>
      <div>⚙️ Boîte : ${escapePrintHtml(v.transmission)}</div>
      <div>⛽ Carburant : ${escapePrintHtml(v.carburant)}</div>
      <div>🚙 Carrosserie : ${escapePrintHtml(v.carrosserie || '—')}</div>
      <div>🌍 Provenance : ${origin}</div>
    </div>
    ${specItems ? `<div class="section-title">Fonctionnalités supplémentaires</div><ul>${specItems}</ul>` : ''}
    ${technicalItems ? `<div class="section-title">Caractéristiques techniques</div><div class="technical-specs">${technicalItems}</div>` : ''}
    ${description ? `<div class="section-title">Notes du vendeur</div><p class="desc">${description}</p>` : ''}
    <div class="footer">${safeShopName} · Document généré automatiquement · Prix indicatif, sous réserve de disponibilité.</div>
  </body></html>`)
  win.document.close()
}

function technicalSpecIcon(label) {
  const value = String(label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/moteur|engine|cylindre/.test(value)) return '⚙️'
  if (/puissance|power/.test(value)) return '⚡'
  if (/couple|torque/.test(value)) return '↗'
  if (/vitesse|max speed/.test(value)) return '🏁'
  if (/batterie|autonomie|range/.test(value)) return '🔋'
  if (/dimension|taille|empattement/.test(value)) return '📐'
  if (/place|siege/.test(value)) return '💺'
  if (/carburant|fuel/.test(value)) return '⛽'
  if (/transmission|boite|traction|drive/.test(value)) return '⚙️'
  return '◆'
}
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

export default function VehicleDetail({ vehicle: v, onClose, onReserve, shopName = 'Nabil Auto' }) {
  const { lang, t } = useLang()
  const images = Array.isArray(v.images) && v.images.length > 0 ? v.images : (v.img ? [{ url: v.img }] : [])
  const gallery = Array.isArray(v.images_gallery) ? v.images_gallery : []
  const [shareStatus, setShareStatus] = useState('')
  const [idx, setIdx] = useState(0)
  const [lb, setLb] = useState(false)
  const touchX = useRef(null)

  const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
  const disabled = v.statut === 'vendu'
  const shouldShowFinancing = v.financing_enabled !== false && !disabled
  const specs = sortEquipment(v.specs)
  const technicalSpecs = sortTechnicalSpecs(v.technical_specs)
  const vehicleCondition = v.etat_vehicule || (Number(v.km || 0) > 0 ? 'occasion' : 'neuf')

  function next() { setIdx(i => (i + 1) % images.length) }
  function prev() { setIdx(i => (i - 1 + images.length) % images.length) }

  async function shareVehicle() {
    const link = new URL(window.location.pathname, window.location.origin)
    link.searchParams.set('vehicule', String(v.id))
    const shareData = {
      title: `${shopName} — ${v.marque} ${v.modele}`,
      text: `${v.marque} ${v.modele} (${v.annee}) · ${fmt(v.prix)}`,
      url: link.href,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link.href)
        setShareStatus('Lien copié !')
        window.setTimeout(() => setShareStatus(''), 2500)
        return
      }
      window.prompt('Copie le lien de cette voiture :', link.href)
    } catch (error) {
      if (error?.name !== 'AbortError') setShareStatus('Partage indisponible')
    }
  }

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
              <div className="vd-statut-float" data-status={v.statut} style={{ background: statutColor(v.statut) }}>{statutLabel(v.statut, lang)}</div>
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
            <span className={`veh-condition-label ${vehicleCondition === 'occasion' ? 'used' : 'new'}`}>
              {vehicleCondition === 'occasion' ? (lang === 'ar' ? 'مستعملة' : 'Véhicule d’occasion') : (lang === 'ar' ? 'جديدة' : 'Véhicule neuf')}
            </span>
            <div className="vd-price-row">
              <span className="vd-price">{fmt(v.prix)}</span>
              {disc > 0 && <><span className="vd-old-price">{fmt(v.prix_old)}</span><span className="vd-disc">-{disc}%</span></>}
            </div>

            <div className="vd-specs-grid">
              <div><span className="ic">🛣️</span>{v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : t.card.neuf}</div>
              <div><span className="ic">⚙️</span>{v.transmission}</div>
              <div><span className="ic">⛽</span>{v.carburant}</div>
              <div><span className="ic">📅</span>{v.annee}</div>
              {v.carrosserie && <div><span className="ic">🚙</span>{v.carrosserie}</div>}
              <div><img src={flagURI(v.provenance)} style={{ width: 15, height: 11, borderRadius: 2 }} alt="" />{ORIGINS[v.provenance]?.label || 'Monde'}</div>
            </div>

            <button className="btn-hero-primary vd-reserve-desktop" disabled={disabled} onClick={() => !disabled && onReserve(v)}>
              {disabled ? t.detail.vendu : vehicleCondition === 'occasion' ? t.detail.acheterOccasion : t.detail.reserver}
            </button>

            <button className="vd-print-btn" onClick={() => printVehicleSheet(v, images, shopName)}>🖨️ Fiche PDF / Imprimer</button>
            <button className="vd-share-btn" onClick={shareVehicle}>↗️ {shareStatus || "Partager la fiche"}</button>

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

      {(specs.length > 0 || technicalSpecs.length > 0 || v.description || shouldShowFinancing) && (
        <div className="vd-detail-sections">
          {specs.length > 0 && (
            <section className="vd-section vd-feature-section">
              <div className="vd-section-kicker">{lang === 'ar' ? 'التجهيزات' : 'FONCTIONNALITÉS'}</div>
              <h3>{lang === 'ar' ? 'التجهيزات الإضافية' : 'Fonctionnalités supplémentaires'}</h3>
              <div className="vd-equip-grid">
                {specs.map((item, i) => (
                  <div key={i} className="vd-equip-item">
                    <span className="vd-equip-check" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {technicalSpecs.length > 0 && (
            <section className="vd-section vd-technical-section">
              <div className="vd-section-kicker">{lang === 'ar' ? 'التفاصيل' : 'FICHE TECHNIQUE'}</div>
              <h3>{lang === 'ar' ? 'المواصفات التقنية' : 'Caractéristiques techniques'}</h3>
              <div className="vd-technical-grid">
                {technicalSpecs.map((item, i) => (
                  <div className="vd-technical-item" key={`${item.label}-${i}`}>
                    <span className="vd-technical-icon" aria-hidden="true">{technicalSpecIcon(item.label)}</span>
                    <span className="vd-technical-label">{item.label}</span>
                    <strong className="vd-technical-value">{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.description && (
            <section className="vd-section vd-seller-notes">
              <div className="vd-section-kicker">{lang === 'ar' ? 'معلومات إضافية' : 'À PROPOS DU VÉHICULE'}</div>
              <h3>{lang === 'ar' ? 'ملاحظات البائع' : 'Notes du vendeur'}</h3>
              <p className="vd-description">{v.description}</p>
            </section>
          )}

          {shouldShowFinancing && <FinancingCalculator prix={v.prix} />}
        </div>
      )}

      <div className="vd-bottom">
        <div className="vd-bottom-price">
          <span className="lbl">{t.detail.prix}</span>
          <strong>{fmt(v.prix)}</strong>
        </div>
        <button className="btn-hero-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={disabled} onClick={() => !disabled && onReserve(v)}>
          {disabled ? t.detail.vendu : vehicleCondition === 'occasion' ? t.detail.acheterOccasion : t.detail.reserver}
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
