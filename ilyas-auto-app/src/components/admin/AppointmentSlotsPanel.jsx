import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { openWA } from '../../utils/notify'
import '../../styles/appointment-calendar.css'

const EMPTY_FORM = {
  startsAt: '',
  endsAt: '',
  label: 'Visite / présentation du véhicule',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeRange(slot) {
  const options = { timeZone: 'Africa/Algiers', hour: '2-digit', minute: '2-digit' }
  const formatter = new Intl.DateTimeFormat('fr-FR', options)
  return `${formatter.format(new Date(slot.starts_at))} – ${formatter.format(new Date(slot.ends_at))}`
}

function toLocalInputValue(value) {
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function AppointmentSlotsPanel({ shopName = 'Nabil Auto', onToast }) {
  const [slots, setSlots] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingId, setChangingId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  async function loadCalendar() {
    setLoading(true)
    setLoadError('')
    const [slotResult, reservationResult] = await Promise.all([
      supabase.from('appointment_slots').select('*').order('starts_at', { ascending: true }),
      supabase
        .from('reservations')
        .select('id, appointment_slot_id, nom_client, telephone, vehicule_nom, statut')
        .not('appointment_slot_id', 'is', null),
    ])

    if (slotResult.error) {
      setLoadError(slotResult.error.message)
      setSlots([])
    } else {
      setSlots(slotResult.data || [])
    }

    if (reservationResult.error) {
      console.warn('Impossible de charger les réservations liées aux créneaux :', reservationResult.error)
      setReservations([])
    } else {
      setReservations(reservationResult.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadCalendar() }, [])

  const reservationBySlot = useMemo(() => {
    const map = new Map()
    reservations.forEach(reservation => {
      if (
        reservation.appointment_slot_id &&
        !['annulee', 'refusee'].includes(reservation.statut)
      ) {
        map.set(reservation.appointment_slot_id, reservation)
      }
    })
    return map
  }, [reservations])

  const now = Date.now()
  const upcomingSlots = slots.filter(slot => new Date(slot.ends_at).getTime() >= now)
  const stats = {
    open: upcomingSlots.filter(slot => slot.status === 'open').length,
    booked: upcomingSlots.filter(slot => slot.status === 'booked').length,
    blocked: upcomingSlots.filter(slot => slot.status === 'blocked').length,
  }

  async function addSlot(event) {
    event.preventDefault()
    if (!form.startsAt || !form.endsAt) return

    const startsAt = new Date(form.startsAt)
    const endsAt = new Date(form.endsAt)
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt <= new Date() || endsAt <= startsAt) {
      onToast?.('❌ Vérifie les dates : le début doit être futur et la fin après le début.', 'error')
      return
    }

    const label = form.label.trim()
    if (label.length < 2 || label.length > 100) {
      onToast?.('❌ Donne un intitulé compris entre 2 et 100 caractères.', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('appointment_slots').insert({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        label,
        status: 'open',
      })
      if (error) {
        if (error.code === '23505') throw new Error('Un créneau commence déjà à cette heure.')
        if (error.code === '23P01') throw new Error('Ce créneau chevauche un horaire déjà programmé.')
        throw error
      }
      setForm(EMPTY_FORM)
      onToast?.('✅ Créneau ajouté au calendrier')
      await loadCalendar()
    } catch (error) {
      onToast?.('❌ Impossible d’ajouter le créneau : ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function changeSlotStatus(slot, nextStatus) {
    setChangingId(slot.id)
    try {
      const { data, error } = await supabase
        .from('appointment_slots')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', slot.id)
        .eq('status', slot.status)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Ce créneau a changé entre-temps. Actualise le calendrier.')
      onToast?.(nextStatus === 'blocked' ? '⏸ Créneau bloqué' : '✅ Créneau de nouveau disponible')
      await loadCalendar()
    } catch (error) {
      onToast?.('❌ Impossible de modifier ce créneau : ' + error.message, 'error')
    } finally {
      setChangingId(null)
    }
  }

  async function deleteSlot(slot) {
    if (slot.status === 'booked') return
    if (!window.confirm('Supprimer définitivement ce créneau ?')) return
    setChangingId(slot.id)
    try {
      const { error } = await supabase.from('appointment_slots').delete().eq('id', slot.id)
      if (error) throw error
      onToast?.('🗑 Créneau supprimé')
      await loadCalendar()
    } catch (error) {
      onToast?.('❌ Impossible de supprimer ce créneau : ' + error.message, 'error')
    } finally {
      setChangingId(null)
    }
  }

  const sortedSlots = [...slots].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))

  return (
    <section className="appointment-admin">
      <header className="appointment-admin-head">
        <div>
          <span className="adm-eyebrow">ACCUEIL CLIENT · PLANNING</span>
          <h2>Calendrier des rendez-vous</h2>
          <p>Crée les horaires que les visiteurs pourront choisir pour présenter ou inspecter une voiture au showroom.</p>
        </div>
        <button type="button" className="act-btn" onClick={loadCalendar} disabled={loading}>↻ Actualiser</button>
      </header>

      <div className="appointment-admin-stats">
        <div><span>Disponibles</span><strong>{stats.open}</strong></div>
        <div><span>Réservés</span><strong>{stats.booked}</strong></div>
        <div><span>Bloqués</span><strong>{stats.blocked}</strong></div>
      </div>

      <form className="appointment-slot-form" onSubmit={addSlot}>
        <div className="appointment-slot-form-heading">
          <div>
            <h3>＋ Ajouter un créneau</h3>
            <p>Les horaires sont affichés en heure d’Algérie (Africa/Algiers).</p>
          </div>
        </div>
        <div className="appointment-slot-fields">
          <label>
            <span>Début du rendez-vous</span>
            <input type="datetime-local" min={toLocalInputValue(new Date())} value={form.startsAt} onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))} required />
          </label>
          <label>
            <span>Fin du rendez-vous</span>
            <input type="datetime-local" min={form.startsAt || toLocalInputValue(new Date())} value={form.endsAt} onChange={event => setForm(current => ({ ...current, endsAt: event.target.value }))} required />
          </label>
          <label className="appointment-slot-label-field">
            <span>Intitulé du créneau</span>
            <input type="text" maxLength={100} value={form.label} onChange={event => setForm(current => ({ ...current, label: event.target.value }))} placeholder="Ex. : Visite showroom, inspection..." required />
          </label>
        </div>
        <div className="appointment-slot-form-footer">
          <span>Un créneau réservé est automatiquement retiré des choix du site.</span>
          <button type="submit" className="act-btn primary" disabled={saving}>{saving ? '⏳ Enregistrement…' : '＋ Enregistrer le créneau'}</button>
        </div>
      </form>

      <div className="appointment-list-head">
        <div>
          <h3>Horaires programmés</h3>
          <p>{slots.length} créneau(x) enregistré(s)</p>
        </div>
        <span className="appointment-timezone">🕒 Heure d’Algérie</span>
      </div>

      {loadError ? (
        <div className="appointment-empty error">Impossible de charger le calendrier : {loadError}</div>
      ) : loading ? (
        <div className="appointment-empty">Chargement du calendrier…</div>
      ) : sortedSlots.length === 0 ? (
        <div className="appointment-empty">
          <span>🗓️</span>
          <strong>Aucun créneau pour le moment</strong>
          <p>Ajoute des horaires ci-dessus : les visiteurs pourront ensuite choisir leur date et leur heure directement depuis une fiche véhicule.</p>
        </div>
      ) : (
        <div className="appointment-slot-list">
          {sortedSlots.map(slot => {
            const booking = reservationBySlot.get(slot.id)
            const past = new Date(slot.ends_at).getTime() < Date.now()
            const busy = changingId === slot.id
            return (
              <article key={slot.id} className={`appointment-slot-card status-${slot.status}${past ? ' is-past' : ''}`}>
                <div className="appointment-slot-date">
                  <span>{formatDateTime(slot.starts_at)}</span>
                  <strong>{formatTimeRange(slot)}</strong>
                </div>
                <div className="appointment-slot-main">
                  <strong>{slot.label}</strong>
                  {booking ? (
                    <div className="appointment-slot-booking">
                      <span>👤 {booking.nom_client || 'Client'}</span>
                      {booking.telephone && <span>· {booking.telephone}</span>}
                      {booking.vehicule_nom && <small>🚘 {booking.vehicule_nom}</small>}
                      <small>Demande #{String(booking.id).slice(0, 12)} · {booking.statut}</small>
                    </div>
                  ) : (
                    <span className="appointment-slot-no-booking">
                      {slot.status === 'open' ? 'Visible sur le site' : slot.status === 'blocked' ? 'Non proposé aux visiteurs' : 'Réservation en cours de synchronisation'}
                    </span>
                  )}
                </div>
                <div className="appointment-slot-actions">
                  {slot.status === 'booked' ? (
                    booking && <button type="button" className="act-btn wa" onClick={() => openWA(booking, shopName)}>💬 Contacter</button>
                  ) : (
                    <>
                      <button type="button" className="act-btn" disabled={busy} onClick={() => changeSlotStatus(slot, slot.status === 'blocked' ? 'open' : 'blocked')}>
                        {slot.status === 'blocked' ? '↗ Réactiver' : '⏸ Bloquer'}
                      </button>
                      <button type="button" className="act-btn danger" disabled={busy} onClick={() => deleteSlot(slot)}>🗑</button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
