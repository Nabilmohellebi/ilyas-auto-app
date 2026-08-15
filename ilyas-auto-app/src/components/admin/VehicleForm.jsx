import { useState, useRef } from 'react'
import { supabase } from '../../supabase'
import { BRANDS, TRANSMISSIONS, FUELS, BADGES, STATUTS, ORIGINS, flagURI } from '../../data/vehicles-data'

export default function VehicleForm({ vehicle, onClose, onSave }) {
  const isEdit = !!vehicle
  const [form, setForm] = useState({
    marque:        vehicle?.marque || '',
    modele:        vehicle?.modele || '',
    annee:         vehicle?.annee || new Date().getFullYear(),
    prix:          vehicle?.prix || '',
    prix_old:      vehicle?.prix_old || '',
    km:            vehicle?.km ?? '',
    transmission:  vehicle?.transmission || 'Automatique',
    carburant:     vehicle?.carburant || 'Diesel',
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
  const fileRef = useRef()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadFile(file) {
    setUploading(true)
    const isGif = file.type === 'image/gif' || (file.name || '').toLowerCase().endsWith('.gif')
    let fileToUpload = file
    let ext = (file.name || '').split('.').pop()?.toLowerCase() || 'jpg'

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

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const url = await uploadFile(file)
      if (url) {
        set('images', [...form.images, { url }])
        if (!form.img) set('img', url)
      }
    }
    e.target.value = ''
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

  // ── Galerie grand format (2e catégorie de photos) ──
  async function handleGalleryFileSelect(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const url = await uploadFile(file)
      if (url) set('images_gallery', [...form.images_gallery, { url }])
    }
    e.target.value = ''
  }
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
    if (!form.marque || !form.modele || !form.prix) return
    onSave({
      ...(isEdit ? { id: vehicle.id } : {}),
      marque:        form.marque.trim(),
      modele:        form.modele.trim(),
      annee:         Number(form.annee) || new Date().getFullYear(),
      prix:          Number(form.prix),
      prix_old:      Number(form.prix_old) || null,
      km:            form.km !== '' ? Number(form.km) : 0,
      transmission:  form.transmission,
      carburant:     form.carburant,
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
                <input type="number" min="1990" max="2027" value={form.annee} onChange={e => set('annee', e.target.value)} />
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

          {/* ── Photos ── */}
          <div className="pf-section">
            <h3>📸 Photos du véhicule</h3>
            <label className="upload-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) { set('images', [...form.images, { url }]); if (!form.img) set('img', url) }
                }
              }}
            >
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} />
              <div style={{ fontSize: 26, marginBottom: 4 }}>🚗</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
                {uploading ? '⏳ Upload en cours...' : 'Cliquer ou glisser des photos ici'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>JPG, PNG, WebP — compression automatique</div>
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
              onDrop={async e => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files)
                for (const f of files) {
                  const url = await uploadFile(f)
                  if (url) set('images_gallery', [...form.images_gallery, { url }])
                }
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
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={handleSave} disabled={!form.marque || !form.modele || !form.prix}>
            {isEdit ? '💾 Enregistrer' : '➕ Ajouter au stock'}
          </button>
        </div>
      </div>
    </div>
  )
}
