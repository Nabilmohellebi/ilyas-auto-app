import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { saveSetting, getSettings } from '../../utils/useSettings'
import { openWA, fmt } from '../../utils/notify'
import { STATUTS, PLACEHOLDER_IMG, flagURI } from '../../data/vehicles-data'
import VehicleForm from './VehicleForm'

const RES_STATUTS = [
  { key: 'nouvelle',  label: '🆕 Nouvelle' },
  { key: 'contactee', label: '📞 Contactée' },
  { key: 'vendue',    label: '✅ Vendue' },
  { key: 'annulee',   label: '❌ Annulée' },
]

function statutOf(key) { return STATUTS.find(s => s.key === key) || STATUTS[0] }

// ═══════════════════════════════════════════════
//  PARAMÈTRES
// ═══════════════════════════════════════════════
function AdminSettings({ onLogout, onToast }) {
  const [shop, setShop] = useState({ name: 'HBR Auto', phone: '213550123456', whatsapp: '213550123456', address: 'HBR Melaba, Azazga, Algérie', email: '', horaires: '', mapsUrl: '', mapsEmbed: '' })
  const [phones, setPhones] = useState([])
  const [shopSaving, setShopSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', new1: '', new2: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      setShop({
        name: s.shop_name || 'HBR Auto',
        phone: s.shop_phone || '213550123456',
        whatsapp: s.shop_whatsapp || s.shop_phone || '213550123456',
        address: s.shop_address || 'HBR Melaba, Azazga, Algérie',
        email: s.shop_email || '',
        horaires: s.shop_horaires || 'Samedi – Jeudi : 09h00 – 19h00 · Vendredi : fermé',
        mapsUrl: s.shop_maps_url || '',
        mapsEmbed: s.shop_maps_embed || '',
      })
      // Liste de numéros — si jamais configurée, on part du numéro principal
      try {
        const parsed = JSON.parse(s.shop_phones || '[]')
        setPhones(Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ label: 'Ventes', number: s.shop_phone || '213550123456' }])
      } catch {
        setPhones([{ label: 'Ventes', number: s.shop_phone || '213550123456' }])
      }
    })
  }, [])

  function addPhone() { setPhones(p => [...p, { label: '', number: '' }]) }
  function updatePhone(i, key, val) { setPhones(p => p.map((ph, idx) => idx === i ? { ...ph, [key]: val } : ph)) }
  function removePhone(i) { setPhones(p => p.filter((_, idx) => idx !== i)) }

  async function saveShop() {
    setShopSaving(true)
    try {
      await saveSetting('shop_name', shop.name)
      await saveSetting('shop_phone', shop.phone)
      await saveSetting('shop_whatsapp', shop.whatsapp)
      await saveSetting('shop_email', shop.email)
      await saveSetting('shop_address', shop.address)
      await saveSetting('shop_horaires', shop.horaires)
      await saveSetting('shop_maps_url', shop.mapsUrl)
      await saveSetting('shop_maps_embed', shop.mapsEmbed)
      await saveSetting('shop_phones', JSON.stringify(phones.filter(p => p.number.trim())))
      onToast && onToast('✅ Informations sauvegardées', 'default')
    } catch (e) {
      onToast && onToast('❌ Erreur : ' + e.message, 'error')
    }
    setShopSaving(false)
  }

  async function changePw() {
    if (pwForm.new1.length < 6) { onToast && onToast('❌ Mot de passe trop court (min 6 caractères)', 'error'); return }
    if (pwForm.new1 !== pwForm.new2) { onToast && onToast('❌ Les deux mots de passe ne correspondent pas', 'error'); return }
    setPwSaving(true)
    try {
      const s = await getSettings()
      const currentPw = s.admin_password || import.meta.env.VITE_ADMIN_PASSWORD || 'ilyas2026'
      if (pwForm.current !== currentPw) {
        onToast && onToast('❌ Mot de passe actuel incorrect', 'error')
        setPwSaving(false)
        return
      }
      await saveSetting('admin_password', pwForm.new1)
      setPwForm({ current: '', new1: '', new2: '' })
      onToast && onToast('✅ Mot de passe changé !', 'default')
    } catch (e) {
      onToast && onToast('❌ Erreur : ' + e.message, 'error')
    }
    setPwSaving(false)
  }

  return (
    <div>
      <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 20 }}>⚙️ Paramètres</h3>

      <div className="pf-section" style={{ marginBottom: 14 }}>
        <h3>🏪 Informations du showroom</h3>
        <div className="pf-grid" style={{ marginBottom: 10 }}>
          <div className="form-field"><label>Nom</label><input value={shop.name} onChange={e => setShop(s => ({ ...s, name: e.target.value }))} /></div>
          <div className="form-field"><label>Téléphone</label><input value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))} type="tel" /></div>
          <div className="form-field"><label>WhatsApp</label><input value={shop.whatsapp} onChange={e => setShop(s => ({ ...s, whatsapp: e.target.value }))} type="tel" /></div>
          <div className="form-field"><label>Email</label><input value={shop.email} onChange={e => setShop(s => ({ ...s, email: e.target.value }))} type="email" /></div>
        </div>
        <div className="form-field" style={{ marginBottom: 12 }}><label>Adresse showroom</label><input value={shop.address} onChange={e => setShop(s => ({ ...s, address: e.target.value }))} /></div>
        <div className="form-field" style={{ marginBottom: 12 }}><label>Horaires d'ouverture</label><input value={shop.horaires} onChange={e => setShop(s => ({ ...s, horaires: e.target.value }))} placeholder="Ex: Samedi – Jeudi : 09h00 – 19h00" /></div>
        <div className="form-field" style={{ marginBottom: 12 }}>
          <label>Lien Google Maps (bouton itinéraire)</label>
          <input value={shop.mapsUrl} onChange={e => setShop(s => ({ ...s, mapsUrl: e.target.value }))} placeholder="https://www.google.com/maps/place/..." />
        </div>
        <div className="form-field" style={{ marginBottom: 12 }}>
          <label>Lien Google Maps « intégré » (la carte affichée sur le site)</label>
          <input value={shop.mapsEmbed} onChange={e => setShop(s => ({ ...s, mapsEmbed: e.target.value }))} placeholder="https://maps.google.com/maps?q=...&output=embed" />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 6, lineHeight: 1.6 }}>
            💡 Pour l'obtenir : va sur Google Maps → cherche ton showroom → Partager → Intégrer une carte → copie l'adresse dans <code>src="..."</code>.
          </div>
        </div>
        <button className="btn-save" onClick={saveShop} disabled={shopSaving}>{shopSaving ? '⏳...' : '💾 Sauvegarder'}</button>
      </div>

      <div className="pf-section" style={{ marginBottom: 14 }}>
        <h3>📞 Numéros de téléphone</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 12, lineHeight: 1.5 }}>
          Ajoute autant de numéros que tu veux (ventes, SAV, standard...). Ils s'affichent tous dans la section Showroom du site.
        </p>
        {phones.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input
              placeholder="Ex : Ventes"
              value={p.label}
              onChange={e => updatePhone(i, 'label', e.target.value)}
              style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '10px 12px', color: 'white', fontSize: 13 }}
            />
            <input
              placeholder="213550123456"
              value={p.number}
              onChange={e => updatePhone(i, 'number', e.target.value)}
              type="tel"
              style={{ flex: 1.4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '10px 12px', color: 'white', fontSize: 13 }}
            />
            <button onClick={() => removePhone(i)} style={{ background: 'rgba(230,57,70,.12)', border: '1px solid rgba(230,57,70,.25)', borderRadius: 8, color: '#ffb3b8', cursor: 'pointer', fontSize: 13, padding: '9px 12px', flexShrink: 0 }}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="act-btn" onClick={addPhone}>+ Ajouter un numéro</button>
          <button className="btn-save" onClick={saveShop} disabled={shopSaving}>{shopSaving ? '⏳...' : '💾 Sauvegarder'}</button>
        </div>
      </div>

      <div className="pf-section">
        <h3>🔐 Changer le mot de passe admin</h3>
        <div className="form-field" style={{ marginBottom: 10 }}>
          <label>Mot de passe actuel</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
            <button onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>{showPw ? '🙈' : '👁'}</button>
          </div>
        </div>
        <div className="pf-grid" style={{ marginBottom: 12 }}>
          <div className="form-field"><label>Nouveau mot de passe</label><input type={showPw ? 'text' : 'password'} value={pwForm.new1} onChange={e => setPwForm(f => ({ ...f, new1: e.target.value }))} /></div>
          <div className="form-field"><label>Confirmer</label><input type={showPw ? 'text' : 'password'} value={pwForm.new2} onChange={e => setPwForm(f => ({ ...f, new2: e.target.value }))} /></div>
        </div>
        <button className="btn-save" onClick={changePw} disabled={pwSaving || !pwForm.current || !pwForm.new1}>{pwSaving ? '⏳...' : '🔐 Changer le mot de passe'}</button>
      </div>

      <div className="pf-section" style={{ marginTop: 14, borderColor: 'rgba(230,57,70,.3)' }}>
        <h3>🚪 Session</h3>
        <button className="act-btn danger" onClick={onLogout}>🚪 Se déconnecter</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
//  ADMIN PANEL PRINCIPAL
// ═══════════════════════════════════════════════
export default function AdminPanel({ onLogout, onToast }) {
  const [tab, setTab] = useState('vehicules')
  const [vehicles, setVehicles] = useState([])
  const [reservations, setReservations] = useState([])
  const [bannerMsgs, setBannerMsgs] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [sellRequests, setSellRequests] = useState([])
  const [newTesti, setNewTesti] = useState({ nom: '', role: '', texte: '', note: 5, photo_url: '' })
  const [testiUploading, setTestiUploading] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [resFilter, setResFilter] = useState('all')
  const [editVeh, setEditVeh] = useState(null) // null=fermé, false=nouveau, obj=édition

  const loadVehicles = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('*').order('display_order', { ascending: true })
    setVehicles(data || [])
    setLoading(false)
  }, [])

  const loadReservations = useCallback(async () => {
    const { data } = await supabase.from('reservations').select('*').order('created_at', { ascending: false })
    setReservations(data || [])
  }, [])

  useEffect(() => { loadVehicles(); loadReservations(); loadBanner(); loadTestimonials(); loadSellRequests() }, [])

  async function loadTestimonials() {
    const { data } = await supabase.from('testimonials').select('*').order('position', { ascending: true })
    setTestimonials(data || [])
  }
  async function uploadTestiPhoto(file) {
    setTestiUploading(true)
    const path = `testimonials/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('vehicle-images').upload(path, file, { upsert: true })
    setTestiUploading(false)
    if (error) { onToast('❌ Erreur upload photo', 'error'); return '' }
    const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(path)
    return publicUrl
  }
  async function addTestimonial() {
    if (!newTesti.nom.trim() || !newTesti.texte.trim()) return
    const pos = testimonials.length + 1
    await supabase.from('testimonials').insert({ ...newTesti, actif: true, position: pos })
    setNewTesti({ nom: '', role: '', texte: '', note: 5, photo_url: '' })
    loadTestimonials()
    onToast('✅ Témoignage ajouté')
  }
  async function toggleTesti(id, actif) {
    await supabase.from('testimonials').update({ actif }).eq('id', id)
    setTestimonials(prev => prev.map(t => t.id === id ? { ...t, actif } : t))
  }
  async function deleteTesti(id) {
    await supabase.from('testimonials').delete().eq('id', id)
    setTestimonials(prev => prev.filter(t => t.id !== id))
  }

  async function loadSellRequests() {
    const { data } = await supabase.from('sell_requests').select('*').order('created_at', { ascending: false })
    setSellRequests(data || [])
  }
  async function setSellStatus(id, statut) {
    await supabase.from('sell_requests').update({ statut }).eq('id', id)
    setSellRequests(prev => prev.map(r => r.id === id ? { ...r, statut } : r))
  }
  async function deleteSellRequest(id) {
    await supabase.from('sell_requests').delete().eq('id', id)
    setSellRequests(prev => prev.filter(r => r.id !== id))
  }

  async function loadBanner() {
    const { data } = await supabase.from('banner_messages').select('*').order('position', { ascending: true })
    setBannerMsgs(data || [])
  }
  async function addMsg() {
    const msg = newMsg.trim()
    if (!msg) return
    const pos = bannerMsgs.length + 1
    await supabase.from('banner_messages').insert({ message: msg, actif: true, position: pos })
    setNewMsg('')
    loadBanner()
  }
  async function toggleMsg(id, actif) {
    await supabase.from('banner_messages').update({ actif }).eq('id', id)
    setBannerMsgs(prev => prev.map(m => m.id === id ? { ...m, actif } : m))
  }
  async function deleteMsg(id) {
    await supabase.from('banner_messages').delete().eq('id', id)
    setBannerMsgs(prev => prev.filter(m => m.id !== id))
  }
  async function moveMsg(id, dir) {
    const idx = bannerMsgs.findIndex(m => m.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= bannerMsgs.length) return
    const a = bannerMsgs[idx], b = bannerMsgs[swapIdx]
    await supabase.from('banner_messages').update({ position: b.position }).eq('id', a.id)
    await supabase.from('banner_messages').update({ position: a.position }).eq('id', b.id)
    loadBanner()
  }

  function exportReservationsExcel() {
    const rows = reservations.map(r => ({
      'N° Réservation': r.id,
      'Date': new Date(r.created_at).toLocaleDateString('fr-FR'),
      'Heure': new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      'Véhicule': r.vehicule_nom,
      'Prix (DA)': r.vehicule_prix,
      'Client': r.nom_client,
      'Téléphone': r.telephone,
      'Message': r.message || '',
      'Statut': r.statut,
    }))
    if (rows.length === 0) { onToast('Aucune réservation à exporter', 'error'); return }
    const cols = Object.keys(rows[0])
    const bom = '\uFEFF'
    const csv = bom + [cols.join(';'), ...rows.map(r => cols.map(c => {
      const val = String(r[c] ?? '').replace(/"/g, '""')
      return val.includes(';') || val.includes('\n') ? `"${val}"` : val
    }).join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hbr-auto-reservations-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onToast(`✅ ${rows.length} réservations exportées`, 'default')
  }

  async function saveVehicle(data) {
    if (data.id) {
      const { error } = await supabase.from('vehicles').update(data).eq('id', data.id)
      if (error) { onToast('❌ Erreur sauvegarde : ' + error.message, 'error'); return }
    } else {
      const { error } = await supabase.from('vehicles').insert({ ...data, is_active: true })
      if (error) { onToast('❌ Erreur ajout : ' + error.message, 'error'); return }
    }
    onToast('✅ Véhicule enregistré !')
    setEditVeh(null)
    loadVehicles()
  }

  async function toggleActive(id, val) {
    await supabase.from('vehicles').update({ is_active: val }).eq('id', id)
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, is_active: val } : v))
  }

  async function deleteVehicle(id) {
    if (!confirm('Supprimer ce véhicule définitivement ?')) return
    await supabase.from('vehicles').delete().eq('id', id)
    setVehicles(prev => prev.filter(v => v.id !== id))
    onToast('🗑️ Véhicule supprimé')
  }

  async function setResStatus(id, statut) {
    await supabase.from('reservations').update({ statut }).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut } : r))
  }

  async function deleteRes(id) {
    if (!confirm('Supprimer cette réservation ?')) return
    await supabase.from('reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
    onToast('🗑️ Réservation supprimée')
  }

  const filteredVehicles = vehicles.filter(v => {
    if (filterStatut !== 'all' && v.statut !== filterStatut) return false
    if (search) {
      const q = search.toLowerCase()
      return (v.marque + ' ' + v.modele).toLowerCase().includes(q)
    }
    return true
  })

  const filteredRes = reservations.filter(r => resFilter === 'all' || r.statut === resFilter)

  const stats = {
    total: vehicles.length,
    disponibles: vehicles.filter(v => v.statut === 'disponible').length,
    valeurStock: vehicles.filter(v => v.statut !== 'vendu').reduce((s, v) => s + Number(v.prix || 0), 0),
    resNouvelles: reservations.filter(r => r.statut === 'nouvelle').length,
  }

  return (
    <div className="adm">
      <div className="adm-top">
        <div className="adm-logo">HBR <em>AUTO</em> <span className="adm-badge">ADMIN</span></div>
        <div className="adm-tabs">
          {[['vehicules', '🚘 Véhicules'], ['reservations', '📩 Réservations'], ['reprises', '🔄 Reprises'], ['temoignages', '⭐ Témoignages'], ['banniere', '📢 Bannière'], ['settings', '⚙️ Paramètres']].map(([k, l]) => (
            <button key={k} className={`adm-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button className="adm-logout" onClick={onLogout}>Déconnexion</button>
      </div>

      <div className="adm-body">
        {/* Stats */}
        <div className="adm-stats">
          <div className="stat-card"><div className="label">Véhicules en stock</div><div className="value">{stats.total}</div></div>
          <div className="stat-card"><div className="label">✅ Disponibles</div><div className="value" style={{ color: '#86efac' }}>{stats.disponibles}</div></div>
          <div className="stat-card"><div className="label">💰 Valeur du stock</div><div className="value red">{fmt(stats.valeurStock)}</div></div>
          <div className="stat-card"><div className="label">📩 Réservations nouvelles</div><div className="value red">{stats.resNouvelles}</div></div>
        </div>

        {/* ── TAB VÉHICULES ── */}
        {tab === 'vehicules' && (
          <div>
            <div className="adm-toolbar">
              <input className="adm-search" placeholder="Rechercher (marque, modèle...)" value={search} onChange={e => setSearch(e.target.value)} />
              {['all', ...STATUTS.map(s => s.key)].map(k => (
                <button key={k} className={`filter-btn ${filterStatut === k ? 'active' : ''}`} onClick={() => setFilterStatut(k)}>
                  {k === 'all' ? 'Tous' : statutOf(k).label}
                </button>
              ))}
              <button className="act-btn primary" style={{ marginLeft: 'auto' }} onClick={() => setEditVeh(false)}>+ Ajouter un véhicule</button>
            </div>

            {loading ? <div className="spinner">Chargement…</div> : filteredVehicles.length === 0 ? (
              <div className="empty"><div style={{ fontSize: 40 }}>🚗</div><p>Aucun véhicule. Ajoutez-en un !</p></div>
            ) : (
              <div className="adm-vgrid">
                {filteredVehicles.map(v => {
                  const st = statutOf(v.statut)
                  return (
                    <div key={v.id} className="adm-vcard" style={{ opacity: v.is_active ? 1 : .5 }}>
                      <div className="adm-vcard-img">
                        <div className="adm-vcard-statut" style={{ background: st.color }}>{st.label}</div>
                        <img src={v.img || PLACEHOLDER_IMG} alt={v.marque} />
                      </div>
                      <div className="adm-vcard-body">
                        <div className="adm-vcard-name">{v.marque} {v.modele}</div>
                        <div className="adm-vcard-sub">
                          <img src={flagURI(v.provenance)} style={{ width: 14, height: 10, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} alt="" />
                          {v.annee} · {v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : 'Neuf'}
                        </div>
                        <div className="adm-vcard-price">{fmt(v.prix)}</div>
                        <div className="adm-vcard-actions">
                          <button className="act-btn" onClick={() => setEditVeh(v)}>✏️ Modifier</button>
                          <button className="act-btn" onClick={() => toggleActive(v.id, !v.is_active)}>{v.is_active ? '👁 Masquer' : '👁 Afficher'}</button>
                          <button className="act-btn danger" onClick={() => deleteVehicle(v.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB RÉSERVATIONS ── */}
        {tab === 'reservations' && (
          <div>
            <div className="adm-toolbar">
              {['all', ...RES_STATUTS.map(s => s.key)].map(k => (
                <button key={k} className={`filter-btn ${resFilter === k ? 'active' : ''}`} onClick={() => setResFilter(k)}>
                  {k === 'all' ? 'Toutes' : RES_STATUTS.find(s => s.key === k).label}
                </button>
              ))}
              <button className="act-btn" style={{ marginLeft: 'auto' }} onClick={exportReservationsExcel}>📥 Export Excel ({reservations.length})</button>
            </div>

            {filteredRes.length === 0 ? (
              <div className="empty"><div style={{ fontSize: 40 }}>📭</div><p>Aucune réservation pour le moment.</p></div>
            ) : filteredRes.map(r => (
              <div key={r.id} className={`rescard ${r.statut === 'nouvelle' ? 'new' : ''}`}>
                <div className="rescard-top">
                  <div>
                    <div className="rescard-veh">🚘 {r.vehicule_nom}</div>
                    <div className="rescard-date">#{String(r.id).slice(0, 10)} · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span className={`res-badge ${r.statut}`}>{RES_STATUTS.find(s => s.key === r.statut)?.label || r.statut}</span>
                </div>
                <div className="rescard-info">
                  <span>👤 {r.nom_client}</span>
                  <span>📞 {r.telephone}</span>
                  {r.date_souhaitee && <span>📅 Créneau souhaité : {r.date_souhaitee}</span>}
                  <span>💰 {fmt(r.vehicule_prix)}</span>
                  {r.message && <span>📝 {r.message}</span>}
                </div>
                <div className="rescard-actions">
                  <button className="act-btn wa" onClick={() => openWA(r)}>💬 Contacter WhatsApp</button>
                  {r.statut !== 'contactee' && <button className="act-btn" onClick={() => setResStatus(r.id, 'contactee')}>📞 Marquer contactée</button>}
                  {r.statut !== 'vendue' && <button className="act-btn" onClick={() => setResStatus(r.id, 'vendue')}>✅ Marquer vendue</button>}
                  {r.statut !== 'annulee' && <button className="act-btn" onClick={() => setResStatus(r.id, 'annulee')}>❌ Annuler</button>}
                  <button className="act-btn danger" onClick={() => deleteRes(r.id)}>🗑️ Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB REPRISES ── */}
        {tab === 'reprises' && (
          <div>
            <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>🔄 Demandes de reprise</h3>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginBottom: 20 }}>Véhicules que des visiteurs proposent de vous vendre.</p>
            {sellRequests.length === 0 ? (
              <div className="empty"><div style={{ fontSize: 40 }}>🔄</div><p>Aucune demande pour le moment.</p></div>
            ) : sellRequests.map(r => (
              <div key={r.id} className={`rescard ${r.statut === 'nouvelle' ? 'new' : ''}`}>
                <div className="rescard-top">
                  <div>
                    <div className="rescard-veh">🚘 {r.marque} {r.modele} {r.annee ? `(${r.annee})` : ''}</div>
                    <div className="rescard-date">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <span className={`res-badge ${r.statut}`}>{RES_STATUTS.find(s => s.key === r.statut)?.label || r.statut}</span>
                </div>
                <div className="rescard-info">
                  <span>👤 {r.nom_client}</span>
                  <span>📞 {r.telephone}</span>
                  {r.km && <span>🛣️ {Number(r.km).toLocaleString('fr-FR')} km</span>}
                  {r.prix_souhaite && <span>💰 Prix souhaité : {fmt(r.prix_souhaite)}</span>}
                  {r.message && <span>📝 {r.message}</span>}
                </div>
                <div className="rescard-actions">
                  <button className="act-btn wa" onClick={() => openWA({ nom_client: r.nom_client, telephone: r.telephone, vehicule_nom: `${r.marque} ${r.modele}`, vehicule_prix: r.prix_souhaite || 0 })}>💬 Contacter WhatsApp</button>
                  {r.statut !== 'contactee' && <button className="act-btn" onClick={() => setSellStatus(r.id, 'contactee')}>📞 Marquer contactée</button>}
                  {r.statut !== 'vendue' && <button className="act-btn" onClick={() => setSellStatus(r.id, 'vendue')}>✅ Marquer traitée</button>}
                  {r.statut !== 'annulee' && <button className="act-btn" onClick={() => setSellStatus(r.id, 'annulee')}>❌ Annuler</button>}
                  <button className="act-btn danger" onClick={() => deleteSellRequest(r.id)}>🗑️ Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB TÉMOIGNAGES ── */}
        {tab === 'temoignages' && (
          <div>
            <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>⭐ Témoignages clients</h3>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginBottom: 20 }}>S'affichent sur le site public, section "Ils nous font confiance".</p>

            <div className="pf-section" style={{ marginBottom: 20 }}>
              <h3>➕ Ajouter un témoignage</h3>
              <div className="pf-grid" style={{ marginBottom: 10 }}>
                <div className="form-field"><label>Nom du client</label><input value={newTesti.nom} onChange={e => setNewTesti(t => ({ ...t, nom: e.target.value }))} /></div>
                <div className="form-field"><label>Ville / rôle (optionnel)</label><input value={newTesti.role} onChange={e => setNewTesti(t => ({ ...t, role: e.target.value }))} placeholder="Ex : Alger" /></div>
              </div>
              <div className="form-field" style={{ marginBottom: 10 }}>
                <label>Témoignage</label>
                <textarea rows={3} value={newTesti.texte} onChange={e => setNewTesti(t => ({ ...t, texte: e.target.value }))} placeholder="Ce que le client a dit..." />
              </div>
              <div className="pf-grid" style={{ marginBottom: 10, alignItems: 'end' }}>
                <div className="form-field">
                  <label>Note</label>
                  <select value={newTesti.note} onChange={e => setNewTesti(t => ({ ...t, note: Number(e.target.value) }))}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Photo (optionnel)</label>
                  <input type="file" accept="image/*" onChange={async e => {
                    const f = e.target.files[0]
                    if (!f) return
                    const url = await uploadTestiPhoto(f)
                    if (url) setNewTesti(t => ({ ...t, photo_url: url }))
                  }} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: 8, color: 'white', fontSize: 12, width: '100%' }} />
                </div>
              </div>
              <button className="btn-save" onClick={addTestimonial} disabled={testiUploading}>{testiUploading ? '⏳...' : '➕ Ajouter'}</button>
            </div>

            {testimonials.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 10, padding: 12, marginBottom: 8, opacity: t.actif ? 1 : .5 }}>
                {t.photo_url ? <img src={t.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(230,57,70,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5a63', fontWeight: 900 }}>{t.nom?.[0]}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>{t.nom} {t.role && <span style={{ color: 'rgba(255,255,255,.4)', fontWeight: 400 }}>· {t.role}</span>}</div>
                  <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{'★'.repeat(t.note)} {t.texte}</div>
                </div>
                <button className="act-btn" onClick={() => toggleTesti(t.id, !t.actif)}>{t.actif ? '✅ Actif' : '⏸ Inactif'}</button>
                <button className="act-btn danger" onClick={() => deleteTesti(t.id)}>🗑</button>
              </div>
            ))}
            {testimonials.length === 0 && <div className="empty"><p>Aucun témoignage pour le moment.</p></div>}
          </div>
        )}

        {/* ── TAB BANNIÈRE ── */}
        {tab === 'banniere' && (
          <div>
            <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>📢 Messages de la bannière défilante</h3>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginBottom: 20 }}>
              Ces messages s'affichent en haut du site en défilement (annonces, promos...).
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                className="adm-search"
                style={{ flex: 1 }}
                placeholder="Ex : 🔥 Nouveaux arrivages chaque semaine"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMsg()}
              />
              <button className="act-btn primary" onClick={addMsg}>+ Ajouter</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bannerMsgs.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: m.actif ? 'var(--card)' : '#111116',
                  border: `1px solid ${m.actif ? 'rgba(230,57,70,.2)' : 'rgba(255,255,255,.06)'}`,
                  borderRadius: 10, padding: '10px 14px', opacity: m.actif ? 1 : .5,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => moveMsg(m.id, 'up')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 11, padding: 2 }}>▲</button>
                    <button onClick={() => moveMsg(m.id, 'down')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 11, padding: 2 }}>▼</button>
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: m.actif ? 'white' : '#777' }}>{m.message}</span>
                  <button onClick={() => toggleMsg(m.id, !m.actif)} className="act-btn" style={{ background: m.actif ? 'rgba(34,197,94,.1)' : undefined, color: m.actif ? '#86efac' : undefined }}>
                    {m.actif ? '✅ Actif' : '⏸ Inactif'}
                  </button>
                  <button onClick={() => deleteMsg(m.id)} className="act-btn danger">🗑</button>
                </div>
              ))}
              {bannerMsgs.length === 0 && <div className="empty"><p>Aucun message — ajoutes-en un ci-dessus !</p></div>}
            </div>
          </div>
        )}

        {/* ── TAB PARAMÈTRES ── */}
        {tab === 'settings' && <AdminSettings onLogout={onLogout} onToast={onToast} />}
      </div>

      {editVeh !== null && (
        <VehicleForm vehicle={editVeh || null} onClose={() => setEditVeh(null)} onSave={saveVehicle} />
      )}
    </div>
  )
}
