import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { fmt } from '../../utils/notify'

const EMPTY_FORM = {
  vehicle_id: '',
  vehicle_label: '',
  purchase_price: '0',
  transport_cost: '0',
  preparation_cost: '0',
  other_costs: '0',
  sale_price: '',
  purchase_date: '',
  sale_date: '',
  notes: '',
}

function num(value) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : 0
}

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

function downloadCsv(rows) {
  if (!rows.length) return
  const headers = [
    'Véhicule', 'Date achat', 'Prix achat DA', 'Transport DA',
    'Préparation DA', 'Autres frais DA', 'Coût total DA',
    'Prix vente DA', 'Date vente', 'Bénéfice réalisé DA', 'Notes',
  ]
  const body = rows.map(row => {
    const cost = num(row.purchase_price) + num(row.transport_cost) + num(row.preparation_cost) + num(row.other_costs)
    const sold = row.sale_price !== null && row.sale_price !== '' ? num(row.sale_price) : null
    return [
      row.vehicle_label, row.purchase_date, row.purchase_price, row.transport_cost,
      row.preparation_cost, row.other_costs, cost, sold ?? '', row.sale_date,
      sold === null ? '' : sold - cost, row.notes,
    ]
  })
  const csv = '\uFEFF' + [headers, ...body].map(line => line.map(csvCell).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'hbr-auto-finances-' + new Date().toISOString().slice(0, 10) + '.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function FinancePanel({ vehicles = [], onToast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('vehicle_finances')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      setLoadError(error.message)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalCost = row => num(row.purchase_price) + num(row.transport_cost) + num(row.preparation_cost) + num(row.other_costs)
  const soldRows = rows.filter(row => row.sale_price !== null && row.sale_price !== '')
  const invested = rows.reduce((sum, row) => sum + totalCost(row), 0)
  const revenue = soldRows.reduce((sum, row) => sum + num(row.sale_price), 0)
  const realizedProfit = soldRows.reduce((sum, row) => sum + num(row.sale_price) - totalCost(row), 0)
  const localNow = new Date()
  const currentMonth = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}`
  const monthSales = soldRows.filter(row => row.sale_date?.slice(0, 7) === currentMonth)
  const monthProfit = monthSales.reduce((sum, row) => sum + num(row.sale_price) - totalCost(row), 0)

  // Les véhicules masqués ou déjà vendus restent sélectionnables pour saisir leur comptabilité.\n  const availableVehicles = vehicles

  const filteredRows = rows.filter(row => {
    const sold = row.sale_price !== null && row.sale_price !== ''
    if (filter === 'in_stock' && sold) return false
    if (filter === 'sold' && !sold) return false
    const query = search.trim().toLowerCase()
    return !query || [row.vehicle_label, row.notes].join(' ').toLowerCase().includes(query)
  })

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function editRow(row) {
    setEditingId(row.id)
    setForm({
      vehicle_id: row.vehicle_id == null ? '' : String(row.vehicle_id),
      vehicle_label: row.vehicle_label || '',
      purchase_price: String(row.purchase_price ?? 0),
      transport_cost: String(row.transport_cost ?? 0),
      preparation_cost: String(row.preparation_cost ?? 0),
      other_costs: String(row.other_costs ?? 0),
      sale_price: row.sale_price == null ? '' : String(row.sale_price),
      purchase_date: row.purchase_date || '',
      sale_date: row.sale_date || '',
      notes: row.notes || '',
    })
    document.getElementById('hbr-finance-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function setField(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function selectVehicle(value) {
    const vehicle = vehicles.find(item => String(item.id) === String(value))
    setForm(current => ({
      ...current,
      vehicle_id: value,
      vehicle_label: vehicle ? `${vehicle.marque} ${vehicle.modele} (${vehicle.annee})` : current.vehicle_label,
    }))
  }

  async function save() {
    if (!form.vehicle_id) {
      onToast?.('Choisis un véhicule du stock.', 'error')
      return
    }
    const vehicle = vehicles.find(item => String(item.id) === String(form.vehicle_id))
    const salePrice = form.sale_price.trim() === '' ? null : Number(form.sale_price)
    const numericFields = ['purchase_price', 'transport_cost', 'preparation_cost', 'other_costs']
    if (numericFields.some(key => !Number.isFinite(Number(form[key])) || Number(form[key]) < 0)) {
      onToast?.('Les prix et frais doivent être des nombres positifs ou nuls.', 'error')
      return
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice <= 0)) {
      onToast?.('Le prix de vente doit être supérieur à zéro.', 'error')
      return
    }
    if (salePrice !== null && !form.sale_date) {
      onToast?.('Renseigne la date de vente pour enregistrer le bénéfice.', 'error')
      return
    }

    const record = {
      vehicle_id: Number(form.vehicle_id),
      vehicle_label: vehicle
        ? `${vehicle.marque} ${vehicle.modele} (${vehicle.annee})`
        : form.vehicle_label,
      purchase_price: Number(form.purchase_price),
      transport_cost: Number(form.transport_cost),
      preparation_cost: Number(form.preparation_cost),
      other_costs: Number(form.other_costs),
      sale_price: salePrice,
      purchase_date: form.purchase_date || null,
      sale_date: salePrice === null ? null : form.sale_date,
      notes: form.notes.trim(),
      updated_at: new Date().toISOString(),
    }

    setSaving(true)
    const { error } = await supabase
      .from('vehicle_finances')
      .upsert(record, { onConflict: 'vehicle_id' })
    setSaving(false)
    if (error) {
      onToast?.('Enregistrement impossible : ' + error.message, 'error')
      return
    }
    onToast?.('Données financières enregistrées.')
    resetForm()
    await load()
  }

  const previewCost = num(form.purchase_price) + num(form.transport_cost) + num(form.preparation_cost) + num(form.other_costs)
  const previewProfit = form.sale_price.trim() === '' ? null : Number(form.sale_price) - previewCost

  return (
    <section className="finance-root">
      <div className="finance-header">
        <div>
          <div className="adm-eyebrow">GESTION INTERNE · CONFIDENTIEL</div>
          <h2>Suivi financier des véhicules</h2>
          <p>Les coûts d’achat, frais et marges sont stockés séparément du catalogue public.</p>
        </div>
        <button className="act-btn" onClick={() => downloadCsv(filteredRows)} disabled={!filteredRows.length}>↓ Exporter les finances</button>
      </div>

      {loadError && (
        <div className="finance-error" role="alert">
          <strong>Accès aux données financières indisponible</strong>
          <span>{loadError}</span>
          <button className="act-btn" onClick={load}>Réessayer</button>
        </div>
      )}

      <div className="finance-stats">
        <div className="finance-stat"><span>Capital engagé enregistré</span><strong>{fmt(invested)}</strong><small>Achats + frais sur les véhicules suivis</small></div>
        <div className="finance-stat"><span>Chiffre d’affaires enregistré</span><strong>{fmt(revenue)}</strong><small>{soldRows.length} véhicule(s) avec prix de vente saisi</small></div>
        <div className="finance-stat"><span>Bénéfice réalisé</span><strong className={realizedProfit >= 0 ? 'positive' : 'negative'}>{fmt(realizedProfit)}</strong><small>Ventes enregistrées − coût total correspondant</small></div>
        <div className="finance-stat"><span>Bénéfice du mois</span><strong className={monthProfit >= 0 ? 'positive' : 'negative'}>{fmt(monthProfit)}</strong><small>{monthSales.length} vente(s) depuis le début du mois</small></div>
      </div>

      <div className="finance-explainer">
        <strong>Calcul utilisé</strong>
        <span>Coût total = prix d’achat + transport + préparation + autres frais.</span>
        <span>Bénéfice réalisé = prix de vente réel − coût total.</span>
        <small>Les champs non renseignés ne sont pas estimés. Le résultat dépend de la saisie comptable et n’inclut pas les impôts ou frais non enregistrés.</small>
      </div>

      <div className="finance-editor" id="hbr-finance-editor">
        <div className="finance-editor-heading">
          <div><span className="adm-eyebrow">FICHE COMPTABLE</span><h3>{editingId ? 'Modifier les coûts et la vente' : 'Enregistrer un véhicule'}</h3></div>
          {editingId && <button className="act-btn" onClick={resetForm}>Annuler</button>}
        </div>
        <div className="finance-form-grid">
          <div className="form-field finance-field-wide">
            <label>Véhicule du stock</label>
            <select value={form.vehicle_id} onChange={event => selectVehicle(event.target.value)}>
              <option value="">Sélectionner un véhicule…</option>
              {availableVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.marque} {vehicle.modele} ({vehicle.annee}) · {vehicle.etat_vehicule === 'occasion' ? 'Occasion' : 'Neuf'}</option>
              ))}
            </select>
          </div>
          {[
            ['purchase_price', 'Prix d’achat / reprise (DA)'],
            ['transport_cost', 'Transport (DA)'],
            ['preparation_cost', 'Préparation / réparations (DA)'],
            ['other_costs', 'Autres frais (DA)'],
          ].map(([key, label]) => (
            <div className="form-field" key={key}>
              <label>{label}</label>
              <input type="number" min="0" step="1000" inputMode="decimal" value={form[key]} onChange={event => setField(key, event.target.value)} />
            </div>
          ))}
          <div className="form-field">
            <label>Date d’achat / reprise</label>
            <input type="date" value={form.purchase_date} onChange={event => setField('purchase_date', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Prix de vente réel (DA)</label>
            <input type="number" min="0" step="1000" inputMode="decimal" placeholder="Laisser vide tant que non vendu" value={form.sale_price} onChange={event => setField('sale_price', event.target.value)} />
          </div>
          <div className="form-field">
            <label>Date de vente</label>
            <input type="date" value={form.sale_date} onChange={event => setField('sale_date', event.target.value)} disabled={!form.sale_price.trim()} />
          </div>
          <div className="form-field finance-field-wide">
            <label>Notes internes</label>
            <textarea rows={2} value={form.notes} onChange={event => setField('notes', event.target.value)} placeholder="Ex. frais de carte grise, pièces, négociation…" />
          </div>
        </div>
        <div className="finance-live-result">
          <div><span>Coût total enregistré</span><strong>{fmt(previewCost)}</strong></div>
          <div><span>{previewProfit === null ? 'Bénéfice (après prix de vente)' : 'Bénéfice réalisé estimé'}</span><strong className={previewProfit === null ? '' : previewProfit >= 0 ? 'positive' : 'negative'}>{previewProfit === null || !Number.isFinite(previewProfit) ? 'En attente de vente' : fmt(previewProfit)}</strong></div>
        </div>
        <button className="btn-save" onClick={save} disabled={saving || loading || !form.vehicle_id}>{saving ? '⏳ Enregistrement…' : '💾 Enregistrer la fiche financière'}</button>
      </div>

      <div className="finance-list-heading">
        <div><span className="adm-eyebrow">REGISTRE</span><h3>Coûts et ventes par véhicule</h3></div>
        <input className="adm-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un véhicule…" />
      </div>
      <div className="crm-toolbar">
        {[
          ['all', 'Tous'],
          ['in_stock', 'En stock'],
          ['sold', 'Vendus'],
        ].map(([key, label]) => (
          <button key={key} className={`filter-btn ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {loading ? (
        <div className="spinner">Chargement des fiches financières…</div>
      ) : filteredRows.length === 0 ? (
        <div className="crm-empty"><div>📒</div><strong>Aucune fiche financière enregistrée</strong><p>Choisis un véhicule ci-dessus pour saisir son prix d’achat et ses frais. Les bénéfices apparaîtront après la saisie de son prix de vente réel.</p></div>
      ) : (
        <div className="finance-records">
          {filteredRows.map(row => {
            const cost = totalCost(row)
            const hasSale = row.sale_price !== null && row.sale_price !== ''
            const profit = hasSale ? num(row.sale_price) - cost : null
            return (
              <article className="finance-record" key={row.id}>
                <div className="finance-record-main">
                  <div><strong>{row.vehicle_label || 'Véhicule non précisé'}</strong><small>{row.purchase_date ? 'Achat : ' + new Date(row.purchase_date + 'T00:00:00').toLocaleDateString('fr-FR') : 'Date d’achat non renseignée'}{hasSale ? ' · Vente : ' + (row.sale_date ? new Date(row.sale_date + 'T00:00:00').toLocaleDateString('fr-FR') : 'date inconnue') : ' · Encore en stock'}</small></div>
                  <span className={`finance-status ${hasSale ? 'sold' : 'stock'}`}>{hasSale ? 'Vendu' : 'En stock'}</span>
                </div>
                <div className="finance-record-grid">
                  <div><span>Prix achat / reprise</span><strong>{fmt(row.purchase_price)}</strong></div>
                  <div><span>Frais totaux</span><strong>{fmt(num(row.transport_cost) + num(row.preparation_cost) + num(row.other_costs))}</strong></div>
                  <div><span>Coût total</span><strong>{fmt(cost)}</strong></div>
                  <div><span>Prix de vente</span><strong>{hasSale ? fmt(row.sale_price) : '—'}</strong></div>
                  <div><span>Bénéfice</span><strong className={profit === null ? '' : profit >= 0 ? 'positive' : 'negative'}>{profit === null ? 'En attente' : fmt(profit)}</strong></div>
                </div>
                {row.notes && <p className="finance-record-notes">{row.notes}</p>}
                <div className="finance-record-actions"><button className="act-btn" onClick={() => editRow(row)}>✏️ Modifier</button></div>
              </article>
            )
          })}
        </div>
      )}
      <p className="finance-footnote">Les chiffres sont calculés uniquement à partir des fiches saisies. Une voiture sans fiche comptable n’entre pas dans ces totaux. Les données financières ne sont jamais ajoutées au catalogue client.</p>
    </section>
  )
}
