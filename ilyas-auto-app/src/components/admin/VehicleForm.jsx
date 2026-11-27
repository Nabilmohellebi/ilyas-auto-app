import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { BRANDS, TRANSMISSIONS, FUELS, BODY_TYPES, BADGES, STATUTS, ORIGINS } from '../../data/vehicles-data'
import ImageCropper from './ImageCropper'
import PlateBrandingEditor from './PlateBrandingEditor'
import { getSettings, parseBrandIdentity, DEFAULT_BRAND_IDENTITY } from '../../utils/useSettings'
import { mergeTechnicalSpecs, parseEquipmentLines, parseTechnicalSpecLines, sortEquipment, sortTechnicalSpecs } from '../../utils/vehicleSpecifications'

export default function VehicleForm({ vehicle, onClose, onSave }) {
  const isEdit = !!vehicle && !vehicle.__new
  const [form, setForm] = useState({
    marque:        vehicle?.marque || '',
    modele:        vehicle?.modele || '',
    annee:         vehicle?.annee || new Date().getFullYear(),
    prix:          vehicle?.prix || '',
    prix_old:      vehicle?.prix_old || '',
    km:            vehicle?.km ?? '',
    etat_vehicule: vehicle?.etat_vehicule || 'neuf',
    transmission:  vehicle?.transmission || 'Automatique',
    carburant:     vehicle?.carburant || 'Diesel',
    carrosserie:   vehicle?.carrosserie || 'Berline',
    provenance:    vehicle?.provenance || 'france',
    badge:         vehicle?.badge || '',
    statut:        vehicle?.statut || 'disponible',
    financing_enabled: vehicle?.financing_enabled !== false,
    description:   vehicle?.description || '',
    specs:         sortEquipment(vehicle?.specs ? (typeof vehicle.specs === 'string' ? JSON.parse(vehicle.specs) : vehicle.specs) : []),
    technical_specs: (() => { try { const value = typeof vehicle?.technical_specs === 'string' ? JSON.parse(vehicle.technical_specs) : vehicle?.technical_specs; return sortTechnicalSpecs(Array.isArray(value) ? value : []) } catch { return [] } })(),
    images:        vehicle?.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : [],
    images_gallery: vehicle?.images_gallery ? (typeof vehicle.images_gallery === 'string' ? JSON.parse(vehicle.images_gallery) : vehicle.images_gallery) : [],
    video_url:     vehicle?.video_url || '',
    img:           vehicle?.img || '',
    display_order: vehicle?.display_order || 99,
  })
  const [bulkSpecsText, setBulkSpecsText] = useState('')
  const [bulkTechnicalText, setBulkTechnicalText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [cropQueue, setCropQueue] = useState([])
  const [brandingTask, setBrandingTask] = useState(null)
  const [shopName, setShopName] = useState('Nabil Auto')
  const [brandIdentity, setBrandIdentity] = useState(DEFAULT_BRAND_IDENTITY)

  useEffect(() => {
    let active = true
    getSettings().then(settings => {
      if (!active) return
      setShopName(String(settings.shop_name || 'Nabil Auto').trim() || 'Nabil Auto')
      setBrandIdentity(parseBrandIdentity(settings.brand_identity))
    }).catch(error => console.warn('Paramètres de marque indisponibles :', error))
    return () => { active = false }
  }, [])
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadFile(file) {
    const allowedTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
    if (!allowedTypes[file.type]) {
      alert('Format non accepté. Utilise JPG, PNG, WebP ou GIF.')
      return null
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('La photo dépasse la limite de 15 Mo.')
      return null
    }

    setUploading(true)
    const isGif = file.type === 'image/gif'
    let fileToUpload = file
    let ext = allowedTypes[file.type]

    if (!isGif && file.size > 350 * 1024) {
      try {
        fileToUpload = await new Promise(resolve => {
          const img = new Image()
          const objUrl = URL.createObjectURL(file)
          img.onload = () => {
            const MAX = 1400
            let { width, height } = img
            if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            canvas.getContext('2d').drawImage(img, 0, 0, width, height)
            canvas.toBlob(blob => {
              URL.revokeObjectURL(objUrl)
              resolve(blob && blob.size < file.size ? blob : file)
            }, 'image/jpeg', 0.85)
          }
          img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file) }
          img.src = objUrl
        })
        ext = 'jpg'
      } catch { fileToUpload = file }
    }

    const uniqueId = globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(36).slice(2))
    const path = `vehicles/${uniqueId}.${ext}`
    const opts = isGif ? { contentType: 'image/gif', upsert: true } : { upsert: true }
    const { error } = await supabase.storage.from('vehicle-images').upload(path, fileToUpload, opts)
    setUploading(false)

    if (error) { alert('Erreur upload : ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('vehicle-images').getPublicUrl(path)
    return publicUrl
  }

  async function queueVehicleImages(files, target) {
    const incoming = Array.from(files || [])
    const supported = incoming.filter(file => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))
    if (supported.length !== incoming.length) {
      alert('Certains fichiers ne sont pas acceptés. Utilise JPG, PNG, WebP ou GIF.')
    }

    // Keep animated GIFs intact; all still photos open in the crop editor first.
    for (const gif of supported.filter(file => file.type === 'image/gif')) {
      const url = await uploadFile(gif)
      if (url && target === 'main') {
        setForm(current => ({ ...current, images: [...current.images, { url }], img: current.img || url }))
      } else if (url && target === 'gallery') {
        setForm(current => ({ ...current, images_gallery: [...current.images_gallery, { url }] }))
      }
    }

    const stillImages = supported.filter(file => file.type !== 'image/gif')
    if (stillImages.length) {
      const ratio = target === 'main' ? 4 / 3 : 16 / 9
      setCropQueue(current => [...current, ...stillImages.map(file => ({
        file,
        target,
        aspectRatio: ratio,
        title: target === 'main' ? 'Recadrer la photo du véhicule' : 'Recadrer la photo de galerie',
      }))])
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    queueVehicleImages(files, 'main')
  }

  function confirmVehicleCrop(croppedFile) {
    const task = cropQueue[0]
    if (!task) return
    setCropQueue(current => current.slice(1))
    setBrandingTask({ file: croppedFile, target: task.target })
  }

  async function saveBrandedPhoto({ originalFile, brandedFile, plateRect }) {
    const task = brandingTask
    if (!task) return
    setUploading(true)
    try {
      const originalUrl = await uploadFile(originalFile)
      if (!originalUrl) throw new Error('La photo originale n’a pas pu être enregistrée.')
      const url = await uploadFile(brandedFile)
      if (!url) throw new Error('La photo personnalisée n’a pas pu être enregistrée.')
      const photo = {
        url,
        originalUrl,
        plateRect,
        brandingName: shopName,
        brandingLogoUrl: brandIdentity.logoUrl || '',
        brandingAccentColor: brandIdentity.accentColor || '#d7b15f',
        brandingVersion: 1,
      }
      if (task.target === 'main') {
        setForm(current => ({ ...current, images: [...current.images, photo], img: current.img || url }))
      } else {
        setForm(current => ({ ...current, images_gallery: [...current.images_gallery, photo] }))
      }
      setBrandingTask(null)
    } finally {
      setUploading(false)
    }
  }

  async function skipPhotoBranding() {
    const task = brandingTask
    if (!task) return
    setUploading(true)
    try {
      const url = await uploadFile(task.file)
      if (!url) throw new Error('La photo n’a pas pu être enregistrée.')
      const photo = { url, originalUrl: url, brandingVersion: 0 }
      if (task.target === 'main') {
        setForm(current => ({ ...current, images: [...current.images, photo], img: current.img || url }))
      } else {
        setForm(current => ({ ...current, images_gallery: [...current.images_gallery, photo] }))
      }
      setBrandingTask(null)
    } finally {
      setUploading(false)
    }
  }

  function cancelPhotoBranding() {
    setBrandingTask(null)
    setCropQueue([])
  }

  function handleGalleryFileSelect(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    queueVehicleImages(files, 'gallery')
  }

  function cancelVehicleCropQueue() {
    setCropQueue([])
  }

  function moveImg(i, dir) {
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= form.images.length) return
    const arr = [...form.images]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    set('images', arr)
    if (i === 0 || j === 0) set('img', arr[0]?.url || '')
  }

  function removeImg(i) {
    const arr = form.images.filter((_, idx) => idx !== i)
    const removedUrl = form.images[i]?.url
    set('images', arr)
    if (form.img === removedUrl) set('img', arr[0]?.url || '')
  }

  // Gallery images use the same crop queue with a wide 16:9 frame.
  function moveGalleryImg(i, dir) {
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= form.images_gallery.length) return
    const arr = [...form.images_gallery]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    set('images_gallery', arr)
  }
  function removeGalleryImg(i) {
    set('images_gallery', form.images_gallery.filter((_, idx) => idx !== i))
  }

  function addBulkSpecs() {
    const incoming = parseEquipmentLines(bulkSpecsText)
    if (!incoming.length) return
    set('specs', sortEquipment([...form.specs, ...incoming]))
    setBulkSpecsText('')
  }
  function removeSpec(i) { set('specs', form.specs.filter((_, idx) => idx !== i)) }

  function addBulkTechnicalSpecs() {
    const incoming = parseTechnicalSpecLines(bulkTechnicalText)
    if (!incoming.length) return
    set('technical_specs', mergeTechnicalSpecs(form.technical_specs, incoming))
    setBulkTechnicalText('')
  }
  function updateTechnicalSpec(index, key, value) {
    const updated = form.technical_specs.map((item, i) => i === index ? { ...item, [key]: value } : item)
    set('technical_specs', updated)
  }
  function removeTechnicalSpec(index) {
    set('technical_specs', form.technical_specs.filter((_, i) => i !== index))
  }

  function handleSave() {
    const year = Number(form.annee)
    const price = Number(form.prix)
    const km = form.km === '' ? 0 : Number(form.km)
    const maxYear = new Date().getFullYear() + 1

    if (!form.marque.trim() || !form.modele.trim()) {
      setSaveError('Indique la marque et le modèle du véhicule.')
      return
    }
    if (!Number.isInteger(year) || year < 1950 || year > maxYear) {
      setSaveError(`L’année doit être comprise entre 1950 et ${maxYear}.`)
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setSaveError('Le prix de vente doit être supérieur à zéro.')
      return
    }
    if (!Number.isFinite(km) || km < 0) {
      setSaveError('Le kilométrage ne peut pas être négatif.')
      return
    }
    if (form.prix_old && (!Number.isFinite(Number(form.prix_old)) || Number(form.prix_old) < 0)) {
      setSaveError('L’ancien prix doit être un nombre positif.')
      return
    }
    if (uploading || brandingTask || cropQueue.length > 0) {
      setSaveError('Termine la personnalisation et le téléversement des photos avant d’enregistrer.')
      return
    }

    setSaveError('')
    onSave({
      ...(isEdit ? { id: vehicle.id } : {}),
      marque:        form.marque.trim(),
      modele:        form.modele.trim(),
      annee:         Number(form.annee) || new Date().getFullYear(),
      prix:          Number(form.prix),
      prix_old:      Number(form.prix_old) || null,
      km:            form.km !== '' ? Number(form.km) : 0,
      etat_vehicule: form.etat_vehicule,
      transmission:  form.transmission,
      carburant:     form.carburant,
      carrosserie:   form.carrosserie,
      provenance:    form.provenance,
      badge:         form.badge,
      statut:        form.statut,
      financing_enabled: Boolean(form.financing_enabled),
      description:   form.description,
      specs:         sortEquipment(form.specs),
      technical_specs: sortTechnicalSpecs(form.technical_specs),
      images:        form.images,
      images_gallery: form.images_gallery,
      video_url:     form.video_url || null,
      img:           form.img || form.images[0]?.url || null,
      display_order: Number(form.display_order) || 99,
    })
  }

  return (
    <div className="pf-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pf">
        <div className="pf-hdr">
          <h2>{isEdit ? '✏️ Modifier le véhicule' : '➕ Ajouter un véhicule'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="pf-body">
          {/* ── Identité véhicule ── */}
          <div className="pf-section">
            <h3>🚘 Informations générales</h3>
            <div className="pf-grid">
              <div className="form-field">
                <label>Marque *</label>
                <input list="brands-list" placeholder="Ex : Mercedes-Benz" value={form.marque} onChange={e => set('marque', e.target.value)} />
                <datalist id="brands-list">{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div className="form-field">
                <label>Modèle / Finition *</label>
                <input placeholder="Ex : Classe C 220d AMG Line" value={form.modele} onChange={e => set('modele', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Année *</label>
                <input type="number" min="1950" max={new Date().getFullYear() + 1} value={form.annee} onChange={e => set('annee', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Catégorie du véhicule *</label>
                <select value={form.etat_vehicule} onChange={e => set('etat_vehicule', e.target.value)}>
                  <option value="neuf">🚘 Véhicule neuf</option>
                  <option value="occasion">🔄 Véhicule d’occasion</option>
                </select>
              </div>
              <div className="form-field">
                <label>Kilométrage (km)</label>
                <input type="number" min="0" step="1000" placeholder="0 si neuf" value={form.km} onChange={e => set('km', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Boîte de vitesse</label>
                <select value={form.transmission} onChange={e => set('transmission', e.target.value)}>
                  {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Carburant</label>
                <select value={form.carburant} onChange={e => set('carburant', e.target.value)}>
                  {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Type de carrosserie</label>
                <select value={form.carrosserie} onChange={e => set('carrosserie', e.target.value)}>
                  {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Provenance</label>
                <select value={form.provenance} onChange={e => set('provenance', e.target.value)}>
                  {Object.entries(ORIGINS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Badge (optionnel)</label>
                <select value={form.badge} onChange={e => set('badge', e.target.value)}>
                  {BADGES.map(b => <option key={b} value={b}>{b || '— Aucun —'}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Prix ── */}
          <div className="pf-section">
            <h3>💰 Prix</h3>
            <div className="pf-grid">
              <div className="form-field">
                <label>Prix de vente (DA) *</label>
                <input type="number" min="0" step="10000" placeholder="4500000" value={form.prix} onChange={e => set('prix', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Ancien prix (DA) — optionnel</label>
                <input type="number" min="0" step="10000" placeholder="Pour afficher une réduction" value={form.prix_old} onChange={e => set('prix_old', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Options d'affichage de cette fiche ── */}
          <div className="pf-section">
            <h3>🧩 Options de la fiche véhicule</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.035)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.financing_enabled}
                onChange={e => set('financing_enabled', e.target.checked)}
                style={{ width: 19, height: 19, accentColor: '#c58b3d', flexShrink: 0 }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', color: 'white', fontSize: 13 }}>Afficher le simulateur de financement</strong>
                <small style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.52)', fontSize: 11, lineHeight: 1.5 }}>
                  {form.financing_enabled ? 'Le financement sera visible sur cette fiche uniquement.' : 'Le financement sera masqué sur cette fiche uniquement. Les autres véhicules ne changent pas.'}
                </small>
              </span>
              <span style={{ color: form.financing_enabled ? '#7ddc9b' : '#c5b9a9', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                {form.financing_enabled ? 'Activé' : 'Désactivé'}
              </span>
            </label>
          </div>

          {/* ── Statut ── */}
          <div className="pf-section">
            <h3>📍 Statut du véhicule</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUTS.map(s => (
                <div
                  key={s.key}
                  className="statut-pill"
                  onClick={() => set('statut', s.key)}
                  style={{
                    background: form.statut === s.key ? s.color + '22' : 'rgba(255,255,255,.04)',
                    borderColor: form.statut === s.key ? s.color : 'rgba(255,255,255,.1)',
                    color: form.statut === s.key ? s.color : 'rgba(255,255,255,.5)',
                  }}
                >{s.label}</div>
              ))}
            </div>
          </div>

          {/* ── Vidéo ── */}
          <div className="pf-section">
            <h3>🎬 Vidéo du véhicule (optionnel)</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 10, lineHeight: 1.5 }}>
              Colle un lien YouTube, TikTok ou Instagram. La vidéo s'affichera sur la fiche du véhicule.
            </p>
            <input
              placeholder="https://youtube.com/watch?v=... ou https://tiktok.com/..."
              value={form.video_url}
              onChange={e => set('video_url', e.target.value)}
              style={{ background: '#1b1b23', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '10px 13px', color: 'white', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            {form.video_url && (
              <div style={{ marginTop: 8, background: 'rgba(230,57,70,.08)', border: '1px solid rgba(230,57,70,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#ff5a63' }}>
                ✅ Lien vidéo enregistré
              </div>
            )}
          </div>

          {/* ── Notes du vendeur ── */}
          <div className="pf-section">
            <h3>📝 Notes du vendeur</h3>
            <div className="form-field">
              <textarea rows={5} placeholder="Présente le véhicule, ses points forts, son état, son historique et son entretien..." value={form.description} onChange={e => set('description', e.target.value)} />
              <small style={{ color: 'rgba(255,255,255,.52)', lineHeight: 1.5 }}>Ce texte apparaîtra dans la fiche du véhicule, sous les photos et les caractéristiques.</small>
            </div>
          </div>

          {/* ── Fonctionnalités supplémentaires ── */}
          <div className="pf-section">
            <h3>⚙️ Fonctionnalités supplémentaires</h3>
            <p style={{ color: 'rgba(255,255,255,.52)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>Ajoute les équipements présents sur ce véhicule : ABS, airbags, Bluetooth, caméra de recul, etc.</p>
            <div className="bulk-list-current">
              {sortEquipment(form.specs).map((s, i) => (
                <div key={s.toLocaleLowerCase('fr')} className="bulk-list-chip">
                  <span className="bulk-list-check" aria-hidden="true">✓</span>
                  <span>{s}</span>
                  <button type="button" onClick={() => removeSpec(i)} aria-label={`Retirer ${s}`}>✕</button>
                </div>
              ))}
              {form.specs.length === 0 && <small className="bulk-list-empty">Aucun équipement ajouté pour le moment.</small>}
            </div>
            <div className="bulk-entry-box">
              <label htmlFor="vehicle-bulk-equipment">Coller plusieurs équipements</label>
              <textarea
                id="vehicle-bulk-equipment"
                rows={5}
                value={bulkSpecsText}
                onChange={e => setBulkSpecsText(e.target.value)}
                placeholder={'ABS\nAirbags frontaux et latéraux\nCaméra de recul\nBluetooth\nToit ouvrant'}
              />
              <div className="bulk-entry-footer">
                <small>{parseEquipmentLines(bulkSpecsText).length} équipement(s) détecté(s) · un par ligne</small>
                <button type="button" className="act-btn" onClick={addBulkSpecs} disabled={!parseEquipmentLines(bulkSpecsText).length}>Ajouter la liste</button>
              </div>
            </div>
          </div>

          {/* ── Caractéristiques techniques détaillées ── */}
          <div className="pf-section">
            <h3>📊 Caractéristiques techniques</h3>
            <p style={{ color: 'rgba(255,255,255,.52)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>Ajoute uniquement les informations connues. Chaque ligne s’affichera dans un tableau sous les photos (ex. moteur, puissance, couple, dimensions, autonomie...).</p>
            {form.technical_specs.map((item, i) => (
              <div key={item.label.toLocaleLowerCase('fr')} className="bulk-tech-row">
                <input aria-label={`Nom de la caractéristique ${i + 1}`} value={item.label || ''} onChange={e => updateTechnicalSpec(i, 'label', e.target.value)} placeholder="Caractéristique" />
                <input aria-label={`Valeur de la caractéristique ${i + 1}`} value={item.value || ''} onChange={e => updateTechnicalSpec(i, 'value', e.target.value)} placeholder="Valeur" />
                <button type="button" onClick={() => removeTechnicalSpec(i)} aria-label="Supprimer cette caractéristique">✕</button>
              </div>
            ))}
            {form.technical_specs.length === 0 && <small className="bulk-list-empty">Aucune caractéristique technique ajoutée pour le moment.</small>}
            <datalist id="vehicle-technical-labels">
              {['Moteur', 'Puissance maximale', 'Couple maximal (Nm)', 'Vitesse maximale (km/h)', 'Transmission', 'Type de traction', 'Batterie', 'Autonomie (km)', 'Dimensions (mm)', 'Empattement (mm)', 'Nombre de portes', 'Nombre de places', 'Poids (kg)', 'Consommation (L/100 km)'].map(label => <option key={label} value={label} />)}
            </datalist>
            <div className="bulk-entry-box">
              <label htmlFor="vehicle-bulk-technical">Coller toutes les caractéristiques techniques</label>
              <textarea
                id="vehicle-bulk-technical"
                rows={6}
                value={bulkTechnicalText}
                onChange={e => setBulkTechnicalText(e.target.value)}
                placeholder={'Moteur : 1.5 Turbo\nPuissance : 150 ch\nCouple : 250 Nm\nTransmission : Automatique\nCarburant : Essence\nConsommation : 6,5 L/100 km'}
              />
              <div className="bulk-entry-footer">
                <small>{parseTechnicalSpecLines(bulkTechnicalText).length} caractéristique(s) détectée(s) · format « Nom : Valeur »</small>
                <button type="button" className="act-btn" onClick={addBulkTechnicalSpecs} disabled={!parseTechnicalSpecLines(bulkTechnicalText).length}>Ajouter la liste</button>
              </div>
            </div>
          </div>

          {/* ── Photos carrousel ── */}
          <div className="pf-section">
            <h3>📸 Photos du véhicule</h3>
            <p style={{ color: 'rgba(255,255,255,.58)', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              Après le recadrage, le site recherche la plaque et propose d’y placer le logo ou le nom actuel du showroom. Vérifie la position avant validation : tu peux déplacer et redimensionner le marquage. La photo originale est conservée pour permettre de changer l’identité plus tard.
            </p>
            <label className="upload-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                queueVehicleImages(e.dataTransfer.files, 'main')
              }}
            >
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} />
              <div style={{ fontSize: 26, marginBottom: 4 }}>🚗</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
                {uploading ? '⏳ Upload en cours...' : 'Cliquer ou glisser des photos ici'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>JPG, PNG, WebP, GIF — compression automatique</div>
            </label>
            <small style={{ display: 'block', color: 'rgba(255,255,255,.34)', fontSize: 10, marginTop: 2 }}>Les photos fixes JPG, PNG et WebP sont personnalisées. Les GIF animés sont conservés sans modification.</small>

            {form.images.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {form.images.map((img, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: form.img === img.url ? 'rgba(230,57,70,.06)' : '#1b1b23', border: `1px solid ${form.img === img.url ? 'rgba(230,57,70,.35)' : 'rgba(255,255,255,.08)'}`, borderRadius: 10, padding: '7px 10px' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#e63946', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                    {img.url && <img src={img.url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {form.img === img.url && <span style={{ color: '#ff5a63', fontWeight: 800 }}>⭐ Principale · </span>}
                      {img.url?.split('/').pop()?.slice(-20)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => moveImg(i, 'up')} disabled={i === 0} style={{ background: i > 0 ? 'rgba(255,255,255,.1)' : 'transparent', border: 'none', borderRadius: 4, width: 22, height: 18, color: i > 0 ? 'white' : 'rgba(255,255,255,.15)', cursor: i > 0 ? 'pointer' : 'default', fontSize: 9 }}>▲</button>
                      <button onClick={() => moveImg(i, 'down')} disabled={i === form.images.length - 1} style={{ background: i < form.images.length - 1 ? 'rgba(255,255,255,.1)' : 'transparent', border: 'none', borderRadius: 4, width: 22, height: 18, color: i < form.images.length - 1 ? 'white' : 'rgba(255,255,255,.15)', cursor: i < form.images.length - 1 ? 'pointer' : 'default', fontSize: 9 }}>▼</button>
                    </div>
                    <button onClick={() => set('img', img.url)} style={{ background: 'none', border: 'none', color: form.img === img.url ? '#ff5a63' : 'rgba(255,255,255,.2)', cursor: 'pointer', fontSize: 15 }}>★</button>
                    <button onClick={() => removeImg(i)} style={{ background: 'rgba(230,57,70,.12)', border: '1px solid rgba(230,57,70,.25)', borderRadius: 6, color: '#ffb3b8', cursor: 'pointer', fontSize: 11, padding: '3px 8px', fontWeight: 800 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {form.images.length === 0 && <div style={{ textAlign: 'center', padding: 12, color: 'rgba(255,255,255,.2)', fontSize: 12 }}>Aucune photo — ajoutez-en ci-dessus</div>}
          </div>

          {/* ── Galerie grand format (2e catégorie) ── */}
          <div className="pf-section">
            <h3>📜 Galerie grand format</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 10, lineHeight: 1.5 }}>
              Ces photos s'affichent en bas de la fiche véhicule, <strong>après la description</strong>, en grand format (une par ligne). Utile pour montrer plus de détails : intérieur, coffre, moteur...
            </p>
            <label className="upload-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                queueVehicleImages(e.dataTransfer.files, 'gallery')
              }}
            >
              <input type="file" accept="image/*" multiple onChange={handleGalleryFileSelect} />
              <div style={{ fontSize: 26, marginBottom: 4 }}>📸</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
                {uploading ? '⏳ Upload en cours...' : 'Cliquer ou glisser des photos ici'}
              </div>
            </label>

            {form.images_gallery.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {form.images_gallery.map((img, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#1b1b23', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '7px 10px' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#e63946', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                    {img.url && <img src={img.url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.url?.split('/').pop()?.slice(-20)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => moveGalleryImg(i, 'up')} disabled={i === 0} style={{ background: i > 0 ? 'rgba(255,255,255,.1)' : 'transparent', border: 'none', borderRadius: 4, width: 22, height: 18, color: i > 0 ? 'white' : 'rgba(255,255,255,.15)', cursor: i > 0 ? 'pointer' : 'default', fontSize: 9 }}>▲</button>
                      <button onClick={() => moveGalleryImg(i, 'down')} disabled={i === form.images_gallery.length - 1} style={{ background: i < form.images_gallery.length - 1 ? 'rgba(255,255,255,.1)' : 'transparent', border: 'none', borderRadius: 4, width: 22, height: 18, color: i < form.images_gallery.length - 1 ? 'white' : 'rgba(255,255,255,.15)', cursor: i < form.images_gallery.length - 1 ? 'pointer' : 'default', fontSize: 9 }}>▼</button>
                    </div>
                    <button onClick={() => removeGalleryImg(i)} style={{ background: 'rgba(230,57,70,.12)', border: '1px solid rgba(230,57,70,.25)', borderRadius: 6, color: '#ffb3b8', cursor: 'pointer', fontSize: 11, padding: '3px 8px', fontWeight: 800 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {form.images_gallery.length === 0 && <div style={{ textAlign: 'center', padding: 12, color: 'rgba(255,255,255,.2)', fontSize: 12 }}>Aucune photo galerie</div>}
          </div>

          {/* ── Ordre affichage ── */}
          <div className="pf-section">
            <h3>🔢 Ordre d'affichage</h3>
            <div className="form-field" style={{ maxWidth: 200 }}>
              <label>Position (1 = en premier)</label>
              <input type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="pf-footer">
          {saveError && <div role="alert" style={{ flex: '1 1 100%', color: '#ffb3b8', fontSize: 12, lineHeight: 1.5 }}>{saveError}</div>}
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={handleSave} disabled={uploading || cropQueue.length > 0 || Boolean(brandingTask) || !form.marque.trim() || !form.modele.trim() || !form.prix}>
            {uploading || brandingTask ? '⏳ Photos en cours…' : isEdit ? '💾 Enregistrer' : '➕ Ajouter au stock'}
          </button>
        </div>
      </div>
      {!brandingTask && cropQueue[0] && (
        <ImageCropper
          key={cropQueue[0].target + '-' + cropQueue[0].file.name + '-' + cropQueue.length}
          file={cropQueue[0].file}
          title={cropQueue[0].title}
          aspectRatio={cropQueue[0].aspectRatio}
          outputFormat="image/jpeg"
          onCancel={cancelVehicleCropQueue}
          onConfirm={confirmVehicleCrop}
        />
      )}
      {brandingTask && (
        <PlateBrandingEditor
          file={brandingTask.file}
          shopName={shopName}
          logoUrl={brandIdentity.logoUrl}
          accentColor={brandIdentity.accentColor}
          onConfirm={saveBrandedPhoto}
          onSkip={skipPhotoBranding}
          onCancel={cancelPhotoBranding}
        />
      )}
    </div>
  )
}
