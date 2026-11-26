import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { normalizeWhatsAppPhone, waLink } from '../../utils/notify'

const SOURCES = [
  ['reservation', 'Réservation'],
  ['reprise', 'Vente / échange'],
  ['recherche', 'Recherche véhicule'],
  ['crm', 'CRM client'],
  ['showroom', 'Showroom'],
  ['autre', 'Autre'],
]

const FILTERS = [
  ['urgentes', 'En retard / aujourd’hui'],
  ['a_faire', 'Toutes à faire'],
  ['a_venir', 'À venir'],
  ['terminee', 'Terminées'],
  ['annulee', 'Annulées'],
  ['all', 'Toutes'],
]

function toLocalInput(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 16)
}

function defaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return toLocalInput(date)
}

function emptyForm() {
  return {
    nom_client: '',
    telephone: '',
    objet: '',
    notes: '',
    due_at: defaultDueDate(),
    source: 'autre',
    source_reference: '',
  }
}

function sourceLabel(source) {
  return SOURCES.find(([key]) => key === source)?.[1] || 'Autre'
}

function formatDue(value) {
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayBounds() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function dueState(item, now = new Date()) {
  if (item.statut !== 'a_faire') return item.statut
  const due = new Date(item.due_at)
  if (due < now) return 'en_retard'
  const { start, end } = dayBounds()
  if (due >= start && due < end) return 'aujourd_hui'
  return 'a_venir'
}

export default function CustomerFollowUpsPanel({
  shopName = 'Nabil Auto',
  onToast,
  onChanged,
  prefill,
  onPrefillConsumed,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('urgentes')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  async function loadFollowUps() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('customer_follow_ups')
      .select('*')
      .order('due_at', { ascending: true })
    if (error) {
      setLoadError(error.message)
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadFollowUps() }, [])

  useEffect(() => {
    if (!prefill) return
    const blank = emptyForm()
    setForm({
      ...blank,
      nom_client: prefill.nom_client || '',
      telephone: prefill.telephone || '',
      objet: prefill.objet || 'Reprendre contact avec le client',
      notes: prefill.notes || '',
      source: prefill.source || 'autre',
      source_reference: prefill.source_reference == null ? '' : String(prefill.source_reference),
    })
    setEditingId(null)
    setShowForm(true)
    onPrefillConsumed?.()
  }, [prefill])

  const now = new Date()
  const stats = useMemo(() => {
    const active = items.filter(item => item.statut === 'a_faire')
    const overdue = active.filter(item => new Date(item.due_at) < now).length
    const today = active.filter(item => {
      const due = new Date(item.due_at)
      const { start, end } = dayBounds()
      return due >= start && due < end && due >= now
    }).length
    const upcoming = active.filter(item => new Date(item.due_at) >= dayBounds().end).length
    return {
      active: active.length,
      overdue,
      today,
      urgent: overdue + today,
      upcoming,
      completed: items.filter(item => item.statut === 'terminee').length,
    }
  }, [items])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return items.filter(item => {
      if (filter === 'urgentes' && !(item.statut === 'a_faire' && new Date(item.due_at) < dayBounds().end)) return false
      if (filter === 'a_faire' && item.statut !== 'a_faire') return false
      if (filter === 'a_venir' && !(item.statut === 'a_faire' && new Date(item.due_at) >= dayBounds().end)) return false
      if (filter === 'terminee' && item.statut !== 'terminee') return false
      if (filter === 'annulee' && item.statut !== 'annulee') return false
      if (query && ![item.nom_client, item.telephone, item.objet, item.notes, item.source].join(' ').toLocaleLowerCase().includes(query)) return false
      return true
    }).sort((a, b) => {
      if (a.statut === 'a_faire' && b.statut !== 'a_faire') return -1
      if (b.statut === 'a_faire' && a.statut !== 'a_faire') return 1
      if (a.statut === 'a_faire' && b.statut === 'a_faire') return new Date(a.due_at) - new Date(b.due_at)
      return new Date(b.completed_at || b.updated_at || b.created_at) - new Date(a.completed_at || a.updated_at || a.created_at)
    })
  }, [items, filter, search])

  function field(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function openNewForm() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function editItem(item) {
    setEditingId(item.id)
    setForm({
      nom_client: item.nom_client || '',
      telephone: item.telephone || '',
      objet: item.objet || '',
      notes: item.notes || '',
      due_at: toLocalInput(item.due_at),
      source: item.source || 'autre',
      source_reference: item.source_reference || '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function saveFollowUp(event) {
    event.preventDefault()
    const phoneDigits = form.telephone.replace(/\D/g, '')
    const dueDate = new Date(form.due_at)
    if (!form.nom_client.trim() || form.nom_client.trim().length < 2 || !form.objet.trim()) {
      onToast?.('Renseigne le nom du client et l’objet de la relance.', 'error')
      return
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      onToast?.('Vérifie le numéro de téléphone du client.', 'error')
      return
    }
    if (!form.due_at || Number.isNaN(dueDate.getTime())) {
      onToast?.('Choisis une date et une heure de relance valides.', 'error')
      return
    }

    setSaving(true)
    const payload = {
      nom_client: form.nom_client.trim(),
      telephone: form.telephone.trim(),
      objet: form.objet.trim(),
      notes: form.notes.trim(),
      due_at: dueDate.toISOString(),
      source: form.source,
      source_reference: form.source_reference.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const query = editingId
      ? supabase.from('customer_follow_ups').update(payload).eq('id', editingId)
      : supabase.from('customer_follow_ups').insert({ ...payload, statut: 'a_faire' })
    const { data, error } = await query.select('*').single()
    if (error) {
      onToast?.('Impossible d’enregistrer la relance : ' + error.message, 'error')
    } else {
      if (editingId) setItems(current => current.map(item => item.id === editingId ? data : item))
      else setItems(current => [data, ...current])
      await onChanged?.()
      onToast?.(editingId ? 'Relance modifiée.' : 'Relance programmée.')
      closeForm()
    }
    setSaving(false)
  }

  async function updateStatus(item, statut) {
    setSavingId(item.id)
    const updates = {
      statut,
      updated_at: new Date().toISOString(),
      completed_at: statut === 'terminee' ? new Date().toISOString() : null,
    }
    const { data, error } = await supabase
      .from('customer_follow_ups')
      .update(updates)
      .eq('id', item.id)
      .select('*')
      .single()
    if (error) onToast?.('Impossible de mettre à jour la relance : ' + error.message, 'error')
    else {
      setItems(current => current.map(row => row.id === item.id ? data : row))
      await onChanged?.()
    }
    setSavingId(null)
  }

  async function postpone(item, days) {
    const due = new Date(item.due_at)
    due.setDate(due.getDate() + days)
    setSavingId(item.id)
    const { data, error } = await supabase
      .from('customer_follow_ups')
      .update({ due_at: due.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select('*')
      .single()
    if (error) onToast?.('Impossible de reporter la relance : ' + error.message, 'error')
    else {
      setItems(current => current.map(row => row.id === item.id ? data : row))
      await onChanged?.()
      onToast?.('Relance reportée.')
    }
    setSavingId(null)
  }

  function contactWhatsApp(item) {
    const message = `Bonjour ${item.nom_client}, ici ${shopName} 👋\n\nJe reviens vers vous concernant : ${item.objet}.\n${item.notes ? 'Précision : ' + item.notes + '\n' : ''}\nN’hésitez pas à me dire où vous en êtes dans votre projet. Nous restons à votre disposition.`
    const url = waLink(message, item.telephone)
    if (!url) {
      onToast?.('Le numéro de téléphone ne permet pas de préparer un lien WhatsApp.', 'error')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function statusDetails(item) {
    const state = dueState(item)
    if (state === 'en_retard') return { label: 'En retard', className: 'overdue' }
    if (state === 'aujourd_hui') return { label: 'Aujourd’hui', className: 'today' }
    if (state === 'a_venir') return { label: 'À venir', className: 'upcoming' }
    if (state === 'terminee') return { label: 'Terminée', className: 'completed' }
    return { label: 'Annulée', className: 'cancelled' }
  }

  return (
    <section className="followups-root">
      <div className="followups-head">
        <div>
          <span className="adm-eyebrow">RELATION CLIENT · RAPPELS</span>
          <h2>Relances clients</h2>
          <p>Planifie tes rappels après un appel, une visite ou une demande. Les relances en retard et prévues aujourd’hui restent visibles ici.</p>
        </div>
        <div className="followups-head-actions">
          <button className="act-btn" type="button" onClick={loadFollowUps} disabled={loading}>↻ Actualiser</button>
          <button className="act-btn primary" type="button" onClick={openNewForm}>＋ Nouvelle relance</button>
        </div>
      </div>

      <div className="followups-stats">
        <div className="followups-stat urgent"><span>En retard</span><strong>{stats.overdue}</strong></div>
        <div className="followups-stat today"><span>À faire aujourd’hui</span><strong>{stats.today}</strong></div>
        <div className="followups-stat"><span>À venir</span><strong>{stats.upcoming}</strong></div>
        <div className="followups-stat"><span>Terminées</span><strong>{stats.completed}</strong></div>
      </div>

      {showForm && (
        <form className="followups-form" onSubmit={saveFollowUp}>
          <div className="followups-form-head">
            <div>
              <h3>{editingId ? 'Modifier la relance' : 'Programmer une relance'}</h3>
              <p>Le rappel sera enregistré dans l’administration. Aucun message ne sera envoyé automatiquement.</p>
            </div>
            <button className="act-btn" type="button" onClick={closeForm} aria-label="Fermer">✕</button>
          </div>
          <div className="followups-form-grid">
            <label className="followups-field"><span>Nom du client *</span><input required value={form.nom_client} onChange={event => field('nom_client', event.target.value)} placeholder="Nom et prénom" /></label>
            <label className="followups-field"><span>Téléphone *</span><input required type="tel" value={form.telephone} onChange={event => field('telephone', event.target.value)} placeholder="05 50 12 34 56" /></label>
            <label className="followups-field"><span>Objet de la relance *</span><input required value={form.objet} onChange={event => field('objet', event.target.value)} placeholder="Ex. Recontacter pour le GLC 300" /></label>
            <label className="followups-field"><span>Date et heure *</span><input required type="datetime-local" value={form.due_at} onChange={event => field('due_at', event.target.value)} /></label>
            <label className="followups-field"><span>Origine</span><select value={form.source} onChange={event => field('source', event.target.value)}>{SOURCES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="followups-field followups-field-wide"><span>Note / prochaine étape</span><textarea rows={3} value={form.notes} onChange={event => field('notes', event.target.value)} placeholder="Ex. Vérifier la disponibilité, confirmer le budget, envoyer des photos…" /></label>
          </div>
          <div className="followups-form-footer">
            <span>La date est enregistrée selon ton heure locale.</span>
            <button className="btn-save" type="submit" disabled={saving}>{saving ? '⏳ Enregistrement…' : editingId ? '💾 Enregistrer les modifications' : '⏰ Programmer la relance'}</button>
          </div>
        </form>
      )}

      <div className="followups-toolbar">
        <input className="adm-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un nom, téléphone ou objet…" aria-label="Rechercher une relance" />
        <div className="followups-filters">
          {FILTERS.map(([key, label]) => <button key={key} className={'filter-btn ' + (filter === key ? 'active' : '')} type="button" onClick={() => setFilter(key)}>{label}</button>)}
        </div>
      </div>

      {loadError && <div className="followups-error" role="alert">Erreur de chargement : {loadError}</div>}
      {loading ? <div className="spinner">Chargement des relances…</div> : filtered.length === 0 ? (
        <div className="followups-empty">
          <span>⏰</span>
          <strong>{filter === 'urgentes' ? 'Aucune relance en retard ou prévue aujourd’hui' : 'Aucune relance dans cette vue'}</strong>
          <p>Programme un rappel depuis une fiche client ou crée une nouvelle relance manuellement.</p>
          {filter === 'urgentes' && stats.upcoming > 0 && <button className="act-btn" type="button" onClick={() => setFilter('a_venir')}>Voir les relances à venir</button>}
        </div>
      ) : (
        <div className="followups-list">
          {filtered.map(item => {
            const state = statusDetails(item)
            const phoneValid = Boolean(normalizeWhatsAppPhone(item.telephone))
            const busy = savingId === item.id
            return (
              <article className={'followup-card ' + state.className} key={item.id}>
                <div className="followup-card-main">
                  <div className="followup-card-top">
                    <div>
                      <span className="followup-source">{sourceLabel(item.source)}</span>
                      <h3>{item.objet}</h3>
                      <small>{formatDue(item.due_at)}</small>
                    </div>
                    <span className={'followup-status ' + state.className}>{state.label}</span>
                  </div>
                  <div className="followup-card-info">
                    <span>👤 {item.nom_client}</span>
                    <span>📞 {item.telephone}</span>
                    {item.notes && <p>📝 {item.notes}</p>}
                  </div>
                </div>
                <div className="followup-actions">
                  <button className="act-btn wa" type="button" disabled={!phoneValid} onClick={() => contactWhatsApp(item)}>💬 WhatsApp</button>
                  <button className="act-btn" type="button" disabled={busy} onClick={() => editItem(item)}>✏️ Modifier</button>
                  {item.statut === 'a_faire' && (
                    <>
                      <button className="act-btn" type="button" disabled={busy} onClick={() => postpone(item, 1)}>＋1 jour</button>
                      <button className="act-btn" type="button" disabled={busy} onClick={() => postpone(item, 7)}>＋7 jours</button>
                      <button className="act-btn primary" type="button" disabled={busy} onClick={() => updateStatus(item, 'terminee')}>✓ Terminer</button>
                      <button className="act-btn danger" type="button" disabled={busy} onClick={() => updateStatus(item, 'annulee')}>Annuler</button>
                    </>
                  )}
                  {item.statut !== 'a_faire' && <button className="act-btn" type="button" disabled={busy} onClick={() => updateStatus(item, 'a_faire')}>↩ Réactiver</button>}
                </div>
              </article>
            )
          })}
        </div>
      )}
      <p className="followups-footnote">Les relances sont des rappels internes : l’envoi WhatsApp se fait manuellement après validation du message.</p>
    </section>
  )
}
