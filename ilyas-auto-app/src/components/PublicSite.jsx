import { lazy, Suspense, useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { fmt, waLink } from '../utils/notify'
import { ORIGINS, flagURI, PLACEHOLDER_IMG, BODY_TYPES } from '../data/vehicles-data'
import { getSettings, parseBrandIdentity, parseShowroomHeroImages } from '../utils/useSettings'
import { statutLabel } from '../i18n/translations'
import { LangProvider, useLang } from '../i18n/LangContext'
const ReservationModal = lazy(() => import('./ReservationModal'))
const VehicleDetail = lazy(() => import('./VehicleDetail'))
import AnnouncementBar from './AnnouncementBar'
const TrackingPage = lazy(() => import('./TrackingPage'))
import VehicleGallery from './VehicleGallery'
const VehicleCompare = lazy(() => import('./VehicleCompare'))
import EditorialSelection from './EditorialSelection'
import TestimonialsSection from './TestimonialsSection'
const SellVehicleModal = lazy(() => import('./SellVehicleModal'))
import CONFIG from '../config'

function statutColor(key) {
  return key === 'disponible' ? '#22c55e' : key === 'reserve' ? '#f59e0b' : '#6b7280'
}

function PublicSiteInner() {
  const { lang, t, rtl, toggleLang } = useLang()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [stockError, setStockError] = useState('')
  const [stockReloadKey, setStockReloadKey] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reserveVehicle, setReserveVehicle] = useState(null)
  const [openVehicle, setOpenVehicle] = useState(null)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [settings, setSettings] = useState({})
  const [compareList, setCompareList] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [sellOpen, setSellOpen] = useState(false)
  const [vehicleCondition, setVehicleCondition] = useState('all')
  const [publicTheme, setPublicTheme] = useState(() => { try { const saved = window.localStorage.getItem('hbr_public_theme'); return ['light', 'dark', 'ivory'].includes(saved) ? saved : 'light' } catch { return 'light' } })

  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [bodyType, setBodyType] = useState('all')
  const [budget, setBudget] = useState('all')
  const [sort, setSort] = useState('default')
  const [heroIdx, setHeroIdx] = useState(0)

  useEffect(() => {
    let active = true

    async function loadStock() {
      setLoading(true)
      setStockError('')
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        if (error) throw error
        if (active) setVehicles(data || [])
      } catch (error) {
        console.error('HBR AUTO stock:', error)
        if (active) {
          setVehicles([])
          setStockError('Le stock ne peut pas être chargé pour le moment. Vérifie ta connexion puis réessaie.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStock()
    getSettings().then(data => { if (!active) return; setSettings(data); try { if (!window.localStorage.getItem('hbr_public_theme') && ['light','dark','ivory'].includes(data.site_theme)) setPublicTheme(data.site_theme) } catch {} }).catch(error => {
      console.warn('HBR AUTO settings:', error)
    })

    return () => { active = false }
  }, [stockReloadKey])

  // Ouvre directement la fiche lorsqu'un visiteur arrive avec un lien partagé.
  useEffect(() => {
    if (loading) return
    const syncVehicleFromUrl = () => {
      const id = new URLSearchParams(window.location.search).get('vehicule')
      if (!id) {
        setOpenVehicle(null)
        return
      }
      const match = vehicles.find(vehicle => String(vehicle.id) === String(id))
      setOpenVehicle(match || null)
    }
    syncVehicleFromUrl()
    window.addEventListener('popstate', syncVehicleFromUrl)
    return () => window.removeEventListener('popstate', syncVehicleFromUrl)
  }, [loading, vehicles])

  const s = useMemo(() => ({
    nom:        settings.shop_name       || 'Nabil Auto',
    telephone:  settings.shop_phone      || CONFIG.telephone,
    whatsapp:   settings.shop_whatsapp   || CONFIG.whatsapp,
    adresse:    settings.shop_address    || CONFIG.adresse,
    horaires:   settings.shop_horaires   || CONFIG.horaires,
    mapsUrl:    settings.shop_maps_url   || CONFIG.mapsUrl,
    mapsEmbed:  settings.shop_maps_embed || CONFIG.mapsEmbed,
    facebook:   CONFIG.facebook,
    instagram:  CONFIG.instagram,
    phones:     (() => {
      try {
        const parsed = JSON.parse(settings.shop_phones || '[]')
        const savedPhones = Array.isArray(parsed) ? parsed.filter(phone => phone?.number) : []
        const fallbackPhone = settings.shop_phone || CONFIG.telephone
        return savedPhones.length > 0 ? savedPhones : (fallbackPhone ? [{ label: '', number: fallbackPhone }] : [])
      } catch {
        const fallbackPhone = settings.shop_phone || CONFIG.telephone
        return fallbackPhone ? [{ label: '', number: fallbackPhone }] : []
      }
    })(),
  }), [settings])

  // Découpe le nom du showroom pour le pied de page (évite une référence globale inexistante).
  const logoParts = useMemo(() => {
    const parts = String(s.nom || 'Nabil Auto').trim().split(/\\s+/).filter(Boolean)
    const last = parts.pop() || 'Auto'
    return { rest: parts.join(' '), last }
  }, [s.nom])

  const brandIdentity = useMemo(() => parseBrandIdentity(settings.brand_identity), [settings.brand_identity])

  // Logo fourni par l'administrateur ; à défaut, le nom reste en texte simple.
  const showroomLogoUrl = brandIdentity.logoUrl

  useEffect(() => {
    const title = `${s.nom} — Véhicules neufs & d’occasion`
    const description = `Découvrez le stock de ${s.nom} : véhicules neufs et d’occasion, achat, vente, reprise et échange.`
    document.title = title
    const setMeta = (selector, value) => {
      const element = document.querySelector(selector)
      if (element) element.setAttribute('content', value)
    }
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:site_name"]', s.nom)
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description)
    setMeta('meta[property="og:url"]', window.location.origin + '/')
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', window.location.origin + '/')
  }, [s.nom])

  const brands = useMemo(() => [...new Set(vehicles.map(v => v.marque))].sort(), [vehicles])

  const customHeroImages = useMemo(() => parseShowroomHeroImages(settings.hero_images), [settings.hero_images])
  const heroImages = useMemo(
    () => customHeroImages.length
      ? customHeroImages.map(image => image.url)
      : vehicles.filter(v => v.img).slice(0, 3).map(v => v.img),
    [customHeroImages, vehicles]
  )

  useEffect(() => {
    setHeroIdx(0)
    if (heroImages.length < 2) return
    const id = setInterval(() => setHeroIdx(i => (i + 1) % heroImages.length), 5000)
    return () => clearInterval(id)
  }, [heroImages.length, settings.hero_images])

  function toggleCompare(v) {
    setCompareList(prev => {
      if (prev.find(x => x.id === v.id)) return prev.filter(x => x.id !== v.id)
      if (prev.length >= 3) return prev
      return [...prev, v]
    })
  }

  const recentVehicles = useMemo(
    () => [...vehicles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [vehicles]
  )

  const getVehicleCondition = v => v.etat_vehicule || (Number(v.km || 0) > 0 ? 'occasion' : 'neuf')
  const newVehicleCount = vehicles.filter(v => getVehicleCondition(v) === 'neuf').length
  const usedVehicleCount = vehicles.filter(v => getVehicleCondition(v) === 'occasion').length

  const filtered = vehicles.filter(v => {
    const condition = getVehicleCondition(v)
    if (vehicleCondition !== 'all' && condition !== vehicleCondition) return false
    if (brand !== 'all' && v.marque !== brand) return false
    if (origin !== 'all' && v.provenance !== origin) return false
    if (bodyType !== 'all' && v.carrosserie !== bodyType) return false
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

  function togglePublicTheme() {
    const nextTheme = publicTheme === 'dark' ? 'light' : 'dark'
    setPublicTheme(nextTheme)
    try { window.localStorage.setItem('hbr_public_theme', nextTheme) } catch {}
  }

  function scrollTo(id) {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  function openVehicleDetail(vehicle) {
    setOpenVehicle(vehicle)
    if (!vehicle?.id) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('vehicule') === String(vehicle.id)) return
    url.searchParams.set('vehicule', String(vehicle.id))
    window.history.pushState({ vehicleId: String(vehicle.id) }, '', url.pathname + url.search + url.hash)
  }

  function closeVehicleDetail() {
    setOpenVehicle(null)
    const url = new URL(window.location.href)
    if (!url.searchParams.has('vehicule')) return
    url.searchParams.delete('vehicule')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }

  function waDirect(v) {
    const text = `Bonjour ${s.nom}, je suis intéressé par la ${v.marque} ${v.modele} (${v.annee}) affichée à ${fmt(v.prix)}. Est-elle toujours disponible ?`
    window.open(waLink(text, s.whatsapp), '_blank')
  }

  return (
    <div className="app" data-theme={publicTheme} dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Bande nouveautés & promos ── */}
      {!loading && <VehicleGallery vehicles={recentVehicles} onVehicleClick={openVehicleDetail} newLabel={t.card.nouveau} />}

      <AnnouncementBar />
      {/* ── Navigation ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a
            href="#accueil"
            className="nav-logo nav-brand"
            aria-label={s.nom}
          >
            {showroomLogoUrl
              ? <img className="nav-custom-logo" src={showroomLogoUrl} alt={s.nom} />
              : <span className="nav-brand-fallback">{s.nom}</span>}
          </a>
          <button type="button" onClick={togglePublicTheme} className="theme-toggle mobile-theme-toggle" aria-pressed={publicTheme === "dark"} aria-label={publicTheme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'} title={publicTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}><span aria-hidden="true">{publicTheme === 'dark' ? '☀️' : '🌙'}</span><span className="theme-toggle-label">{publicTheme === 'dark' ? 'Clair' : 'Sombre'}</span></button>
          <div className="nav-links">
            <a onClick={() => scrollTo('accueil')} href="#accueil">{t.nav.accueil}</a>
            <a onClick={() => scrollTo('stock')} href="#stock">{t.nav.stock}</a>
            <a onClick={() => scrollTo('showroom')} href="#showroom">{t.nav.showroom}</a>
            <a onClick={e => { e.preventDefault(); setTrackingOpen(true) }} href="#">{t.nav.suivi}</a>
            <a onClick={e => { e.preventDefault(); setVehicleCondition('occasion'); scrollTo('stock') }} href="#stock">{t.nav.occasion}</a>
            <a onClick={e => { e.preventDefault(); setSellOpen(true) }} href="#">{t.nav.venteEchange}</a>
            <button type="button" onClick={togglePublicTheme} className="theme-toggle" aria-pressed={publicTheme === "dark"} aria-label={publicTheme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'} title={publicTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}><span aria-hidden="true">{publicTheme === 'dark' ? '☀️' : '🌙'}</span><span className="theme-toggle-label">{publicTheme === 'dark' ? 'Clair' : 'Sombre'}</span></button>
            <button onClick={toggleLang} className="lang-toggle">{lang === 'fr' ? '🇩🇿 عربي' : '🇫🇷 Français'}</button>
            <a href={waLink('Bonjour ' + s.nom + ', je vous contacte depuis votre site web.', s.whatsapp)} target="_blank" rel="noreferrer" className="nav-wa-btn">💬 {t.nav.whatsapp}</a>
          </div>
          <button className="nav-burger" type="button" aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(o => !o)}>☰</button>
        </div>
        <div className={`nav-mobile ${mobileOpen ? 'open' : ''}`}>
          <a onClick={() => scrollTo('accueil')} href="#accueil">{t.nav.accueil}</a>
          <a onClick={() => scrollTo('stock')} href="#stock">{t.nav.stock}</a>
          <a onClick={() => scrollTo('showroom')} href="#showroom">{t.nav.showroom}</a>
          <a onClick={e => { e.preventDefault(); setMobileOpen(false); setTrackingOpen(true) }} href="#">{t.nav.suivi}</a>
          <a onClick={e => { e.preventDefault(); setMobileOpen(false); setVehicleCondition('occasion'); scrollTo('stock') }} href="#stock">{t.nav.occasion}</a>
          <a onClick={e => { e.preventDefault(); setMobileOpen(false); setSellOpen(true) }} href="#">{t.nav.venteEchange}</a>
          <button onClick={toggleLang} className="lang-toggle" style={{ marginTop: 6, width: 'fit-content' }}>{lang === 'fr' ? '🇩🇿 عربي' : '🇫🇷 Français'}</button>
          <a href={waLink('Bonjour ' + s.nom + ', je vous contacte depuis votre site web.', s.whatsapp)} target="_blank" rel="noreferrer">💬 {t.nav.whatsapp}</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header id="accueil" className="hero-auto">
        {heroImages.map((img, i) => (
          <div key={i} className={`hero-bg-slide ${i === heroIdx ? 'active' : ''}`} style={{ backgroundImage: `url(${img})` }} />
        ))}
        <div className="hero-auto-overlay" />
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
          <div><div className="num">NEUF · OCCASION</div><div className="lbl">{t.trust.stock}</div></div>
          <div><div className="num">ACHAT · VENTE</div><div className="lbl">{t.trust.vente}</div></div>
          <div><div className="num">REPRISE</div><div className="lbl">{t.trust.reprise}</div></div>
          <div><div className="num">{s.nom}</div><div className="lbl">{t.trust.accompagnement}</div></div>
        </div>
      </div>

      {/* ── La Sélection (collections éditorialisées) ── */}
      {!loading && <EditorialSelection vehicles={vehicles} onOpenVehicle={setOpenVehicle} />}

      {/* ── Stock ── */}
      <section id="stock" className="section">
        <div className="section-head">
          <h2>{t.catalogue.titre}</h2>
          <div className="bar" />
          <p>{t.catalogue.desc}</p>
        </div>

        <div className="vehicle-category-tabs" role="group" aria-label="Catégorie des véhicules">
          <button type="button" className={vehicleCondition === 'all' ? 'active' : ''} onClick={() => setVehicleCondition('all')}>{t.catalogue.toutesCategories} <span>{vehicles.length}</span></button>
          <button type="button" className={vehicleCondition === 'neuf' ? 'active' : ''} onClick={() => setVehicleCondition('neuf')}>🚘 {t.catalogue.neufs} <span>{newVehicleCount}</span></button>
          <button type="button" className={vehicleCondition === 'occasion' ? 'active' : ''} onClick={() => setVehicleCondition('occasion')}>🔄 {t.catalogue.occasions} <span>{usedVehicleCount}</span></button>
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
          <select value={bodyType} onChange={e => setBodyType(e.target.value)}>
            <option value="all">Toutes carrosseries</option>
            {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
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
          <div className="spinner" role="status" aria-live="polite">{t.catalogue.chargement}</div>
        ) : stockError ? (
          <div className="empty" role="alert">
            <div style={{ fontSize: 36 }}>⚠️</div>
            <p>{stockError}</p>
            <button className="btn-hero-primary" onClick={() => setStockReloadKey(key => key + 1)}>Réessayer</button>
          </div>
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
                  <div
                    className="veh-card-img"
                    role="button"
                    tabIndex={0}
                    aria-label={`${v.marque} ${v.modele} — voir les photos et détails`}
                    onClick={() => openVehicleDetail(v)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVehicleDetail(v) } }}
                  >
                    <div className="veh-statut-badge" data-status={v.statut} style={{ background: statutColor(v.statut) }}>{statutLabel(v.statut, lang)}</div>
                    <div className="veh-flag-badge">
                      <img src={flagURI(v.provenance)} style={{ width: 14, height: 10, borderRadius: 2 }} alt="" />
                      {ORIGINS[v.provenance]?.label || 'Monde'}
                    </div>
                    {v.badge && <div className="veh-badge-tag">{v.badge}</div>}
                    {v.statut === 'vendu' && <div className="stamp-sold">{lang === 'ar' ? 'مباعة' : 'Vendu'}</div>}
                    <img src={v.img || PLACEHOLDER_IMG} alt={`${v.marque} ${v.modele}`} loading="lazy" decoding="async" />
                    <div className="veh-price-strip">
                      <span className="price">{fmt(v.prix)}</span>
                      {disc > 0 && <span className="old">{fmt(v.prix_old)}</span>}
                    </div>
                  </div>
                  <a className="veh-card-wa-bar"
                    href={waLink(`Bonjour, je suis intéressé(e) par la ${v.marque} ${v.modele} affichée sur votre site.`, s.whatsapp)}
                    target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                    <span aria-hidden="true">☏</span>
                    Discuter sur WhatsApp
                  </a>
                  <div className="veh-card-body">
                    <div className="veh-card-top" style={{ cursor: 'pointer' }} onClick={() => openVehicleDetail(v)}>
                      <div>
                        <h3>{v.marque}</h3>
                        <p>{v.modele}</p>
                        <span className={`veh-condition-label ${getVehicleCondition(v) === 'occasion' ? 'used' : 'new'}`}>
                          {getVehicleCondition(v) === 'occasion' ? t.catalogue.occasion : t.catalogue.neuf}
                        </span>
                      </div>
                      <span className="veh-year-badge">{v.annee}</span>
                    </div>
                    <div className="veh-specs">
                      <span>🛣️ {v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : t.card.neuf}</span>
                      <span>⚙️ {v.transmission}</span>
                      <span>⛽ {v.carburant}</span>
                      <span>📅 {v.annee}</span>
                    </div>
                    <label className="veh-compare-check">
                      <input type="checkbox" checked={!!compareList.find(x => x.id === v.id)} onChange={() => toggleCompare(v)} />
                      ⚖️ Comparer
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Témoignages ── */}
      <TestimonialsSection supabase={supabase} />

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
            {s.phones.length > 0 && <div className="showroom-info-row">
              <span className="ic">📞</span>
              <div><h4>{t.showroom.telephone}</h4>
                {s.phones.map((p, i) => (
                  <p key={i}>{p.label && <strong style={{ color: 'rgba(255,255,255,.85)' }}>{p.label} : </strong>}<a href={`tel:+${p.number}`} style={{ color: 'inherit', textDecoration: 'none' }}>+{p.number}</a></p>
                ))}
              </div>
            </div>}
            <div className="showroom-info-row">
              <span className="ic">🕐</span>
              <div><h4>{t.showroom.horaires}</h4><p>{s.horaires}</p></div>
            </div>
            {s.mapsUrl && <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="btn-hero-primary" style={{ marginTop: 10 }}>
              {t.showroom.itineraire}
            </a>}
          </div>
          {s.mapsEmbed && <div className="showroom-map">
            <iframe title="Showroom" src={s.mapsEmbed} loading="lazy" />
          </div>}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-auto">
        <div className="footer-auto-inner">
          <div>
            <div className="footer-logo">{logoParts.rest && logoParts.rest + ' '}<em>{logoParts.last}</em></div>
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

      {/* ── Barre flottante comparateur ── */}
      {compareList.length > 0 && (
        <div className="cmp-float-bar">
          <div className="cmp-float-items">
            {compareList.map(v => (
              <div key={v.id} className="cmp-float-chip">
                {v.marque} {v.modele}
                <button onClick={() => toggleCompare(v)}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn-hero-primary" disabled={compareList.length < 2} onClick={() => setCompareOpen(true)}>
            ⚖️ Comparer ({compareList.length})
          </button>
        </div>
      )}

      {/* ── Modal comparateur ── */}
      {compareOpen && (
        <Suspense fallback={<div className="spinner" role="status">Chargement du comparateur…</div>}>
          <VehicleCompare
            vehicles={compareList}
            onClose={() => setCompareOpen(false)}
            onOpenVehicle={v => { setCompareOpen(false); openVehicleDetail(v) }}
          />
        </Suspense>
      )}

      {/* ── Fiche détail véhicule ── */}
      {openVehicle && (
        <Suspense fallback={<div className="spinner" role="status">Chargement de la fiche…</div>}>
          <VehicleDetail
            shopName={s.nom}
            vehicle={openVehicle}
            onClose={closeVehicleDetail}
            onReserve={v => { setOpenVehicle(null); setReserveVehicle(v) }}
          />
        </Suspense>
      )}

      {/* ── Modal réservation ── */}
      {reserveVehicle && <Suspense fallback={<div className="spinner" role="status">Chargement…</div>}><ReservationModal vehicle={reserveVehicle} shopName={s.nom} whatsapp={s.whatsapp} onClose={() => setReserveVehicle(null)} /></Suspense>}

      {/* ── Suivi de réservation ── */}
      {trackingOpen && <Suspense fallback={<div className="spinner" role="status">Chargement…</div>}><TrackingPage onClose={() => setTrackingOpen(false)} /></Suspense>}

      {/* ── Vendre mon véhicule ── */}
      {sellOpen && <Suspense fallback={<div className="spinner" role="status">Chargement…</div>}><SellVehicleModal onClose={() => setSellOpen(false)} vehicles={vehicles} tradeMarginPercent={settings.trade_margin_percent ?? 5} whatsapp={s.whatsapp} shopName={s.nom} /></Suspense>}
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
