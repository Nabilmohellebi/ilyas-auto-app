import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { fmt, waLink } from '../utils/notify'
import { ORIGINS, flagURI, PLACEHOLDER_IMG } from '../data/vehicles-data'
import { getSettings } from '../utils/useSettings'
import { statutLabel } from '../i18n/translations'
import { LangProvider, useLang } from '../i18n/LangContext'
import ReservationModal from './ReservationModal'
import VehicleDetail from './VehicleDetail'
import AnnouncementBar from './AnnouncementBar'
import TrackingPage from './TrackingPage'
import VehicleGallery from './VehicleGallery'
import CONFIG from '../config'

function statutColor(key) {
  return key === 'disponible' ? '#22c55e' : key === 'reserve' ? '#f59e0b' : '#6b7280'
}

function PublicSiteInner() {
  const { lang, t, rtl, toggleLang } = useLang()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reserveVehicle, setReserveVehicle] = useState(null)
  const [openVehicle, setOpenVehicle] = useState(null)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [settings, setSettings] = useState({})

  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [budget, setBudget] = useState('all')
  const [sort, setSort] = useState('default')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      setVehicles(data || [])
      setLoading(false)
    }
    load()
    getSettings().then(setSettings)
  }, [])

  const s = useMemo(() => ({
    nom:        settings.shop_name       || CONFIG.nom,
    telephone:  settings.shop_phone      || CONFIG.telephone,
    whatsapp:   settings.shop_whatsapp   || CONFIG.whatsapp,
    adresse:    settings.shop_address    || CONFIG.adresse,
    horaires:   settings.shop_horaires   || CONFIG.horaires,
    mapsUrl:    settings.shop_maps_url   || CONFIG.mapsUrl,
    mapsEmbed:  settings.shop_maps_embed || CONFIG.mapsEmbed,
    facebook:   CONFIG.facebook,
    instagram:  CONFIG.instagram,
  }), [settings])

  const brands = useMemo(() => [...new Set(vehicles.map(v => v.marque))].sort(), [vehicles])

  const recentVehicles = useMemo(
    () => [...vehicles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [vehicles]
  )

  const filtered = vehicles.filter(v => {
    if (brand !== 'all' && v.marque !== brand) return false
    if (origin !== 'all' && v.provenance !== origin) return false
    if (budget === 'low' && v.prix >= 4000000) return false
    if (budget === 'mid' && (v.prix < 4000000 || v.prix > 7000000)) return false
    if (budget === 'high' && v.prix <= 7000000) return false
    if (search && !`${v.marque} ${v.modele}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return a.prix - b.prix
    if (sort === 'price_desc') return b.prix - a.prix
    if (sort === 'year_desc') return b.annee - a.annee
    if (sort === 'year_asc') return a.annee - b.annee
    if (sort === 'km_asc') return (a.km || 0) - (b.km || 0)
    return (a.display_order || 99) - (b.display_order || 99)
  })

  function scrollTo(id) {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  function waDirect(v) {
    const text = `Bonjour ${s.nom}, je suis intéressé par la ${v.marque} ${v.modele} (${v.annee}) affichée à ${fmt(v.prix)}. Est-elle toujours disponible ?`
    window.open(waLink(text, s.whatsapp), '_blank')
  }

  return (
    <div className="app" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Bande nouveautés & promos ── */}
      {!loading && <VehicleGallery vehicles={recentVehicles} onVehicleClick={setOpenVehicle} newLabel={t.card.nouveau} />}

      <AnnouncementBar />
      {/* ── Navigation ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="#accueil" className="nav-logo">ILYAS<em>AUTO</em></a>
          <div className="nav-links">
            <a onClick={() => scrollTo('accueil')} href="#accueil">{t.nav.accueil}</a>
            <a onClick={() => scrollTo('stock')} href="#stock">{t.nav.stock}</a>
            <a onClick={() => scrollTo('showroom')} href="#showroom">{t.nav.showroom}</a>
            <a onClick={e => { e.preventDefault(); setTrackingOpen(true) }} href="#">{t.nav.suivi}</a>
            <button onClick={toggleLang} className="lang-toggle">{lang === 'fr' ? '🇩🇿 عربي' : '🇫🇷 Français'}</button>
            <a href={waLink('Bonjour ' + s.nom + ', je vous contacte depuis votre site web.', s.whatsapp)} target="_blank" rel="noreferrer" className="nav-wa-btn">💬 {t.nav.whatsapp}</a>
          </div>
          <button className="nav-burger" onClick={() => setMobileOpen(o => !o)}>☰</button>
        </div>
        <div className={`nav-mobile ${mobileOpen ? 'open' : ''}`}>
          <a onClick={() => scrollTo('accueil')} href="#accueil">{t.nav.accueil}</a>
          <a onClick={() => scrollTo('stock')} href="#stock">{t.nav.stock}</a>
          <a onClick={() => scrollTo('showroom')} href="#showroom">{t.nav.showroom}</a>
          <a onClick={e => { e.preventDefault(); setMobileOpen(false); setTrackingOpen(true) }} href="#">{t.nav.suivi}</a>
          <button onClick={toggleLang} className="lang-toggle" style={{ marginTop: 6, width: 'fit-content' }}>{lang === 'fr' ? '🇩🇿 عربي' : '🇫🇷 Français'}</button>
          <a href={waLink('Bonjour ' + s.nom + ', je vous contacte depuis votre site web.', s.whatsapp)} target="_blank" rel="noreferrer">💬 {t.nav.whatsapp}</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header id="accueil" className="hero-auto">
        <div className="hero-auto-content">
          <div className="hero-eyebrow">
            <img src={flagURI('france')} style={{ width: 16, height: 11, borderRadius: 2 }} alt="" />
            <img src={flagURI('allemagne')} style={{ width: 16, height: 11, borderRadius: 2 }} alt="" />
            {t.hero.eyebrow}
          </div>
          <h1>{t.hero.titre1}<br /><span>{t.hero.titre2}</span></h1>
          <p>{t.hero.desc(s.nom, s.adresse)}</p>
          <div className="hero-cta">
            <a href="#stock" onClick={e => { e.preventDefault(); scrollTo('stock') }} className="btn-hero-primary">{t.hero.voirStock}</a>
            <a href="#showroom" onClick={e => { e.preventDefault(); scrollTo('showroom') }} className="btn-hero-secondary">{t.hero.visiterShowroom}</a>
          </div>
        </div>
      </header>

      {/* ── Trust bar ── */}
      <div className="trust-bar">
        <div className="trust-grid">
          <div><div className="num">+500</div><div className="lbl">{t.trust.livres}</div></div>
          <div><div className="num">FR · DE</div><div className="lbl">{t.trust.origine}</div></div>
          <div><div className="num">100%</div><div className="lbl">{t.trust.controles}</div></div>
          <div><div className="num">DA</div><div className="lbl">{t.trust.prix}</div></div>
        </div>
      </div>

      {/* ── Stock ── */}
      <section id="stock" className="section">
        <div className="section-head">
          <h2>{t.catalogue.titre}</h2>
          <div className="bar" />
          <p>{t.catalogue.desc}</p>
        </div>

        <div className="filters-bar">
          <input placeholder={t.catalogue.rechercher} value={search} onChange={e => setSearch(e.target.value)} />
          <select value={brand} onChange={e => setBrand(e.target.value)}>
            <option value="all">{t.catalogue.toutesMarques}</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value)}>
            <option value="all">{t.catalogue.toutesOrigines}</option>
            {Object.entries(ORIGINS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={budget} onChange={e => setBudget(e.target.value)}>
            <option value="all">{t.catalogue.toutBudget}</option>
            <option value="low">{t.catalogue.budgetLow}</option>
            <option value="mid">{t.catalogue.budgetMid}</option>
            <option value="high">{t.catalogue.budgetHigh}</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="default">{t.catalogue.triDefaut}</option>
            <option value="price_asc">{t.catalogue.prixCroissant}</option>
            <option value="price_desc">{t.catalogue.prixDecroissant}</option>
            <option value="year_desc">{t.catalogue.anneeRecent}</option>
            <option value="year_asc">{t.catalogue.anneeAncien}</option>
            <option value="km_asc">{t.catalogue.kmMoins}</option>
          </select>
        </div>

        {loading ? (
          <div className="spinner">{t.catalogue.chargement}</div>
        ) : sorted.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 44 }}>🚗</div>
            <p>{vehicles.length === 0 ? t.catalogue.aucunVehiculeLigne : t.catalogue.aucunCorrespond}</p>
          </div>
        ) : (
          <div className="veh-grid">
            {sorted.map(v => {
              const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
              const disabled = v.statut === 'vendu'
              return (
                <div key={v.id} className="veh-card" style={{ opacity: disabled ? .55 : 1 }}>
                  <div className="veh-card-img" style={{ cursor: 'pointer' }} onClick={() => setOpenVehicle(v)}>
                    <div className="veh-statut-badge" style={{ background: statutColor(v.statut) }}>{statutLabel(v.statut, lang)}</div>
                    <div className="veh-flag-badge">
                      <img src={flagURI(v.provenance)} style={{ width: 14, height: 10, borderRadius: 2 }} alt="" />
                      {ORIGINS[v.provenance]?.label || 'Monde'}
                    </div>
                    {v.badge && <div className="veh-badge-tag">{v.badge}</div>}
                    {v.statut === 'vendu' && <div className="stamp-sold">{lang === 'ar' ? 'مباعة' : 'Vendu'}</div>}
                    <img src={v.img || PLACEHOLDER_IMG} alt={v.marque} />
                    <div className="veh-price-strip">
                      <span className="price">{fmt(v.prix)}</span>
                      {disc > 0 && <span className="old">{fmt(v.prix_old)}</span>}
                    </div>
                  </div>
                  <div className="veh-card-body">
                    <div className="veh-card-top" style={{ cursor: 'pointer' }} onClick={() => setOpenVehicle(v)}>
                      <div>
                        <h3>{v.marque}</h3>
                        <p>{v.modele}</p>
                      </div>
                      <span className="veh-year-badge">{v.annee}</span>
                    </div>
                    <div className="veh-specs">
                      <span>🛣️ {v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : t.card.neuf}</span>
                      <span>⚙️ {v.transmission}</span>
                      <span>⛽ {v.carburant}</span>
                      <span>📅 {v.annee}</span>
                    </div>
                    <div className="veh-actions">
                      <button className="btn-veh-reserve" disabled={disabled} onClick={() => setReserveVehicle(v)}>
                        {disabled ? t.card.vendu : t.card.reserver}
                      </button>
                      <button className="btn-veh-wa" title="WhatsApp" onClick={() => waDirect(v)}>💬</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Showroom ── */}
      <section id="showroom" className="section">
        <div className="section-head">
          <h2>{t.showroom.titre}</h2>
          <div className="bar" />
        </div>
        <div className="showroom-grid">
          <div>
            <div className="showroom-info-row">
              <span className="ic">📍</span>
              <div><h4>{t.showroom.adresse}</h4><p>{s.nom}<br />{s.adresse}</p></div>
            </div>
            <div className="showroom-info-row">
              <span className="ic">📞</span>
              <div><h4>{t.showroom.telephone}</h4><p>+{s.telephone}</p></div>
            </div>
            <div className="showroom-info-row">
              <span className="ic">🕐</span>
              <div><h4>{t.showroom.horaires}</h4><p>{s.horaires}</p></div>
            </div>
            <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="btn-hero-primary" style={{ marginTop: 10 }}>
              {t.showroom.itineraire}
            </a>
          </div>
          <div className="showroom-map">
            <iframe title="Showroom" src={s.mapsEmbed} loading="lazy" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-auto">
        <div className="footer-auto-inner">
          <div>
            <div className="footer-logo">ILYAS<em>AUTO</em></div>
            <div className="footer-sub">© {new Date().getFullYear()} {s.nom} — {t.footer.droits}</div>
          </div>
          <div className="footer-social">
            <a href={waLink('Bonjour ' + s.nom, s.whatsapp)} target="_blank" rel="noreferrer">💬</a>
            <button onClick={() => setTrackingOpen(true)} className="footer-track-btn">{t.footer.suivre}</button>
            {s.facebook && <a href={s.facebook} target="_blank" rel="noreferrer">📘</a>}
            {s.instagram && <a href={s.instagram} target="_blank" rel="noreferrer">📷</a>}
          </div>
        </div>
      </footer>

      {/* ── WhatsApp flottant ── */}
      <a className="wa-float" href={waLink('Bonjour ' + s.nom + ', je vous contacte depuis votre site web.', s.whatsapp)} target="_blank" rel="noreferrer">💬</a>

      {/* ── Fiche détail véhicule ── */}
      {openVehicle && (
        <VehicleDetail
          vehicle={openVehicle}
          onClose={() => setOpenVehicle(null)}
          onReserve={v => { setOpenVehicle(null); setReserveVehicle(v) }}
        />
      )}

      {/* ── Modal réservation ── */}
      {reserveVehicle && <ReservationModal vehicle={reserveVehicle} onClose={() => setReserveVehicle(null)} />}

      {/* ── Suivi de réservation ── */}
      {trackingOpen && <TrackingPage onClose={() => setTrackingOpen(false)} />}
    </div>
  )
}

export default function PublicSite() {
  return (
    <LangProvider>
      <PublicSiteInner />
    </LangProvider>
  )
}
