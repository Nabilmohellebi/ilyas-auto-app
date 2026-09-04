import { useState } from 'react'
import { supabase } from '../supabase'
import { genId, waLink } from '../utils/notify'

export default function SellVehicleModal({ onClose }) {
  const [form, setForm] = useState({ marque: '', modele: '', annee: '', km: '', prix: '', nom: '', tel: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.marque.trim() || !form.modele.trim() || !form.nom.trim() || !form.tel.trim()) return
    setSending(true)
    setError('')

    const req = {
      id: genId(),
      marque: form.marque.trim(),
      modele: form.modele.trim(),
      annee: form.annee ? Number(form.annee) : null,
      km: form.km ? Number(form.km) : null,
      prix_souhaite: form.prix ? Number(form.prix) : null,
      nom_client: form.nom.trim(),
      telephone: form.tel.trim(),
      message: form.message.trim() || null,
      statut: 'nouvelle',
    }

    const { error: err } = await supabase.from('sell_requests').insert(req)
    setSending(false)
    if (err) { setError('Une erreur est survenue, merci de réessayer.'); return }
    setSent(true)
  }

  const waText = `Bonjour, je souhaite vendre mon véhicule : ${form.marque} ${form.modele} (${form.annee || '?'}) — ${form.km || '?'} km. Prix souhaité : ${form.prix || 'à discuter'} DA.`

  return (
    <div className="res-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-box">
        <button className="btn-close" onClick={onClose}>✕</button>

        {!sent ? (
          <>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 21, fontWeight: 900, color: 'white', marginBottom: 4 }}>
              Vendez votre véhicule
            </h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)', marginBottom: 16 }}>
              Décrivez votre véhicule, notre équipe vous fait une offre de reprise.
            </p>

            <div className="pf-grid" style={{ marginBottom: 12 }}>
              <div className="form-field"><label>Marque *</label><input value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Ex : Volkswagen" /></div>
              <div className="form-field"><label>Modèle *</label><input value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="Ex : Golf 7" /></div>
              <div className="form-field"><label>Année</label><input type="number" value={form.annee} onChange={e => set('annee', e.target.value)} placeholder="2019" /></div>
              <div className="form-field"><label>Kilométrage</label><input type="number" value={form.km} onChange={e => set('km', e.target.value)} placeholder="65000" /></div>
            </div>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>Prix souhaité (DA) — optionnel</label>
              <input type="number" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="Ex : 3200000" />
            </div>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>Votre nom *</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom et prénom" />
            </div>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label>Téléphone *</label>
              <input type="tel" value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="05 50 12 34 56" />
            </div>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label>Message (optionnel)</label>
              <textarea rows={3} value={form.message} onChange={e => set('message', e.target.value)} placeholder="État général, entretien, options..." />
            </div>

            {error && <div style={{ color: '#ffb3b8', fontSize: 12.5, marginBottom: 10 }}>❌ {error}</div>}

            <button
              className="btn-save"
              style={{ width: '100%', padding: 13, fontSize: 14 }}
              onClick={submit}
              disabled={sending || !form.marque.trim() || !form.modele.trim() || !form.nom.trim() || !form.tel.trim()}
            >
              {sending ? '⏳ Envoi en cours...' : '📩 Envoyer ma demande'}
            </button>
          </>
        ) : (
          <div className="res-success">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 8 }}>Demande envoyée !</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 20, lineHeight: 1.6 }}>
              Notre équipe étudie votre véhicule et vous recontacte rapidement.
            </p>
            <a href={waLink(waText)} target="_blank" rel="noreferrer" className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
              💬 Confirmer sur WhatsApp
            </a>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
