import { useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { genId, notifyTelegramSellRequest, waLink } from '../utils/notify'

const DETAILS_PREFIX = 'HBR_REQUEST_V2:'

function money(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} DA`
}

export default function SellVehicleModal({ onClose, vehicles = [], tradeMarginPercent = 5, whatsapp, shopName = 'Nabil Auto' }) {
  const marginValue = Number(tradeMarginPercent)
  const margin = Number.isFinite(marginValue) ? Math.min(30, Math.max(0, marginValue)) : 5
  const [type, setType] = useState('sell')
  const [form, setForm] = useState({
    marque: '', modele: '', annee: '', km: '', prix: '',
    targetVehicleId: '', nom: '', tel: '', message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const availableVehicles = useMemo(
    () => vehicles.filter(v => v.is_active !== false && v.statut === 'disponible'),
    [vehicles]
  )
  const targetVehicle = availableVehicles.find(v => String(v.id) === String(form.targetVehicleId)) || null
  const declaredValue = Math.max(0, Number(form.prix) || 0)
  const tradeOffer = Math.round(declaredValue * (1 - margin / 100))
  const targetPrice = Number(targetVehicle?.prix || 0)
  const balance = targetPrice - tradeOffer

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function buildWhatsAppText() {
    const vehicleName = `${form.marque} ${form.modele}`.trim()
    if (type === 'exchange') {
      const balanceText = balance > 0
        ? `Le client ajouterait environ ${money(balance)}.`
        : balance < 0
          ? `${shopName} verserait environ ${money(Math.abs(balance))} au client.`
          : 'Les deux véhicules sont à valeur équivalente selon cette estimation.'
      return `Bonjour ${shopName}, je souhaite proposer un échange. Mon véhicule : ${vehicleName} (${form.annee || '?'}) — ${form.km || '?'} km. Valeur estimée : ${money(declaredValue)}. Véhicule souhaité : ${targetVehicle ? `${targetVehicle.marque} ${targetVehicle.modele}` : 'à définir'}. Offre de reprise simulée : ${money(tradeOffer)} (marge ${margin} %). ${balanceText}`
    }
    return `Bonjour ${shopName}, je souhaite vendre mon véhicule : ${vehicleName} (${form.annee || '?'}) — ${form.km || '?'} km. Prix souhaité : ${form.prix ? money(form.prix) : 'à discuter'}.`
  }

  async function submit() {
    const phoneDigits = form.tel.replace(/\D/g, '')
    const year = form.annee ? Number(form.annee) : null
    const km = form.km === '' ? null : Number(form.km)
    const price = form.prix === '' ? null : Number(form.prix)
    const maxYear = new Date().getFullYear() + 1

    if (!form.marque.trim() || !form.modele.trim() || !form.nom.trim() || !form.tel.trim()) {
      setError('Renseigne la marque, le modèle, ton nom et ton téléphone.')
      return
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setError('Vérifie le numéro de téléphone (8 à 15 chiffres).')
      return
    }
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > maxYear)) {
      setError(`L’année doit être comprise entre 1950 et ${maxYear}.`)
      return
    }
    if (km !== null && (!Number.isFinite(km) || km < 0)) {
      setError('Le kilométrage doit être un nombre positif ou nul.')
      return
    }
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      setError('Le prix doit être supérieur à zéro.')
      return
    }
    if (type === 'exchange' && (!form.prix || declaredValue <= 0 || !targetVehicle)) {
      setError('Pour simuler un échange, indique une valeur estimée et choisis le véhicule souhaité.')
      return
    }

    setSending(true)
    setError('')

    const details = {
      version: 2,
      type,
      note: form.message.trim(),
      targetVehicle: targetVehicle ? {
        id: targetVehicle.id,
        label: `${targetVehicle.marque} ${targetVehicle.modele}`,
        price: targetPrice,
      } : null,
      trade: type === 'exchange' ? {
        declaredValue,
        marginPercent: margin,
        offer: tradeOffer,
        targetPrice,
        balance,
        balanceDirection: balance > 0 ? 'client_to_hbr' : balance < 0 ? 'hbr_to_client' : 'equal',
      } : null,
    }

    const request = {
      id: genId(),
      marque: form.marque.trim(),
      modele: form.modele.trim(),
      annee: year,
      km,
      prix_souhaite: price,
      nom_client: form.nom.trim(),
      telephone: form.tel.trim(),
      message: DETAILS_PREFIX + JSON.stringify(details),
      statut: 'nouvelle',
    }

    try {
      const { error: insertError } = await supabase.from('sell_requests').insert(request)
      if (insertError) throw insertError
      notifyTelegramSellRequest(request, details)
      setSent(true)
    } catch (err) {
      console.error('HBR AUTO request:', err)
      setError('Une erreur est survenue, merci de réessayer.')
    } finally {
      setSending(false)
    }
  }

  const canSubmit = form.marque.trim() && form.modele.trim() && form.nom.trim() && form.tel.trim()
    && (type !== 'exchange' || (declaredValue > 0 && !!targetVehicle))

  return (
    <div className="res-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-box trade-modal">
        <button className="btn-close" onClick={onClose}>✕</button>

        {!sent ? (
          <>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 21, fontWeight: 900, color: 'white', marginBottom: 4 }}>
              Vendre ou échanger votre véhicule
            </h2>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginBottom: 16, lineHeight: 1.6 }}>
              {shopName} étudie aussi les véhicules d’occasion. Décrivez votre voiture et choisissez le type de proposition.
            </p>

            <div className="trade-type-grid">
              <button type="button" className={`trade-type-option ${type === 'sell' ? 'active' : ''}`} onClick={() => setType('sell')}>
                <strong>💰 Vendre à HBR AUTO</strong>
                <small>Nous proposons une offre après étude du véhicule</small>
              </button>
              <button type="button" className={`trade-type-option ${type === 'exchange' ? 'active' : ''}`} onClick={() => setType('exchange')}>
                <strong>🔁 Échanger ma voiture</strong>
                <small>Votre véhicule en reprise + une différence éventuelle</small>
              </button>
            </div>

            <div className="trade-form-section">
              <div className="trade-section-title">1. Votre véhicule</div>
              <div className="pf-grid" style={{ marginBottom: 12 }}>
                <div className="form-field"><label>Marque *</label><input value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Ex : Volkswagen" /></div>
                <div className="form-field"><label>Modèle *</label><input value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="Ex : Golf 7" /></div>
                <div className="form-field"><label>Année</label><input type="number" min="1980" max={new Date().getFullYear() + 1} value={form.annee} onChange={e => set('annee', e.target.value)} placeholder="2019" /></div>
                <div className="form-field"><label>Kilométrage</label><input type="number" min="0" value={form.km} onChange={e => set('km', e.target.value)} placeholder="65000" /></div>
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label>{type === 'exchange' ? 'Valeur estimée de votre véhicule (DA) *' : 'Prix souhaité (DA) — optionnel'}</label>
                <input type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="Ex : 3200000" />
              </div>
            </div>

            {type === 'exchange' && (
              <div className="trade-form-section">
                <div className="trade-section-title">2. Le véhicule que vous souhaitez recevoir</div>
                {availableVehicles.length > 0 ? (
                  <div className="form-field">
                    <label>Choisir dans le stock HBR AUTO *</label>
                    <select value={form.targetVehicleId} onChange={e => set('targetVehicleId', e.target.value)}>
                      <option value="">Sélectionner un véhicule…</option>
                      {availableVehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.marque} {v.modele} ({Number(v.km || 0) > 0 ? 'Occasion' : 'Neuf'}) — {money(v.prix)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="trade-muted">Aucun véhicule disponible dans le stock pour le moment. Contactez-nous pour un échange personnalisé.</p>
                )}

                <div className="trade-calculation">
                  <div className="trade-calculation-heading">Simulation de l’échange</div>
                  <div className="trade-calculation-row"><span>Valeur estimée de votre voiture</span><strong>{money(declaredValue)}</strong></div>
                  <div className="trade-calculation-row"><span>Marge de sécurité HBR AUTO ({margin} %)</span><strong>− {money(declaredValue - tradeOffer)}</strong></div>
                  <div className="trade-calculation-row trade-offer"><span>Offre de reprise simulée</span><strong>{money(tradeOffer)}</strong></div>
                  <div className="trade-calculation-row"><span>Prix du véhicule choisi</span><strong>{targetVehicle ? money(targetPrice) : '—'}</strong></div>
                  {targetVehicle && (
                    <div className="trade-balance">
                      {balance > 0
                        ? <><small>Complément estimé à ajouter par le client</small><strong>{money(balance)}</strong></>
                        : balance < 0
                          ? <><small>Complément estimé à verser par HBR AUTO</small><strong>{money(Math.abs(balance))}</strong></>
                          : <><small>Échange à valeur équivalente</small><strong>0 DA</strong></>}
                    </div>
                  )}
                  <p className="trade-disclaimer">Simulation indicative basée sur les valeurs saisies et une marge réglable par HBR AUTO. L’offre définitive dépendra de l’inspection, de l’état mécanique et des documents du véhicule.</p>
                </div>
              </div>
            )}

            <div className="trade-form-section">
              <div className="trade-section-title">{type === 'exchange' ? '3. Vos coordonnées' : '2. Vos coordonnées'}</div>
              <div className="pf-grid" style={{ marginBottom: 12 }}>
                <div className="form-field"><label>Votre nom *</label><input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom et prénom" /></div>
                <div className="form-field"><label>Téléphone *</label><input type="tel" value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="05 50 12 34 56" /></div>
              </div>
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label>Message / état du véhicule (optionnel)</label>
                <textarea rows={3} value={form.message} onChange={e => set('message', e.target.value)} placeholder="État général, entretien, options, réparations à prévoir..." />
              </div>
            </div>

            {error && <div style={{ color: '#ffb3b8', fontSize: 12.5, marginBottom: 10 }}>❌ {error}</div>}

            <button className="btn-save" style={{ width: '100%', padding: 13, fontSize: 14 }} onClick={submit} disabled={sending || !canSubmit}>
              {sending ? '⏳ Envoi en cours...' : type === 'exchange' ? '🔁 Envoyer ma proposition d’échange' : '📩 Envoyer ma proposition de vente'}
            </button>
          </>
        ) : (
          <div className="res-success">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 8 }}>
              {type === 'exchange' ? 'Proposition d’échange envoyée !' : 'Proposition envoyée !'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 20, lineHeight: 1.6 }}>
              Notre équipe va étudier votre véhicule et vous recontacter pour confirmer sa valeur et les conditions.
            </p>
            {type === 'exchange' && targetVehicle && (
              <div className="trade-calculation" style={{ textAlign: 'left', marginBottom: 16 }}>
                <div className="trade-calculation-row trade-offer"><span>Offre de reprise simulée</span><strong>{money(tradeOffer)}</strong></div>
                <div className="trade-calculation-row"><span>Véhicule souhaité</span><strong>{money(targetPrice)}</strong></div>
                <div className="trade-balance">
                  <small>{balance > 0 ? 'Complément estimé à ajouter par vous' : balance < 0 ? 'Complément estimé versé par HBR AUTO' : 'Valeurs équivalentes'}</small>
                  <strong>{money(Math.abs(balance))}</strong>
                </div>
              </div>
            )}
            <a href={waLink(buildWhatsAppText(), whatsapp)} target="_blank" rel="noreferrer" className="btn-hero-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
              💬 Confirmer sur WhatsApp
            </a>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
