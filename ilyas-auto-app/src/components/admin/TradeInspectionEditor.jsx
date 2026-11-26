import { useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { fmt } from '../../utils/notify'
import { TRANSMISSIONS, FUELS, BODY_TYPES } from '../../data/vehicles-data'

const CONDITION_OPTIONS = [
  { value: 'a_verifier', label: 'À vérifier' },
  { value: 'bon', label: 'Bon état' },
  { value: 'moyen', label: 'À surveiller' },
  { value: 'mauvais', label: 'Réparations nécessaires' },
]
const DOCUMENT_OPTIONS = [
  { value: 'complets', label: 'Documents complets' },
  { value: 'incomplets', label: 'Documents incomplets' },
  { value: 'verifier', label: 'À vérifier' },
]
const ROAD_TEST_OPTIONS = [
  { value: 'concluant', label: 'Essai concluant' },
  { value: 'reserve', label: 'Anomalies à vérifier' },
  { value: 'non_effectue', label: 'Essai non effectué' },
]
const INSPECTION_FIELDS = [
  ['exterieur', 'Carrosserie / extérieur'],
  ['interieur', 'Habitacle / intérieur'],
  ['mecanique', 'Moteur / mécanique'],
  ['boite', 'Boîte de vitesses'],
  ['pneus', 'Pneus / freinage'],
  ['electronique', 'Électronique / équipements'],
]

const CHECKLIST_STATUS_OPTIONS = [
  { value: 'bon', label: 'Bon' },
  { value: 'a_prevoir', label: 'À prévoir' },
  { value: 'defaut', label: 'Défaut' },
  { value: 'non_verifie', label: 'Non vérifié' },
]
const CHECKLIST_STATUS_LABELS = Object.fromEntries(CHECKLIST_STATUS_OPTIONS.map(option => [option.value, option.label]))
const GENERAL_STATUS_LABELS = {
  a_verifier: 'À vérifier', bon: 'Bon état', moyen: 'À surveiller', mauvais: 'Réparations nécessaires',
  complets: 'Documents complets', incomplets: 'Documents incomplets', verifier: 'À vérifier',
  concluant: 'Essai concluant', reserve: 'Anomalies à vérifier', non_effectue: 'Essai non effectué',
}
const CHECKLIST_GROUPS = [
  { key: 'carrosserie', label: 'Carrosserie & vitrages', items: [
    ['peinture', 'Peinture, différences de teinte et retouches'], ['corrosion', 'Rouille, corrosion et traces de réparation'],
    ['capot', 'Capot et alignement des ouvrants'], ['portes', 'Portes, ailes et alignements'], ['parechocs', 'Pare-chocs et protections'],
    ['toit', 'Toit et pavillon'], ['vitrage', 'Pare-brise et vitres'], ['eclairage', 'Phares, feux et clignotants'],
  ] },
  { key: 'habitacle', label: 'Habitacle & équipements', items: [
    ['sieges', 'Sièges, sellerie et garnitures'], ['tableau_bord', 'Tableau de bord et voyants'],
    ['climatisation', 'Climatisation et chauffage'], ['leve_vitres', 'Vitres électriques et verrouillage'],
    ['ceintures', 'Ceintures et boucles de sécurité'], ['commandes', 'Commandes, éclairage et équipements'],
  ] },
  { key: 'moteur', label: 'Moteur & compartiment moteur', items: [
    ['demarrage', 'Démarrage à froid et à chaud'], ['ralenti', 'Stabilité du ralenti et accélération'],
    ['fumee', 'Fumées anormales à l’échappement'], ['bruits_moteur', 'Bruits ou vibrations moteur'],
    ['fuite_huile', 'Fuites d’huile'], ['fuite_liquide', 'Fuites de liquide de refroidissement'],
    ['niveaux', 'Niveaux des fluides et état apparent'], ['batterie', 'Batterie et charge'],
  ] },
  { key: 'transmission', label: 'Transmission, direction & liaisons au sol', items: [
    ['embrayage', 'Embrayage et point de patinage'], ['boite', 'Passage des rapports / boîte automatique'],
    ['direction', 'Direction et assistance'], ['suspension', 'Suspensions et amortisseurs'],
    ['freinage', 'Freinage et frein à main'], ['pneus', 'Pneus, usure et dimensions'],
    ['jantes', 'Jantes et roues'], ['dessous', 'Dessous de caisse et châssis visibles'],
  ] },
  { key: 'essai', label: 'Essai routier', items: [
    ['essai_acceleration', 'Accélération et reprise'], ['essai_freinage', 'Freinage en ligne droite'],
    ['essai_direction', 'Tenue de cap et direction'], ['essai_vibrations', 'Vibrations et bruits en roulage'],
    ['essai_temperature', 'Température moteur'], ['essai_confort', 'Confort et comportement général'],
  ] },
  { key: 'documents_detail', label: 'Documents & accessoires remis', items: [
    ['carte_grise', 'Carte grise / certificat d’immatriculation'], ['controle_technique', 'Contrôle technique, si applicable'],
    ['assurance', 'Attestation d’assurance'], ['carnet_entretien', 'Carnet et factures d’entretien'],
    ['double_cles', 'Double des clés'], ['kit_securite', 'Roue de secours / kit anti-crevaison et outils'],
  ] },
]

function asText(value) {
  return value == null ? '' : String(value)
}

export default function TradeInspectionEditor({ request, details = {}, onClose, onSave, onFinalize, onToast }) {
  const savedInspection = details.inspection || {}
  const savedOffer = details.finalOffer || {}
  const savedDraft = details.finalizationDraft || {}
  const [inspection, setInspection] = useState({
    exterieur: 'a_verifier',
    interieur: 'a_verifier',
    mecanique: 'a_verifier',
    boite: 'a_verifier',
    pneus: 'a_verifier',
    electronique: 'a_verifier',
    documents: 'verifier',
    essai: 'non_effectue',
    notes: '',
    ...savedInspection,
    immatriculation: savedInspection.immatriculation || '',
    vin: savedInspection.vin || '',
    couleur: savedInspection.couleur || '',
    inspecteur: savedInspection.inspecteur || '',
    checklist: {
      ...Object.fromEntries(CHECKLIST_GROUPS.flatMap(group => group.items.map(([key]) => [key, 'non_verifie']))),
      ...(savedInspection.checklist || {}),
    },
    photos: Array.isArray(savedInspection.photos) ? savedInspection.photos : [],
  })
  const [finalOffer, setFinalOffer] = useState({
    amount: asText(savedOffer.amount ?? details.trade?.offer ?? request.prix_souhaite ?? ''),
    decision: savedOffer.decision || 'pending',
    note: savedOffer.note || '',
  })
  const [stock, setStock] = useState({
    year: asText(savedDraft.year ?? request.annee ?? ''),
    km: asText(savedDraft.km ?? request.km ?? ''),
    stockSalePrice: asText(savedDraft.stockSalePrice ?? ''),
    transportCost: asText(savedDraft.transportCost ?? '0'),
    preparationCost: asText(savedDraft.preparationCost ?? '0'),
    otherCosts: asText(savedDraft.otherCosts ?? '0'),
    transmission: savedDraft.transmission || 'Automatique',
    carburant: savedDraft.carburant || 'Diesel',
    carrosserie: savedDraft.carrosserie || 'Berline',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const isFinalized = Boolean(details.finalization?.vehicleId)
  const isAccepted = finalOffer.decision === 'accepted' || request.statut === 'acceptee'
  const estimatedExchangeBalance = useMemo(() => {
    const targetPrice = Number(details.targetVehicle?.price || 0)
    const amount = Number(finalOffer.amount)
    return targetPrice > 0 && Number.isFinite(amount) && amount > 0 ? targetPrice - amount : null
  }, [details.targetVehicle?.price, finalOffer.amount])

  function setInspectionField(key, value) {
    setInspection(current => ({ ...current, [key]: value }))
  }
  function setChecklistField(key, value) {
    setInspection(current => ({ ...current, checklist: { ...(current.checklist || {}), [key]: value } }))
  }
  function setOfferField(key, value) {
    setFinalOffer(current => ({ ...current, [key]: value }))
  }
  function setStockField(key, value) {
    setStock(current => ({ ...current, [key]: value }))
  }

  function buildDetails(offer = finalOffer) {
    return {
      ...details,
      version: 3,
      inspection: {
        ...inspection,
        inspectedAt: new Date().toISOString(),
      },
      finalOffer: {
        ...offer,
        amount: offer.amount === '' ? null : Number(offer.amount),
      },
      finalizationDraft: { ...stock },
    }
  }

  async function persist(status, decision = finalOffer.decision) {
    if (isFinalized) return
    const amount = finalOffer.amount.trim() === '' ? null : Number(finalOffer.amount)
    if (decision !== 'pending' && (!Number.isFinite(amount) || amount <= 0)) {
      setErrorMessage('Saisis une offre définitive supérieure à zéro avant de continuer.')
      return
    }
    if (status === 'offre_proposee' && (!Number.isFinite(amount) || amount <= 0)) {
      setErrorMessage('Saisis le montant de l’offre avant de l’enregistrer.')
      return
    }
    setErrorMessage('')
    const nextOffer = { ...finalOffer, decision, amount: amount === null ? '' : String(amount) }
    setSaving(true)
    try {
      const saved = await onSave(buildDetails(nextOffer), status)
      if (saved) setFinalOffer(nextOffer)
    } catch (error) {
      setErrorMessage(error?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhotos(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    if (inspection.photos.length + files.length > 6) {
      setErrorMessage('Tu peux conserver 6 photos maximum dans cette fiche.')
      return
    }
    setErrorMessage('')
    setUploading(true)
    const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const uploaded = []
    try {
      for (const file of files) {
        if (!allowed[file.type]) throw new Error('Format non accepté : utilise JPG, PNG ou WebP.')
        if (file.size > 8 * 1024 * 1024) throw new Error('Chaque photo doit faire 8 Mo maximum.')
        const id = window.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(36).slice(2))
        const path = `trade-inspections/${request.id}/${id}.${allowed[file.type]}`
        const { error } = await supabase.storage.from('vehicle-images').upload(path, file, {
          cacheControl: '31536000',
          contentType: file.type,
          upsert: false,
        })
        if (error) throw error
        const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
        uploaded.push({ path, url: data.publicUrl, name: file.name })
      }
      setInspection(current => ({ ...current, photos: [...current.photos, ...uploaded] }))
      onToast?.('✅ Photos ajoutées à la fiche d’inspection')
    } catch (error) {
      onToast?.('❌ Import des photos impossible : ' + error.message, 'error')
      if (uploaded.length) await supabase.storage.from('vehicle-images').remove(uploaded.map(item => item.path))
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto(photo) {
    if (photo.path) {
      const { error } = await supabase.storage.from('vehicle-images').remove([photo.path])
      if (error) {
        onToast?.('❌ Impossible de supprimer cette photo : ' + error.message, 'error')
        return
      }
    }
    setInspection(current => ({
      ...current,
      photos: current.photos.filter(item => photo.path ? item.path !== photo.path : item.url !== photo.url),
    }))
  }

  async function finalize() {
    const amount = Number(finalOffer.amount)
    const year = Number(stock.year || request.annee)
    const salePrice = Number(stock.stockSalePrice)
    const maxYear = new Date().getFullYear() + 1
    if (!isAccepted) {
      setErrorMessage('Confirme d’abord que le client accepte l’offre.')
      return
    }
    if (!Number.isInteger(year) || year < 1950 || year > maxYear) {
      setErrorMessage(`Indique une année valide entre 1950 et ${maxYear}.`)
      return
    }
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(salePrice) || salePrice <= 0) {
      setErrorMessage('Le prix définitif de reprise et le prix de mise en vente sont obligatoires.')
      return
    }
    const nextDetails = buildDetails({ ...finalOffer, decision: 'accepted', amount })
    setErrorMessage('')
    setFinalizing(true)
    try {
      await onFinalize(nextDetails)
    } catch (error) {
      setErrorMessage(error?.message || 'La reprise n’a pas pu être finalisée.')
    } finally {
      setFinalizing(false)
    }
  }

  const title = `${request.marque || ''} ${request.modele || ''}`.trim()
  const offerStatusLabel = isFinalized ? 'Reprise finalisée' : isAccepted ? 'Accord client confirmé' : request.statut === 'offre_proposee' ? 'Offre en attente de réponse' : request.statut === 'refusee' ? 'Offre refusée' : 'Inspection en cours'
  const inspectionDate = inspection.inspectedAt ? new Date(inspection.inspectedAt) : new Date()
  const inspectionDateLabel = Number.isNaN(inspectionDate.getTime()) ? 'Non renseignée' : inspectionDate.toLocaleString('fr-FR')
  const checklistItems = CHECKLIST_GROUPS.flatMap(group => group.items)
  const checklistCounts = checklistItems.reduce((counts, [key]) => {
    const value = inspection.checklist?.[key] || 'non_verifie'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, { bon: 0, a_prevoir: 0, defaut: 0, non_verifie: 0 })

  return (
    <div className="trade-inspection-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
      <section className="trade-inspection-dialog" role="dialog" aria-modal="true" aria-labelledby="trade-inspection-title">
        <div className="trade-inspection-print">
          <div className="tip-print-top">
            <div className="tip-print-brand">
              <span className="tip-print-mark">NA</span>
              <span><strong>NABIL AUTO</strong><small>FICHE D’INSPECTION AUTOMOBILE</small></span>
            </div>
            <div className="tip-print-reference">
              <strong>DOSSIER #{request.id}</strong>
              <span>Établie le {inspectionDateLabel}</span>
            </div>
          </div>
          <div className="tip-print-title">
            <h1>Fiche d’inspection automobile</h1>
            <p>État visuel et fonctionnel constaté lors de la visite du véhicule</p>
          </div>
          <div className="tip-print-meta">
            <div><small>CLIENT</small><strong>{request.nom_client || 'Non renseigné'}</strong></div>
            <div><small>TÉLÉPHONE</small><strong>{request.telephone || 'Non renseigné'}</strong></div>
            <div><small>VÉHICULE</small><strong>{title || 'Non renseigné'}</strong></div>
            <div><small>ANNÉE</small><strong>{stock.year || request.annee || '—'}</strong></div>
            <div><small>KILOMÉTRAGE</small><strong>{stock.km || request.km ? Number(stock.km || request.km).toLocaleString('fr-FR') + ' km' : '—'}</strong></div>
            <div><small>IMMATRICULATION</small><strong>{inspection.immatriculation || '—'}</strong></div>
            <div><small>N° DE CHÂSSIS (VIN)</small><strong>{inspection.vin || '—'}</strong></div>
            <div><small>COULEUR</small><strong>{inspection.couleur || '—'}</strong></div>
            <div><small>INSPECTEUR</small><strong>{inspection.inspecteur || '—'}</strong></div>
          </div>
          <div className="tip-print-summary">
            <span><b>{checklistCounts.bon}</b> Bon</span>
            <span><b>{checklistCounts.a_prevoir}</b> À prévoir</span>
            <span><b>{checklistCounts.defaut}</b> Défaut</span>
            <span><b>{checklistCounts.non_verifie}</b> Non vérifié</span>
          </div>
          <div className="tip-print-checks">
            {CHECKLIST_GROUPS.map(group => (
              <section className="tip-print-group" key={group.key}>
                <h2>{group.label}</h2>
                <table className="tip-print-table"><tbody>
                  {group.items.map(([key, label]) => {
                    const value = inspection.checklist?.[key] || 'non_verifie'
                    return <tr key={key}><td>{label}</td><td><span className={'tip-print-state tip-state-' + value}>{CHECKLIST_STATUS_LABELS[value] || 'Non vérifié'}</span></td></tr>
                  })}
                </tbody></table>
              </section>
            ))}
          </div>
          <section className="tip-print-general">
            <h2>Évaluation générale</h2>
            <table className="tip-print-table"><tbody>
              {INSPECTION_FIELDS.map(([key, label]) => <tr key={key}><td>{label}</td><td>{GENERAL_STATUS_LABELS[inspection[key]] || 'À vérifier'}</td></tr>)}
              <tr><td>Papiers / documents</td><td>{GENERAL_STATUS_LABELS[inspection.documents] || 'À vérifier'}</td></tr>
              <tr><td>Essai routier</td><td>{GENERAL_STATUS_LABELS[inspection.essai] || 'Non effectué'}</td></tr>
            </tbody></table>
          </section>
          <section className="tip-print-notes-section">
            <h2>Observations et défauts constatés</h2>
            <div className="tip-print-notes">{inspection.notes || 'Aucune observation complémentaire renseignée.'}</div>
          </section>
          {inspection.photos.length > 0 && (
            <section className="tip-print-photo-section">
              <h2>Photographies du véhicule</h2>
              <div className="tip-print-photos">
                {inspection.photos.map((photo, index) => <figure key={photo.path || photo.url || index}><img src={photo.url} alt={photo.name || 'Photo ' + (index + 1)} /><figcaption>{photo.name || 'Photo ' + (index + 1)}</figcaption></figure>)}
              </div>
            </section>
          )}
          <div className="tip-print-signatures">
            <div><strong>Signature de l’inspecteur</strong><span /></div>
            <div><strong>Signature du propriétaire</strong><span /></div>
          </div>
          <p className="tip-print-disclaimer">Document de constat établi par Nabil Auto. Cette fiche décrit les éléments contrôlés lors de la visite ; elle ne constitue pas un contrôle technique réglementaire ni une garantie mécanique.</p>
        </div>
        <header className="trade-inspection-header">
          <div>
            <span className="adm-eyebrow">GESTION DES REPRISES · DOSSIER #{request.id}</span>
            <h2 id="trade-inspection-title">🔎 Inspection & finalisation</h2>
            <p>{title}{request.annee ? ` · ${request.annee}` : ''}{request.km ? ` · ${Number(request.km).toLocaleString('fr-FR')} km` : ''}</p>
          </div>
          <div className="trade-inspection-header-actions">
            <button type="button" className="act-btn" onClick={() => window.print()}>🖨 Imprimer la fiche</button>
            <button type="button" className="trade-inspection-close" onClick={onClose} aria-label="Fermer">✕</button>
          </div>
        </header>

        <div className="trade-inspection-body">
          <div className="trade-inspection-client">
            <span>👤 <strong>{request.nom_client || 'Client'}</strong></span>
            <span>📞 {request.telephone || 'Téléphone non renseigné'}</span>
            {details.targetVehicle?.label && <span>🚘 Échange contre : <strong>{details.targetVehicle.label}</strong></span>}
            <span className="trade-inspection-status">{offerStatusLabel}</span>
          </div>

          <section className="trade-inspection-section">
            <h3>1. Identification du véhicule</h3>
            <p>Complète ces informations pour retrouver et identifier précisément le véhicule sur la fiche imprimée.</p>
            <div className="trade-inspection-grid">
              <div className="form-field"><label htmlFor="inspection-registration">Immatriculation</label><input id="inspection-registration" value={inspection.immatriculation} onChange={event => setInspectionField('immatriculation', event.target.value)} placeholder="Ex. 12345-123-16" disabled={isFinalized} /></div>
              <div className="form-field"><label htmlFor="inspection-vin">Numéro de châssis (VIN)</label><input id="inspection-vin" value={inspection.vin} onChange={event => setInspectionField('vin', event.target.value)} placeholder="Numéro de série du véhicule" disabled={isFinalized} /></div>
              <div className="form-field"><label htmlFor="inspection-color">Couleur</label><input id="inspection-color" value={inspection.couleur} onChange={event => setInspectionField('couleur', event.target.value)} placeholder="Ex. Gris métallisé" disabled={isFinalized} /></div>
              <div className="form-field"><label htmlFor="inspection-inspector">Inspecteur</label><input id="inspection-inspector" value={inspection.inspecteur} onChange={event => setInspectionField('inspecteur', event.target.value)} placeholder="Nom de la personne ayant effectué le contrôle" disabled={isFinalized} /></div>
            </div>
          </section>

          <section className="trade-inspection-section">
            <h3>2. Contrôle détaillé du véhicule</h3>
            <p>Pour chaque point, indique l’état constaté. « Non vérifié » signifie que le point n’a pas pu être contrôlé pendant la visite.</p>
            <div className="trade-inspection-checklist-summary">
              <span className="check-count good"><strong>{checklistCounts.bon}</strong> Bon</span>
              <span className="check-count planned"><strong>{checklistCounts.a_prevoir}</strong> À prévoir</span>
              <span className="check-count defect"><strong>{checklistCounts.defaut}</strong> Défaut</span>
              <span className="check-count unknown"><strong>{checklistCounts.non_verifie}</strong> Non vérifié</span>
            </div>
            <div className="trade-inspection-checklist">
              {CHECKLIST_GROUPS.map(group => (
                <div className="trade-inspection-check-group" key={group.key}>
                  <h4>{group.label}</h4>
                  <div className="trade-inspection-check-items">
                    {group.items.map(([key, label]) => (
                      <div className="trade-inspection-check-item" key={key}>
                        <label htmlFor={'inspection-check-' + key}>{label}</label>
                        <select id={'inspection-check-' + key} value={inspection.checklist?.[key] || 'non_verifie'} onChange={event => setChecklistField(key, event.target.value)} disabled={isFinalized}>
                          {CHECKLIST_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="trade-inspection-section">
            <h3>3. Évaluation générale du véhicule</h3>
            <p>Note l’état constaté pendant la visite. Ces informations restent dans l’espace administrateur.</p>
            <div className="trade-inspection-grid">
              {INSPECTION_FIELDS.map(([key, label]) => (
                <div className="form-field" key={key}>
                  <label htmlFor={`inspection-${key}`}>{label}</label>
                  <select id={`inspection-${key}`} value={inspection[key]} onChange={event => setInspectionField(key, event.target.value)} disabled={isFinalized}>
                    {CONDITION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              ))}
              <div className="form-field">
                <label htmlFor="inspection-documents">Papiers / documents</label>
                <select id="inspection-documents" value={inspection.documents} onChange={event => setInspectionField('documents', event.target.value)} disabled={isFinalized}>
                  {DOCUMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="inspection-road-test">Essai routier</label>
                <select id="inspection-road-test" value={inspection.essai} onChange={event => setInspectionField('essai', event.target.value)} disabled={isFinalized}>
                  {ROAD_TEST_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="form-field trade-inspection-wide">
                <label htmlFor="inspection-notes">Défauts constatés / remarques</label>
                <textarea id="inspection-notes" rows={3} value={inspection.notes} onChange={event => setInspectionField('notes', event.target.value)} placeholder="Ex. rayure aile droite, bruit au démarrage, entretien à vérifier…" disabled={isFinalized} />
              </div>
            </div>
            <div className="trade-inspection-photos">
              {inspection.photos.map((photo, index) => (
                <div className="trade-inspection-photo" key={photo.path || photo.url || index}>
                  <a href={photo.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir la photo ${index + 1}`}>
                    <img src={photo.url} alt={photo.name || `Photo d’inspection ${index + 1}`} />
                  </a>
                  {!isFinalized && <button type="button" onClick={() => removePhoto(photo)} aria-label="Supprimer la photo">✕</button>}
                </div>
              ))}
            </div>
            {!isFinalized && (
              <label className="trade-inspection-upload">
                {uploading ? '⏳ Import des photos…' : '＋ Ajouter des photos'}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || inspection.photos.length >= 6} onChange={uploadPhotos} />
              </label>
            )}
            <small className="trade-inspection-hint">6 photos maximum · JPG, PNG ou WebP · 8 Mo par photo. Les clichés sont conservés dans le dossier de reprise, pas publiés automatiquement.</small>
          </section>

          <section className="trade-inspection-section">
            <h3>4. Offre définitive au client</h3>
            <p>Inscris le montant négocié après inspection. La valeur annoncée au départ reste conservée dans l’historique.</p>
            <div className="trade-inspection-grid">
              <div className="form-field">
                <label htmlFor="trade-final-offer">Prix définitif de reprise (DA) *</label>
                <input id="trade-final-offer" type="number" min="1" step="1000" value={finalOffer.amount} onChange={event => setOfferField('amount', event.target.value)} disabled={isFinalized} placeholder="Ex. 2 500 000" />
              </div>
              <div className="form-field">
                <label htmlFor="trade-final-note">Conditions de l’accord</label>
                <input id="trade-final-note" value={finalOffer.note} onChange={event => setOfferField('note', event.target.value)} disabled={isFinalized} placeholder="Ex. sous réserve des documents" />
              </div>
            </div>
            {estimatedExchangeBalance !== null && (
              <div className="trade-inspection-balance">
                <span>⚖️</span>
                <span>
                  Complément estimé pour le véhicule souhaité : <strong>{fmt(Math.abs(estimatedExchangeBalance))}</strong>
                  {estimatedExchangeBalance > 0 ? ' à régler par le client' : estimatedExchangeBalance < 0 ? ' à verser au client' : ' — valeurs équivalentes'}.
                  Ce calcul ne remplace pas la vente du véhicule du stock.
                </span>
              </div>
            )}
          </section>

          <section className="trade-inspection-section">
            <h3>5. Préparer l’entrée au stock</h3>
            <p>Après accord du client, la voiture sera créée comme véhicule d’occasion et restera masquée du site jusqu’à sa publication manuelle.</p>
            <div className="trade-inspection-grid">
              <div className="form-field">
                <label htmlFor="trade-stock-year">Année *</label>
                <input id="trade-stock-year" type="number" min="1950" max={new Date().getFullYear() + 1} value={stock.year} onChange={event => setStockField('year', event.target.value)} disabled={isFinalized} />
              </div>
              <div className="form-field">
                <label htmlFor="trade-stock-km">Kilométrage (km)</label>
                <input id="trade-stock-km" type="number" min="0" value={stock.km} onChange={event => setStockField('km', event.target.value)} disabled={isFinalized} />
              </div>
              <div className="form-field">
                <label htmlFor="trade-stock-price">Prix souhaité au catalogue (DA) *</label>
                <input id="trade-stock-price" type="number" min="1" step="10000" value={stock.stockSalePrice} onChange={event => setStockField('stockSalePrice', event.target.value)} disabled={isFinalized} placeholder="Ex. 3 200 000" />
              </div>
              <div className="form-field">
                <label htmlFor="trade-stock-transmission">Boîte de vitesses</label>
                <select id="trade-stock-transmission" value={stock.transmission} onChange={event => setStockField('transmission', event.target.value)} disabled={isFinalized}>
                  {TRANSMISSIONS.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="trade-stock-fuel">Carburant</label>
                <select id="trade-stock-fuel" value={stock.carburant} onChange={event => setStockField('carburant', event.target.value)} disabled={isFinalized}>
                  {FUELS.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="trade-stock-body">Carrosserie</label>
                <select id="trade-stock-body" value={stock.carrosserie} onChange={event => setStockField('carrosserie', event.target.value)} disabled={isFinalized}>
                  {BODY_TYPES.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              {[
                ['transportCost', 'Transport (DA)'],
                ['preparationCost', 'Préparation / réparations (DA)'],
                ['otherCosts', 'Autres frais (DA)'],
              ].map(([key, label]) => (
                <div className="form-field" key={key}>
                  <label htmlFor={`trade-stock-${key}`}>{label}</label>
                  <input id={`trade-stock-${key}`} type="number" min="0" step="1000" value={stock[key]} onChange={event => setStockField(key, event.target.value)} disabled={isFinalized} />
                </div>
              ))}
            </div>
            <div className="trade-inspection-balance">
              <span>🔒</span>
              <span>Coût total prévu : <strong>{fmt(Number(finalOffer.amount || 0) + Number(stock.transportCost || 0) + Number(stock.preparationCost || 0) + Number(stock.otherCosts || 0))}</strong>. Le véhicule créé ne sera pas visible par les visiteurs avant activation dans l’inventaire.</span>
            </div>
          </section>

          {details.finalization?.vehicleId && (
            <div className="trade-inspection-balance">
              <span>✅</span>
              <span>Cette reprise a déjà créé le véhicule <strong>{details.finalization.vehicleLabel || title}</strong> (référence #{details.finalization.vehicleId}). La fiche est dans Véhicules d’occasion et reste masquée du public.</span>
            </div>
          )}

          {errorMessage && <div className="finance-error" role="alert"><strong>Vérifie les informations</strong><span>{errorMessage}</span></div>}
        </div>

        <footer className="trade-inspection-footer">
          <span className="trade-inspection-footer-note">Les données d’inspection sont internes. Rien n’est publié sans activation manuelle du véhicule.</span>
          <div className="trade-inspection-footer-actions">
            {!isFinalized && (
              <>
                <button type="button" className="act-btn" onClick={() => persist('inspection')} disabled={saving || uploading || finalizing}>{saving ? '⏳…' : '💾 Enregistrer inspection'}</button>
                <button type="button" className="act-btn" onClick={() => persist('offre_proposee', 'pending')} disabled={saving || uploading || finalizing}>💬 Proposer l’offre</button>
                <button type="button" className="act-btn" onClick={() => persist('acceptee', 'accepted')} disabled={saving || uploading || finalizing}>🤝 Le client accepte</button>
                <button type="button" className="act-btn danger" onClick={() => persist('refusee', 'rejected')} disabled={saving || uploading || finalizing}>↩️ Refusée</button>
                {isAccepted && <button type="button" className="btn-save" onClick={finalize} disabled={saving || uploading || finalizing}>{finalizing ? '⏳ Création…' : '✅ Finaliser & ajouter au stock'}</button>}
              </>
            )}
            <button type="button" className="act-btn" onClick={onClose} disabled={saving || uploading || finalizing}>Fermer</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
