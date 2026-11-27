import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { fmt, genId, notifyTelegram, waLink } from '../utils/notify'
import { PLACEHOLDER_IMG } from '../data/vehicles-data'
import { useLang } from '../i18n/LangContext'
import WhatsAppIcon from './WhatsAppIcon'

function algeriaDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

function formatSlotDate(value, lang) {
  return new Date(value).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    timeZone: 'Africa/Algiers', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatSlotTime(value, lang) {
  return new Date(value).toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    timeZone: 'Africa/Algiers', hour: '2-digit', minute: '2-digit',
  })
}

function formatSlotDay(slot, lang) {
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR'
  const date = new Date(slot.starts_at)
  return {
    weekday: date.toLocaleDateString(locale, { timeZone: 'Africa/Algiers', weekday: 'short' }),
    day: date.toLocaleDateString(locale, { timeZone: 'Africa/Algiers', day: '2-digit' }),
    month: date.toLocaleDateString(locale, { timeZone: 'Africa/Algiers', month: 'short' }),
  }
}

export default function ReservationModal({ vehicle, onClose, shopName = 'Nabil Auto', whatsapp }) {
  const { t, lang } = useLang()
  const [form, setForm] = useState({ nom: '', tel: '', date: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [requestReference, setRequestReference] = useState('')
  const [error, setError] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlotDate, setSelectedSlotDate] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [slotsError, setSlotsError] = useState(false)

  useEffect(() => {
    let active = true
    async function loadSlots() {
      const { data, error: loadError } = await supabase
        .from('appointment_slots')
        .select('id, starts_at, ends_at, label')
        .eq('status', 'open')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(100)
      if (!active) return
      if (loadError) {
        console.warn('HBR AUTO appointment slots:', loadError)
        setSlotsError(true)
        setAvailableSlots([])
      } else {
        const slots = data || []
        setAvailableSlots(slots)
        setSlotsError(false)
        if (slots.length > 0) {
          setSelectedSlotDate(algeriaDateKey(slots[0].starts_at))
          setSelectedSlotId(slots[0].id)
        }
      }
      setSlotsLoading(false)
    }
    loadSlots()
    return () => { active = false }
  }, [])

  const availableDates = []
  const seenDates = new Set()
  availableSlots.forEach(slot => {
    const key = algeriaDateKey(slot.starts_at)
    if (!seenDates.has(key)) {
      seenDates.add(key)
      availableDates.push({ key, startsAt: slot.starts_at, ...formatSlotDay(slot, lang) })
    }
  })
  const slotsForSelectedDate = availableSlots.filter(slot => algeriaDateKey(slot.starts_at) === selectedSlotDate)
  const selectedSlot = slotsForSelectedDate.find(slot => slot.id === selectedSlotId) || null

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nom.trim() || !form.tel.trim()) return
    const phoneDigits = form.tel.replace(/\D/g, '')
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setError('Vérifie le numéro de téléphone (8 à 15 chiffres).')
      return
    }

    if (availableSlots.length > 0 && !selectedSlot) {
      setError(t.reservation.slotTaken)
      return
    }

    setSending(true)
    setError('')

    const res = {
      id: genId(),
      vehicle_id: vehicle.id,
      vehicule_nom: `${vehicle.marque} ${vehicle.modele} (${vehicle.annee})`,
      vehicule_prix: vehicle.prix,
      nom_client: form.nom.trim(),
      telephone: form.tel.trim(),
      date_souhaitee: selectedSlot ? formatSlotDate(selectedSlot.starts_at, lang) : form.date.trim() || null,
      appointment_slot_id: selectedSlot?.id || null,
      message: form.message.trim() || null,
      statut: 'nouvelle',
    }

    try {
      const { error: err } = await supabase.from('reservations').insert(res)
      if (err) throw err
      notifyTelegram(res)
      setRequestReference(res.id)
      setSent(true)
    } catch (err) {
      console.error('HBR AUTO reservation:', err)
      if (String(err?.message || '').includes('APPOINTMENT_SLOT_UNAVAILABLE')) {
        setError(t.reservation.slotTaken)
        const { data } = await supabase
          .from('appointment_slots')
          .select('id, starts_at, ends_at, label')
          .eq('status', 'open')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(100)
        const slots = data || []
        setAvailableSlots(slots)
        setSelectedSlotDate(slots[0] ? algeriaDateKey(slots[0].starts_at) : '')
        setSelectedSlotId(slots[0]?.id || '')
      } else {
        setError(t.reservation.erreur)
      }
    } finally {
      setSending(false)
    }
  }

  const waConfirmText =
    `Bonjour, je suis ${form.nom}. Je confirme ma demande de réservation pour :\n` +
    `🚘 ${vehicle.marque} ${vehicle.modele} (${vehicle.annee}) — ${fmt(vehicle.prix)}` +
    (selectedSlot ? `\n📅 ${formatSlotDate(selectedSlot.starts_at, lang)}` : form.date ? `\n📅 ${form.date}` : '') +
    (form.message ? `\n📝 ${form.message}` : '')

  return (
    <div className="res-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-box">
        <button className="btn-close" onClick={onClose}>✕</button>

        {!sent ? (
          <>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 21, fontWeight: 900, color: 'white', marginBottom: 4 }}>
              {t.reservation.titre}
            </h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>{t.reservation.sousTitre}</p>

            <div className="res-veh-preview">
              <img src={vehicle.img || PLACEHOLDER_IMG} alt="" />
              <div>
                <div className="nom">{vehicle.marque} {vehicle.modele}</div>
                <div className="prix">{fmt(vehicle.prix)}</div>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>{t.reservation.nom}</label>
              <input placeholder={t.reservation.nomPh} value={form.nom} onChange={e => set('nom', e.target.value)} />
            </div>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>{t.reservation.tel}</label>
              <input placeholder={t.reservation.telPh} type="tel" inputMode="tel" maxLength={30} value={form.tel} onChange={e => set('tel', e.target.value)} />
            </div>
            {slotsLoading ? (
              <div className="res-calendar-loading" role="status">{t.reservation.slotLoading}</div>
            ) : availableSlots.length > 0 ? (
              <div className="res-calendar-picker">
                <div className="res-calendar-title-row">
                  <label>{t.reservation.slotDate}</label>
                  <span>{t.reservation.slotHint}</span>
                </div>
                <div className="res-calendar-days">
                  {availableDates.map(day => (
                    <button
                      type="button"
                      key={day.key}
                      className={selectedSlotDate === day.key ? 'active' : ''}
                      aria-pressed={selectedSlotDate === day.key}
                      onClick={() => {
                        setSelectedSlotDate(day.key)
                        const firstSlot = availableSlots.find(slot => algeriaDateKey(slot.starts_at) === day.key)
                        setSelectedSlotId(firstSlot?.id || '')
                      }}
                    >
                      <small>{day.weekday}</small>
                      <strong>{day.day}</strong>
                      <small>{day.month}</small>
                    </button>
                  ))}
                </div>
                <div className="res-calendar-title-row res-calendar-time-heading">
                  <label>{t.reservation.slotTime}</label>
                </div>
                <div className="res-calendar-times">
                  {slotsForSelectedDate.map(slot => (
                    <button
                      type="button"
                      key={slot.id}
                      className={selectedSlotId === slot.id ? 'active' : ''}
                      aria-pressed={selectedSlotId === slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      {formatSlotTime(slot.starts_at, lang)} – {formatSlotTime(slot.ends_at, lang)}
                    </button>
                  ))}
                </div>
                {slotsForSelectedDate.length === 0 && <p className="res-calendar-empty">{t.reservation.slotNoTimes}</p>}
              </div>
            ) : (
              <div className="form-field" style={{ marginBottom: 12 }}>
                {slotsError && <p className="res-calendar-fallback-note">{t.reservation.slotLoadFailed}</p>}
                <label>{t.reservation.date}</label>
                <input placeholder={t.reservation.datePh} value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
            )}
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label>{t.reservation.message}</label>
              <textarea rows={3} placeholder={t.reservation.messagePh} value={form.message} onChange={e => set('message', e.target.value)} />
            </div>

            {error && <div style={{ color: '#ffb3b8', fontSize: 12.5, marginBottom: 10 }}>❌ {error}</div>}

            <button
              className="btn-save"
              style={{ width: '100%', padding: 13, fontSize: 14 }}
              onClick={submit}
              disabled={sending || slotsLoading || !form.nom.trim() || !form.tel.trim() || (availableSlots.length > 0 && !selectedSlot)}
            >
              {sending ? t.reservation.envoiEnCours : t.reservation.envoyer}
            </button>
          </>
        ) : (
          <div className="res-success">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 8 }}>{t.reservation.envoye}</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 20, lineHeight: 1.6 }}>
              {t.reservation.merci}<br />{t.reservation.confirmerWA}
            </p>
            <div className="customer-reference-box">
              <span>{t.tracking.referenceSaved}</span>
              <strong>{requestReference}</strong>
              <small>{t.tracking.referenceHelp}</small>
            </div>
            {waLink(`Bonjour ${shopName}, ${waConfirmText}`, whatsapp) && <a href={waLink(`Bonjour ${shopName}, ${waConfirmText}`, whatsapp)} target="_blank" rel="noreferrer" className="btn-hero-primary whatsapp-action-btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
              <WhatsAppIcon size={19} /> {t.reservation.confirmerBtn}
            </a>}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>{t.reservation.fermer}</button>
          </div>
        )}
      </div>
    </div>
  )
}
