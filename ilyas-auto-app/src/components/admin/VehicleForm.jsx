import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import { BRANDS, TRANSMISSIONS, FUELS, BODY_TYPES, BADGES, STATUTS, ORIGINS } from '../../data/vehicles-data'
import ImageCropper from './ImageCropper'

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
    description:   vehicle?.description || '',
    specs:         vehicle?.specs ? (typeof vehicle.specs === 'string' ? JSON.parse(vehicle.specs) : vehicle.specs) : [],
    images:        vehicle?.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : [],
    images_gallery: vehicle?.images_gallery ? (typeof vehicle.images_gallery === 'string' ? JSON.parse(vehicle.images_gallery) : vehicle.images_gallery) : [],
    video_url:     vehicle?.video_url || '',
    img:           vehicle?.img || '',
    display_order: vehicle?.display_order || 99,
  })
  const [newSpec, setNewSpec] = useState('')
  const [uploading, setUploading] = useState(false)
  const [cropQueue, setCropQueue] = useState([])
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

    const path = `vehicles/${Date.now()}.${ext}`
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

  async function confirmVehicleCrop(croppedFile) {
    const task = cropQueue[0]
    if (!task) return
    try {
      const url = await uploadFile(croppedFile)
      if (url && task.target === 'main') {
        setForm(current => ({ ...current, images: [...current.images, { url }], img: current.img || url }))
      } else if (url && task.target === 'gallery') {
        setForm(current => ({ ...current, images_gallery: [...current.images_gallery, { url }] }))
      }
    } finally {
      setCropQueue(current => current.slice(1))
    }
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

  function addSpec() {
    if (!newSpec.trim()) return
    set('specs', [...form.specs, newSpec.trim()])
    setNewSpec('')
  }
  function removeSpec(i) { set('specs', form.specs.filter((_, idx) => idx !== i)) }

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
    if (uploading) {
      setSaveError('Attends la fin du téléversement des photos.')
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
      description:   form.description,
      specs:         form.specs,
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

          {/* ── Description ── */}
          <div className="pf-section">
            <h3>📝 Description</h3>
            <div className="form-field">
              <textarea rows={4} placeholder="Historique, état général, entretien..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>

          {/* ── Équipements ── */}
          <div className="pf-section">
            <h3>⚙️ Équipements & Options</h3>
            {form.specs.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '7px 10px' }}>
                <span style={{ flex: 1, fontSize: 13, color: 'white' }}>✓ {s}</span>
                <button onClick={() => removeSpec(i)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13 }}
                placeholder="Ex : Toit ouvrant, Caméra de recul..."
                value={newSpec}
                onChange={e => setNewSpec(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSpec()}
              />
              <button className="act-btn" onClick={addSpec}>+ Ajouter</button>
            </div>
          </div>

          {/* ── Photos carrousel ── */}
          <div className="pf-section">
            <h3>📸 Photos du véhicule</h3>
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
          <button className="btn-save" onClick={handleSave} disabled={uploading || cropQueue.length > 0 || !form.marque.trim() || !form.modele.trim() || !form.prix}>
            {uploading ? '⏳ Photos en cours…' : isEdit ? '💾 Enregistrer' : '➕ Ajouter au stock'}
          </button>
        </div>
      </div>
      {cropQueue[0] && (
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
    </div>
  )
}
