import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { saveSettings, saveSetting, getSettings } from '../../utils/useSettings'
import { openWA, fmt } from '../../utils/notify'
import { STATUTS, flagURI, ORIGINS, PLACEHOLDER_IMG } from '../../data/vehicles-data'
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
  const [shop, setShop] = useState({ name: 'Ilyas Auto', phone: '213550123456', whatsapp: '213550123456', address: 'Boumerdès, Algérie', email: '' })
  const [shopSaving, setShopSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', new1: '', new2: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      setShop({
        name: s.shop_name || 'Ilyas Auto',
        phone: s.shop_phone || '213550123456',
        whatsapp: s.shop_whatsapp || s.shop_phone || '213550123456',
        address: s.shop_address || 'Boumerdès, Algérie',
        email: s.shop_email || '',
      })
    })
  }, [])

  async function saveShop() {
    setShopSaving(true)
    try {
      await saveSetting('shop_name', shop.name)
      await saveSetting('shop_phone', shop.phone)
      await saveSetting('shop_whatsapp', shop.whatsapp)
      await saveSetting('shop_email', shop.email)
      await saveSetting('shop_address', shop.address)
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
        <button className="btn-save" onClick={saveShop} disabled={shopSaving}>{shopSaving ? '⏳...' : '💾 Sauvegarder'}</button>
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

  useEffect(() => { loadVehicles(); loadReservations() }, [])

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
        <div className="adm-logo">ILYAS <em>AUTO</em> <span className="adm-badge">ADMIN</span></div>
        <div className="adm-tabs">
          {[['vehicules', '🚘 Véhicules'], ['reservations', '📩 Réservations'], ['settings', '⚙️ Paramètres']].map(([k, l]) => (
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

        {/* ── TAB PARAMÈTRES ── */}
        {tab === 'settings' && <AdminSettings onLogout={onLogout} onToast={onToast} />}
      </div>

      {editVeh !== null && (
        <VehicleForm vehicle={editVeh || null} onClose={() => setEditVeh(null)} onSave={saveVehicle} />
      )}
    </div>
  )
}
