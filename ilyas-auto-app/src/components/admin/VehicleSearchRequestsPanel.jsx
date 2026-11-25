import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { fmt, openWA } from '../../utils/notify'
import '../../styles/vehicle-search.css'

const STATUSES = [
  ['nouvelle', '🆕 Nouvelle'],
  ['contactee', '📞 Contactée'],
  ['correspondance', '🚘 Correspondance'],
  ['cloturee', '✅ Clôturée'],
  ['annulee', '❌ Annulée'],
]
const SOURCES = [
  ['showroom', 'Showroom'],
  ['telephone', 'Téléphone'],
  ['whatsapp', 'WhatsApp'],
  ['autre', 'Autre'],
]
const EMPTY_FORM = {
  nom_client: '',
  telephone: '',
  marque: '',
  modele: '',
  budget_min: '',
  budget_max: '',
  annee_min: '',
  annee_max: '',
  km_max: '',
  carburant: '',
  transmission: '',
  notes: '',
  source: 'showroom',
}

function norm(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function optionalNumber(value) {
  if (value === '' || value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function sourceLabel(source) {
  return SOURCES.find(item => item[0] === source)?.[1] || (source === 'site' ? 'Site internet' : 'Autre')
}

function statusLabel(status) {
  return STATUSES.find(item => item[0] === status)?.[1] || status
}

function matchingVehicles(request, vehicles) {
  const brand = norm(request.marque)
  const model = norm(request.modele)
  return vehicles
    .filter(vehicle => vehicle.is_active !== false && vehicle.statut === 'disponible')
    .map(vehicle => {
      const vehicleBrand = norm(vehicle.marque)
      const vehicleModel = norm(vehicle.modele)
      const brandMatches = !brand || vehicleBrand.includes(brand) || brand.includes(vehicleBrand)
      const modelMatches = !model || vehicleModel.includes(model) || model.includes(vehicleModel)
      if (!brandMatches || !modelMatches) return null

      const price = Number(vehicle.prix || 0)
      const year = Number(vehicle.annee || 0)
      const km = Number(vehicle.km || 0)
      if (request.budget_min != null && price < Number(request.budget_min)) return null
      if (request.budget_max != null && price > Number(request.budget_max)) return null
      if (request.annee_min != null && year < Number(request.annee_min)) return null
      if (request.annee_max != null && year > Number(request.annee_max)) return null
      if (request.km_max != null && km > Number(request.km_max)) return null
      if (request.carburant && norm(vehicle.carburant) !== norm(request.carburant)) return null
      if (request.transmission && norm(vehicle.transmission) !== norm(request.transmission)) return null

      const score = (brand ? 3 : 0) + (model ? 4 : 0) +
        (request.budget_max != null ? 1 : 0) +
        (request.annee_min != null || request.annee_max != null ? 1 : 0) +
        (request.carburant ? 1 : 0) + (request.transmission ? 1 : 0)
      return { vehicle, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(a.vehicle.prix || 0) - Number(b.vehicle.prix || 0))
    .slice(0, 3)
    .map(item => item.vehicle)
}

export default function VehicleSearchRequestsPanel({ vehicles = [], shopName = 'Nabil Auto', onToast, onRequestsChanged }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [savingForm, setSavingForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('vehicle_search_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setLoadError(error.message)
      setRequests([])
    } else {
      setRequests(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const query = norm(search)
    return requests.filter(request => {
      if (filter !== 'all' && request.statut !== filter) return false
      if (!query) return true
      return [
        request.nom_client, request.telephone, request.marque, request.modele,
        request.notes, request.source,
      ].some(value => norm(value).includes(query))
    })
  }, [requests, filter, search])

  const stats = {
    total: requests.length,
    nouvelles: requests.filter(request => request.statut === 'nouvelle').length,
    matches: requests.filter(request => request.statut === 'correspondance').length,
    enCours: requests.filter(request => ['nouvelle', 'contactee', 'correspondance'].includes(request.statut)).length,
  }

  async function updateRequest(id, updates) {
    setSavingId(id)
    const { data, error } = await supabase
      .from('vehicle_search_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      onToast?.('Impossible de mettre à jour la recherche : ' + error.message, 'error')
    } else {
      setRequests(current => current.map(request => request.id === id ? data : request))
      await onRequestsChanged?.()
      onToast?.('Recherche client mise à jour.')
    }
    setSavingId(null)
    return !error
  }

  async function saveManualRequest(event) {
    event.preventDefault()
    const phoneDigits = form.telephone.replace(/\D/g, '')
    const budgetMin = optionalNumber(form.budget_min)
    const budgetMax = optionalNumber(form.budget_max)
    const yearMin = optionalNumber(form.annee_min)
    const yearMax = optionalNumber(form.annee_max)
    const kmMax = optionalNumber(form.km_max)
    if (!form.nom_client.trim() || phoneDigits.length < 8 || phoneDigits.length > 15) {
      onToast?.('Renseigne le nom et un numéro de téléphone valide.', 'error')
      return
    }
    if (!form.marque.trim() && !form.modele.trim()) {
      onToast?.('Indique au moins une marque ou un modèle recherché.', 'error')
      return
    }
    if ((budgetMin !== null && budgetMin < 0) || (budgetMax !== null && budgetMax < 0) ||
        (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) ||
        (yearMin !== null && (yearMin < 1950 || yearMin > new Date().getFullYear() + 1)) ||
        (yearMax !== null && (yearMax < 1950 || yearMax > new Date().getFullYear() + 1)) ||
        (yearMin !== null && yearMax !== null && yearMin > yearMax) ||
        (kmMax !== null && kmMax < 0)) {
      onToast?.('Vérifie les budgets, années et kilométrages.', 'error')
      return
    }

    setSavingForm(true)
    const record = {
      nom_client: form.nom_client.trim(),
      telephone: form.telephone.trim(),
      marque: form.marque.trim() || null,
      modele: form.modele.trim() || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      annee_min: yearMin,
      annee_max: yearMax,
      km_max: kmMax,
      carburant: form.carburant || null,
      transmission: form.transmission || null,
      notes: form.notes.trim(),
      source: form.source,
      statut: 'nouvelle',
    }
    const { data, error } = await supabase
      .from('vehicle_search_requests')
      .insert(record)
      .select('*')
      .single()
    if (error) {
      onToast?.('Impossible d’enregistrer la recherche : ' + error.message, 'error')
    } else {
      setRequests(current => [data, ...current])
      await onRequestsChanged?.()
      setForm(EMPTY_FORM)
      setShowForm(false)
      onToast?.('Recherche client enregistrée.')
    }
    setSavingForm(false)
  }

  function field(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  return (
    <section className="vehicle-search-admin">
      <div className="vehicle-search-admin-head">
        <div>
          <span className="adm-eyebrow">PROSPECTION & SUIVI</span>
          <h2>Recherches de véhicules des clients</h2>
          <p>Enregistre ce qu’un client souhaite acheter. Tu pourras retrouver les demandes lorsqu’un véhicule compatible arrive en stock.</p>
        </div>
        <div className="vehicle-search-admin-head-actions">
          <button className="act-btn" type="button" onClick={load} disabled={loading}>↻ Actualiser</button>
          <button className="act-btn primary" type="button" onClick={() => setShowForm(value => !value)}>
            {showForm ? '✕ Fermer' : '+ Enregistrer un client'}
          </button>
        </div>
      </div>

      <div className="vehicle-search-stats">
        <div><span>Recherches enregistrées</span><strong>{stats.total}</strong></div>
        <div><span>Nouvelles demandes</span><strong>{stats.nouvelles}</strong></div>
        <div><span>Correspondances trouvées</span><strong>{stats.matches}</strong></div>
        <div><span>À suivre</span><strong>{stats.enCours}</strong></div>
      </div>

      {showForm && (
        <form className="vehicle-search-admin-form" onSubmit={saveManualRequest}>
          <div className="vehicle-search-admin-form-heading">
            <div><h3>Ajouter une recherche reçue directement</h3><p>Pour un passage au showroom, un appel ou un message WhatsApp.</p></div>
            <button type="button" className="act-btn" onClick={() => setShowForm(false)} aria-label="Fermer">✕</button>
          </div>
          <div className="vehicle-search-form-grid">
            <label className="vehicle-search-field"><span>Origine du contact *</span><select value={form.source} onChange={event => field('source', event.target.value)}>{SOURCES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="vehicle-search-field"><span>Nom du client *</span><input required value={form.nom_client} onChange={event => field('nom_client', event.target.value)} placeholder="Nom et prénom" /></label>
            <label className="vehicle-search-field"><span>Téléphone *</span><input required type="tel" value={form.telephone} onChange={event => field('telephone', event.target.value)} placeholder="05 50 12 34 56" /></label>
            <label className="vehicle-search-field"><span>Marque recherchée</span><input value={form.marque} onChange={event => field('marque', event.target.value)} placeholder="Ex. Mercedes-Benz" /></label>
            <label className="vehicle-search-field"><span>Modèle recherché</span><input value={form.modele} onChange={event => field('modele', event.target.value)} placeholder="Ex. GLC 300" /></label>
            <label className="vehicle-search-field"><span>Budget minimum (DA)</span><input type="number" min="0" value={form.budget_min} onChange={event => field('budget_min', event.target.value)} /></label>
            <label className="vehicle-search-field"><span>Budget maximum (DA)</span><input type="number" min="0" value={form.budget_max} onChange={event => field('budget_max', event.target.value)} /></label>
            <label className="vehicle-search-field"><span>Année minimum</span><input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.annee_min} onChange={event => field('annee_min', event.target.value)} /></label>
            <label className="vehicle-search-field"><span>Année maximum</span><input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.annee_max} onChange={event => field('annee_max', event.target.value)} /></label>
            <label className="vehicle-search-field"><span>Km maximum</span><input type="number" min="0" value={form.km_max} onChange={event => field('km_max', event.target.value)} /></label>
            <label className="vehicle-search-field"><span>Carburant</span><select value={form.carburant} onChange={event => field('carburant', event.target.value)}><option value="">Peu importe</option>{['Diesel', 'Essence', 'Hybride', 'GPL', 'Électrique'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="vehicle-search-field"><span>Boîte de vitesses</span><select value={form.transmission} onChange={event => field('transmission', event.target.value)}><option value="">Peu importe</option><option>Automatique</option><option>Manuelle</option></select></label>
            <label className="vehicle-search-field vehicle-search-field-wide"><span>Précisions / notes</span><textarea rows={2} value={form.notes} onChange={event => field('notes', event.target.value)} placeholder="Couleur, finition, options, délai…" /></label>
          </div>
          <div className="vehicle-search-admin-form-footer"><span>Les critères peuvent rester partiels et être complétés plus tard.</span><button className="btn-save" type="submit" disabled={savingForm}>{savingForm ? '⏳ Enregistrement…' : '💾 Enregistrer la recherche'}</button></div>
        </form>
      )}

      <div className="vehicle-search-admin-toolbar">
        <input className="adm-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un client, modèle ou téléphone…" />
        <div className="vehicle-search-admin-filters">
          {[
            ['all', 'Toutes'],
            ['nouvelle', 'Nouvelles'],
            ['contactee', 'Contactées'],
            ['correspondance', 'Correspondances'],
            ['cloturee', 'Clôturées'],
            ['annulee', 'Annulées'],
          ].map(([key, label]) => <button key={key} type="button" className={'filter-btn ' + (filter === key ? 'active' : '')} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
      </div>

      {loadError && <div className="vehicle-search-error" role="alert">Erreur de chargement : {loadError}</div>}
      {loading ? <div className="spinner">Chargement des recherches clients…</div> : filtered.length === 0 ? (
        <div className="vehicle-search-admin-empty"><span>⌕</span><strong>{requests.length ? 'Aucune recherche dans ce filtre' : 'Aucune recherche enregistrée pour le moment'}</strong><p>Les demandes envoyées depuis le site ou ajoutées par le showroom apparaîtront ici.</p></div>
      ) : (
        <div className="vehicle-search-request-list">
          {filtered.map(request => {
            const suggestions = matchingVehicles(request, vehicles)
            const linkedVehicle = vehicles.find(vehicle => String(vehicle.id) === String(request.matched_vehicle_id))
            const desired = [request.marque, request.modele].filter(Boolean).join(' ')
            const budget = request.budget_max != null
              ? (request.budget_min != null ? fmt(request.budget_min) + ' – ' : 'Jusqu’à ') + fmt(request.budget_max)
              : request.budget_min != null ? 'À partir de ' + fmt(request.budget_min) : 'Budget non précisé'
            return (
              <article className="vehicle-search-request-card" key={request.id}>
                <div className="vehicle-search-request-top">
                  <div>
                    <span className="vehicle-search-request-origin">{sourceLabel(request.source)}</span>
                    <h3>{desired || 'Véhicule souhaité'}</h3>
                    <small>{new Date(request.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</small>
                  </div>
                  <span className={'vehicle-search-request-status ' + request.statut}>{statusLabel(request.statut)}</span>
                </div>
                <div className="vehicle-search-request-info">
                  <span>👤 {request.nom_client}</span>
                  <span>📞 {request.telephone}</span>
                  <span>💰 {budget}</span>
                  {(request.annee_min || request.annee_max) && <span>📅 {request.annee_min || '—'} – {request.annee_max || '—'}</span>}
                  {request.km_max != null && <span>🛣️ Jusqu’à {Number(request.km_max).toLocaleString('fr-FR')} km</span>}
                  {request.carburant && <span>⛽ {request.carburant}</span>}
                  {request.transmission && <span>⚙️ {request.transmission}</span>}
                  {request.notes && <span className="vehicle-search-request-notes">📝 {request.notes}</span>}
                </div>

                {linkedVehicle ? (
                  <div className="vehicle-search-linked">
                    <span>✅ Véhicule proposé au client</span>
                    <strong>{linkedVehicle.marque} {linkedVehicle.modele} · {fmt(linkedVehicle.prix)}</strong>
                    <button type="button" className="act-btn" disabled={savingId === request.id} onClick={() => updateRequest(request.id, { matched_vehicle_id: null, statut: 'nouvelle' })}>Retirer la correspondance</button>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="vehicle-search-suggestions">
                    <div><strong>🚘 {suggestions.length} correspondance(s) dans le stock</strong><small>Voitures disponibles qui respectent les critères renseignés.</small></div>
                    {suggestions.map(vehicle => (
                      <div className="vehicle-search-suggestion" key={vehicle.id}>
                        <span>{vehicle.marque} {vehicle.modele} ({vehicle.annee}) · {fmt(vehicle.prix)}</span>
                        <button type="button" className="act-btn primary" disabled={savingId === request.id} onClick={() => updateRequest(request.id, { matched_vehicle_id: vehicle.id, statut: 'correspondance' })}>Associer</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="vehicle-search-no-match">Aucune voiture compatible dans le stock actuel. La demande reste enregistrée pour les prochains arrivages.</div>
                )}

                <div className="vehicle-search-request-actions">
                  <button type="button" className="act-btn wa" onClick={() => openWA({ nom_client: request.nom_client, telephone: request.telephone, vehicule_nom: desired || 'Votre recherche de véhicule', vehicule_prix: request.budget_max || 0 }, shopName)}>💬 Contacter WhatsApp</button>
                  {request.statut === 'nouvelle' && <button type="button" className="act-btn" disabled={savingId === request.id} onClick={() => updateRequest(request.id, { statut: 'contactee' })}>📞 Marquer contactée</button>}
                  {request.statut !== 'cloturee' && request.statut !== 'annulee' && <button type="button" className="act-btn" disabled={savingId === request.id} onClick={() => updateRequest(request.id, { statut: 'cloturee' })}>✅ Clôturer</button>}
                  {request.statut === 'annulee' && <button type="button" className="act-btn" disabled={savingId === request.id} onClick={() => updateRequest(request.id, { statut: 'nouvelle' })}>↩️ Réactiver</button>}
                  <button type="button" className="act-btn danger" disabled={savingId === request.id} onClick={() => updateRequest(request.id, { statut: 'annulee', matched_vehicle_id: null })}>Annuler</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <p className="vehicle-search-admin-footnote">Les suggestions sont calculées à partir du stock marqué disponible. Une association ne réserve pas automatiquement le véhicule.</p>
    </section>
  )
}
