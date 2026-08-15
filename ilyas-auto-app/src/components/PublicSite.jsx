import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { fmt, waLink } from '../utils/notify'
import { ORIGINS, flagURI, STATUTS, PLACEHOLDER_IMG } from '../data/vehicles-data'
import ReservationModal from './ReservationModal'
import VehicleDetail from './VehicleDetail'
import AnnouncementBar from './AnnouncementBar'
import TrackingPage from './TrackingPage'
import CONFIG from '../config'

function statutOf(key) { return STATUTS.find(s => s.key === key) || STATUTS[0] }

export default function PublicSite() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reserveVehicle, setReserveVehicle] = useState(null)
  const [openVehicle, setOpenVehicle] = useState(null)
  const [trackingOpen, setTrackingOpen] = useState(false)

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
  }, [])

  const brands = useMemo(() => [...new Set(vehicles.map(v => v.marque))].sort(), [vehicles])

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
    const text = `Bonjour ${CONFIG.nom}, je suis intéressé par la ${v.marque} ${v.modele} (${v.annee}) affichée à ${fmt(v.prix)}. Est-elle toujours disponible ?`
    window.open(waLink(text), '_blank')
  }

  return (
    <div className="app">
      <AnnouncementBar />
      {/* ── Navigation ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="#accueil" className="nav-logo">ILYAS<em>AUTO</em></a>
          <div className="nav-links">
            <a onClick={() => scrollTo('accueil')} href="#accueil">Accueil</a>
            <a onClick={() => scrollTo('stock')} href="#stock">Notre Stock</a>
            <a onClick={() => scrollTo('showroom')} href="#showroom">Showroom</a>
            <a onClick={() => setTrackingOpen(true)} href="#" onClickCapture={e => e.preventDefault()}>Suivi commande</a>
            <a href={waLink('Bonjour ' + CONFIG.nom + ', je vous contacte depuis votre site web.')} target="_blank" rel="noreferrer" className="nav-wa-btn">💬 WhatsApp</a>
          </div>
          <button className="nav-burger" onClick={() => setMobileOpen(o => !o)}>☰</button>
        </div>
        <div className={`nav-mobile ${mobileOpen ? 'open' : ''}`}>
          <a onClick={() => scrollTo('accueil')} href="#accueil">Accueil</a>
          <a onClick={() => scrollTo('stock')} href="#stock">Notre Stock</a>
          <a onClick={() => scrollTo('showroom')} href="#showroom">Showroom</a>
          <a onClick={e => { e.preventDefault(); setMobileOpen(false); setTrackingOpen(true) }} href="#">Suivi commande</a>
          <a href={waLink('Bonjour ' + CONFIG.nom + ', je vous contacte depuis votre site web.')} target="_blank" rel="noreferrer">💬 WhatsApp</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header id="accueil" className="hero-auto">
        <div className="hero-auto-content">
          <div className="hero-eyebrow">
            <img src={flagURI('france')} style={{ width: 16, height: 11, borderRadius: 2 }} alt="" />
            <img src={flagURI('allemagne')} style={{ width: 16, height: 11, borderRadius: 2 }} alt="" />
            Import direct : France · Allemagne · Monde
          </div>
          <h1>VOTRE PROCHAINE VOITURE<br /><span>VIENT D'EUROPE</span></h1>
          <p>Véhicules neufs & occasion, contrôlés et disponibles immédiatement au showroom {CONFIG.nom}, {CONFIG.adresse}.</p>
          <div className="hero-cta">
            <a href="#stock" onClick={e => { e.preventDefault(); scrollTo('stock') }} className="btn-hero-primary">🚗 Voir le stock</a>
            <a href="#showroom" onClick={e => { e.preventDefault(); scrollTo('showroom') }} className="btn-hero-secondary">📍 Visiter le showroom</a>
          </div>
        </div>
      </header>

      {/* ── Trust bar ── */}
      <div className="trust-bar">
        <div className="trust-grid">
          <div><div className="num">+500</div><div className="lbl">Véhicules livrés</div></div>
          <div><div className="num">FR · DE</div><div className="lbl">Origine garantie</div></div>
          <div><div className="num">100%</div><div className="lbl">Contrôlés avant vente</div></div>
          <div><div className="num">DA</div><div className="lbl">Prix en dinars</div></div>
        </div>
      </div>

      {/* ── Stock ── */}
      <section id="stock" className="section">
        <div className="section-head">
          <h2>NOTRE CATALOGUE</h2>
          <div className="bar" />
          <p>Véhicules importés, contrôlés et prêts à rouler. Prix affichés en dinars algériens (DA).</p>
        </div>

        <div className="filters-bar">
          <input placeholder="🔍 Rechercher un modèle..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={brand} onChange={e => setBrand(e.target.value)}>
            <option value="all">Toutes les marques</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={origin} onChange={e => setOrigin(e.target.value)}>
            <option value="all">Toutes origines</option>
            {Object.entries(ORIGINS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={budget} onChange={e => setBudget(e.target.value)}>
            <option value="all">Tout budget</option>
            <option value="low">Moins de 4 000 000 DA</option>
            <option value="mid">4 000 000 – 7 000 000 DA</option>
            <option value="high">Plus de 7 000 000 DA</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="default">Tri par défaut</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="year_desc">Année (récent)</option>
            <option value="year_asc">Année (ancien)</option>
            <option value="km_asc">Kilométrage (moins)</option>
          </select>
        </div>

        {loading ? (
          <div className="spinner">Chargement du stock…</div>
        ) : sorted.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 44 }}>🚗</div>
            <p>{vehicles.length === 0 ? 'Aucun véhicule en ligne pour le moment.' : 'Aucun véhicule ne correspond à vos critères.'}</p>
          </div>
        ) : (
          <div className="veh-grid">
            {sorted.map(v => {
              const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
              const st = statutOf(v.statut)
              const disabled = v.statut === 'vendu'
              return (
                <div key={v.id} className="veh-card" style={{ opacity: disabled ? .55 : 1 }}>
                  <div className="veh-card-img" style={{ cursor: 'pointer' }} onClick={() => setOpenVehicle(v)}>
                    <div className="veh-statut-badge" style={{ background: st.color }}>{st.label}</div>
                    <div className="veh-flag-badge">
                      <img src={flagURI(v.provenance)} style={{ width: 14, height: 10, borderRadius: 2 }} alt="" />
                      {ORIGINS[v.provenance]?.label || 'Monde'}
                    </div>
                    {v.badge && <div className="veh-badge-tag">{v.badge}</div>}
                    {v.statut === 'vendu' && <div className="stamp-sold">Vendu</div>}
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
                      <span>🛣️ {v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : 'Neuf / 0 km'}</span>
                      <span>⚙️ {v.transmission}</span>
                      <span>⛽ {v.carburant}</span>
                      <span>📅 {v.annee}</span>
                    </div>
                    <div className="veh-actions">
                      <button className="btn-veh-reserve" disabled={disabled} onClick={() => setReserveVehicle(v)}>
                        {disabled ? 'VÉHICULE VENDU' : 'RÉSERVER / ACHETER'}
                      </button>
                      <button className="btn-veh-wa" title="Contacter sur WhatsApp" onClick={() => waDirect(v)}>💬</button>
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
          <h2>VISITEZ NOTRE SHOWROOM</h2>
          <div className="bar" />
        </div>
        <div className="showroom-grid">
          <div>
            <div className="showroom-info-row">
              <span className="ic">📍</span>
              <div><h4>Adresse</h4><p>{CONFIG.nom} — Showroom & parc d'exposition<br />{CONFIG.adresse}</p></div>
            </div>
            <div className="showroom-info-row">
              <span className="ic">📞</span>
              <div><h4>Téléphone / WhatsApp</h4><p>+{CONFIG.telephone}</p></div>
            </div>
            <div className="showroom-info-row">
              <span className="ic">🕐</span>
              <div><h4>Horaires</h4><p>{CONFIG.horaires}</p></div>
            </div>
            <a href={CONFIG.mapsUrl} target="_blank" rel="noreferrer" className="btn-hero-primary" style={{ marginTop: 10 }}>
              🧭 Itinéraire GPS (Google Maps)
            </a>
          </div>
          <div className="showroom-map">
            <iframe title="Showroom" src={CONFIG.mapsEmbed} loading="lazy" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-auto">
        <div className="footer-auto-inner">
          <div>
            <div className="footer-logo">ILYAS<em>AUTO</em></div>
            <div className="footer-sub">© {new Date().getFullYear()} {CONFIG.nom} — Tous droits réservés.</div>
          </div>
          <div className="footer-social">
            <a href={waLink('Bonjour ' + CONFIG.nom)} target="_blank" rel="noreferrer">💬</a>
            <button onClick={() => setTrackingOpen(true)} className="footer-track-btn">📦 Suivre ma réservation</button>
            {CONFIG.facebook && <a href={CONFIG.facebook} target="_blank" rel="noreferrer">📘</a>}
            {CONFIG.instagram && <a href={CONFIG.instagram} target="_blank" rel="noreferrer">📷</a>}
          </div>
        </div>
      </footer>

      {/* ── WhatsApp flottant ── */}
      <a className="wa-float" href={waLink('Bonjour ' + CONFIG.nom + ', je vous contacte depuis votre site web.')} target="_blank" rel="noreferrer">💬</a>

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
