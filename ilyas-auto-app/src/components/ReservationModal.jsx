import { useState } from 'react'
import { supabase } from '../supabase'
import { fmt, genId, notifyTelegram, waLink } from '../utils/notify'
import { PLACEHOLDER_IMG } from '../data/vehicles-data'

export default function ReservationModal({ vehicle, onClose }) {
  const [form, setForm] = useState({ nom: '', tel: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nom.trim() || !form.tel.trim()) return
    setSending(true)
    setError('')

    const res = {
      id: genId(),
      vehicle_id: vehicle.id,
      vehicule_nom: `${vehicle.marque} ${vehicle.modele} (${vehicle.annee})`,
      vehicule_prix: vehicle.prix,
      nom_client: form.nom.trim(),
      telephone: form.tel.trim(),
      message: form.message.trim() || null,
      statut: 'nouvelle',
    }

    const { error: err } = await supabase.from('reservations').insert(res)
    setSending(false)

    if (err) { setError('Une erreur est survenue, merci de réessayer.'); return }

    notifyTelegram(res)
    setReservation(res)
    setSent(true)
  }

  const waConfirmText =
    `Bonjour, je suis ${form.nom}. Je confirme ma demande de réservation pour :\n` +
    `🚘 ${vehicle.marque} ${vehicle.modele} (${vehicle.annee}) — ${fmt(vehicle.prix)}` +
    (form.message ? `\n📝 ${form.message}` : '')

  return (
    <div className="res-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-box">
        <button className="btn-close" onClick={onClose}>✕</button>

        {!sent ? (
          <>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 21, fontWeight: 900, color: 'white', marginBottom: 4 }}>
              Réserver ce véhicule
            </h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>Un conseiller vous recontacte rapidement.</p>

            <div className="res-veh-preview">
              <img src={vehicle.img || PLACEHOLDER_IMG} alt="" />
              <div>
                <div className="nom">{vehicle.marque} {vehicle.modele}</div>
                <div className="prix">{fmt(vehicle.prix)}</div>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>Votre nom *</label>
              <input placeholder="Nom et prénom" value={form.nom} onChange={e => set('nom', e.target.value)} />
            </div>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>Téléphone *</label>
              <input placeholder="05 50 12 34 56" type="tel" value={form.tel} onChange={e => set('tel', e.target.value)} />
            </div>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label>Message (optionnel)</label>
              <textarea rows={3} placeholder="Je souhaite réserver / avoir plus d'infos..." value={form.message} onChange={e => set('message', e.target.value)} />
            </div>

            {error && <div style={{ color: '#ffb3b8', fontSize: 12.5, marginBottom: 10 }}>❌ {error}</div>}

            <button
              className="btn-save"
              style={{ width: '100%', padding: 13, fontSize: 14 }}
              onClick={submit}
              disabled={sending || !form.nom.trim() || !form.tel.trim()}
            >
              {sending ? '⏳ Envoi en cours...' : '📩 Envoyer la demande'}
            </button>
          </>
        ) : (
          <div className="res-success">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 8 }}>Demande envoyée !</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 20, lineHeight: 1.6 }}>
              Notre équipe vous contactera très vite.<br/>Accélérez la procédure en confirmant sur WhatsApp :
            </p>
            <a href={waLink(waConfirmText)} target="_blank" rel="noreferrer" className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
              💬 Confirmer sur WhatsApp
            </a>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
