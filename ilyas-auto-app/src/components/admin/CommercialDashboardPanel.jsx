import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { saveSetting } from '../../utils/useSettings'
import { fmt } from '../../utils/notify'

const PERIODS = [
  ['month', 'Ce mois-ci'],
  ['quarter', 'Ce trimestre'],
  ['year', 'Cette année'],
  ['90d', '90 derniers jours'],
  ['all', 'Depuis le début'],
]

function amount(value) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : 0
}

function totalCost(row) {
  return amount(row.purchase_price) + amount(row.transport_cost) + amount(row.preparation_cost) + amount(row.other_costs)
}

function isSold(row) {
  return row.sale_price !== null && row.sale_price !== '' && Number.isFinite(Number(row.sale_price))
}

function localDate(value) {
  if (!value) return null
  const date = new Date(String(value).slice(0, 10) + 'T00:00:00')
  return Number.isNaN(date.getTime()) ? null : date
}

function monthKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}

function monthLabel(date) {
  return date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dateRange(period, now = new Date()) {
  if (period === 'all') return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start
  if (period === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1)
  else if (period === 'quarter') start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
  else if (period === 'year') start = new Date(today.getFullYear(), 0, 1)
  else start = addDays(today, -89)
  const end = addDays(today, 1)
  const duration = end.getTime() - start.getTime()
  return { start, end, previous: { start: new Date(start.getTime() - duration), end: start } }
}

function withinRange(row, range) {
  if (!range) return true
  const date = localDate(row.sale_date)
  return Boolean(date && date >= range.start && date < range.end)
}

function percentageChange(current, previous) {
  if (previous === 0) return current > 0 ? null : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

function signedPercent(value) {
  if (value === null) return 'Nouveau'
  const rounded = Math.round(value * 10) / 10
  return (rounded > 0 ? '+' : '') + rounded.toLocaleString('fr-FR') + ' %'
}

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

function downloadCsv(rows) {
  const header = ['Véhicule', 'Date de vente', 'Prix de vente (DA)', 'Coût total (DA)', 'Marge brute (DA)', 'Marge (%)']
  const lines = rows.map(row => {
    const cost = totalCost(row)
    const sale = amount(row.sale_price)
    const profit = sale - cost
    return [
      row.vehicle_label || '',
      row.sale_date || '',
      sale,
      cost,
      profit,
      sale > 0 ? (profit / sale) * 100 : 0,
    ].map(csvCell).join(';')
  })
  const csv = '\uFEFF' + [header.map(csvCell).join(';'), ...lines].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'nabil-auto-ventes-commerciales.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function CommercialDashboardPanel({
  vehicles = [],
  reservations = [],
  sellRequests = [],
  followUps = [],
  onToast,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [period, setPeriod] = useState('month')
  const [targetRevenue, setTargetRevenue] = useState('')
  const [targetUnits, setTargetUnits] = useState('')
  const [savingTargets, setSavingTargets] = useState(false)
  const [showTargets, setShowTargets] = useState(false)

  async function loadSales(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('vehicle_finances')
      .select('*')
      .order('sale_date', { ascending: false, nullsFirst: false })
    if (error) {
      setLoadError(error.message)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadSales()
    let active = true
    supabase.from('settings').select('value').eq('key', 'commercial_targets').maybeSingle().then(({ data, error }) => {
      if (!active || error) return
      let parsed = {}
      try { parsed = data?.value ? JSON.parse(data.value) : {} } catch {}
      setTargetRevenue(parsed.monthlyRevenue == null ? '' : String(parsed.monthlyRevenue))
      setTargetUnits(parsed.monthlyUnits == null ? '' : String(parsed.monthlyUnits))
    })
    return () => { active = false }
  }, [])

  const now = new Date()
  const range = useMemo(() => dateRange(period, now), [period])
  const allSales = useMemo(() => rows.filter(isSold), [rows])
  const selectedSales = useMemo(() => allSales.filter(row => withinRange(row, range)), [allSales, range])
  const previousSales = useMemo(
    () => range?.previous ? allSales.filter(row => withinRange(row, range.previous)) : [],
    [allSales, range],
  )

  const metrics = useMemo(() => {
    const revenue = selectedSales.reduce((sum, row) => sum + amount(row.sale_price), 0)
    const cost = selectedSales.reduce((sum, row) => sum + totalCost(row), 0)
    const profit = revenue - cost
    const previousRevenue = previousSales.reduce((sum, row) => sum + amount(row.sale_price), 0)
    const previousProfit = previousSales.reduce((sum, row) => sum + amount(row.sale_price) - totalCost(row), 0)
    return {
      revenue,
      cost,
      profit,
      units: selectedSales.length,
      average: selectedSales.length ? revenue / selectedSales.length : 0,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      revenueChange: range ? percentageChange(revenue, previousRevenue) : null,
      profitChange: range ? percentageChange(profit, previousProfit) : null,
      unitsChange: range ? percentageChange(selectedSales.length, previousSales.length) : null,
    }
  }, [selectedSales, previousSales, range])

  const stockRows = useMemo(() => rows.filter(row => !isSold(row)), [rows])
  const investedStock = stockRows.reduce((sum, row) => sum + totalCost(row), 0)
  const undatedSales = allSales.filter(row => !localDate(row.sale_date)).length

  const vehicleById = useMemo(
    () => new Map(vehicles.map(vehicle => [String(vehicle.id), vehicle])),
    [vehicles],
  )

  const typeBreakdown = useMemo(() => {
    const groups = [
      { key: 'occasion', label: 'Occasions', units: 0, revenue: 0, profit: 0 },
      { key: 'neuf', label: 'Neufs', units: 0, revenue: 0, profit: 0 },
    ]
    selectedSales.forEach(row => {
      const vehicle = vehicleById.get(String(row.vehicle_id))
      const key = vehicle?.etat_vehicule === 'occasion' ? 'occasion' : 'neuf'
      const group = groups.find(item => item.key === key)
      group.units += 1
      group.revenue += amount(row.sale_price)
      group.profit += amount(row.sale_price) - totalCost(row)
    })
    return groups
  }, [selectedSales, vehicleById])

  const monthlyTrend = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
      const key = monthKey(date)
      const monthRows = allSales.filter(row => row.sale_date?.slice(0, 7) === key)
      return {
        key,
        label: monthLabel(date),
        revenue: monthRows.reduce((sum, row) => sum + amount(row.sale_price), 0),
        profit: monthRows.reduce((sum, row) => sum + amount(row.sale_price) - totalCost(row), 0),
        units: monthRows.length,
      }
    })
  }, [allSales])

  const maxMonthlyRevenue = Math.max(1, ...monthlyTrend.map(item => item.revenue))
  const recentSales = [...selectedSales]
    .sort((a, b) => String(b.sale_date || '').localeCompare(String(a.sale_date || '')))
    .slice(0, 8)
  const bestSales = [...selectedSales]
    .sort((a, b) => (amount(b.sale_price) - totalCost(b)) - (amount(a.sale_price) - totalCost(a)))
    .slice(0, 5)
  const lossSales = selectedSales.filter(row => amount(row.sale_price) - totalCost(row) < 0)
  const monthKeyNow = monthKey(now)
  const currentMonthSales = allSales.filter(row => row.sale_date?.slice(0, 7) === monthKeyNow)
  const monthRevenue = currentMonthSales.reduce((sum, row) => sum + amount(row.sale_price), 0)
  const monthProfit = currentMonthSales.reduce((sum, row) => sum + amount(row.sale_price) - totalCost(row), 0)
  const monthlyRevenueGoal = Math.max(0, Number(targetRevenue) || 0)
  const monthlyUnitsGoal = Math.max(0, Number(targetUnits) || 0)
  const revenueProgress = monthlyRevenueGoal > 0 ? Math.min(100, (monthRevenue / monthlyRevenueGoal) * 100) : 0
  const unitsProgress = monthlyUnitsGoal > 0 ? Math.min(100, (currentMonthSales.length / monthlyUnitsGoal) * 100) : 0

  const pendingReservations = reservations.filter(item => ['nouvelle', 'contactee'].includes(item.statut)).length
  const pendingTrades = sellRequests.filter(item => !['finalisee', 'vendue', 'annulee', 'refusee'].includes(item.statut)).length
  const urgentFollowUps = followUps.filter(item => item.statut === 'a_faire' && new Date(item.due_at) <= now).length

  async function saveGoals(event) {
    event.preventDefault()
    const revenueGoal = targetRevenue.trim() === '' ? 0 : Number(targetRevenue)
    const unitsGoal = targetUnits.trim() === '' ? 0 : Number(targetUnits)
    if (!Number.isFinite(revenueGoal) || revenueGoal < 0 || !Number.isFinite(unitsGoal) || unitsGoal < 0) {
      onToast?.('Saisis des objectifs mensuels valides et positifs.', 'error')
      return
    }
    setSavingTargets(true)
    try {
      await saveSetting('commercial_targets', JSON.stringify({
        monthlyRevenue: revenueGoal,
        monthlyUnits: Math.round(unitsGoal),
      }))
      setTargetRevenue(String(revenueGoal || ''))
      setTargetUnits(String(Math.round(unitsGoal) || ''))
      setShowTargets(false)
      onToast?.('Objectifs commerciaux enregistrés.')
    } catch (error) {
      onToast?.('Impossible d’enregistrer les objectifs : ' + error.message, 'error')
    } finally {
      setSavingTargets(false)
    }
  }

  const periodLabel = PERIODS.find(([key]) => key === period)?.[1] || 'Période sélectionnée'

  return (
    <section className="commercial-root">
      <div className="commercial-header">
        <div>
          <span className="adm-eyebrow">PILOTAGE DES VENTES · DONNÉES COMPTABILISÉES</span>
          <h2>Tableau de bord commercial</h2>
          <p>Analyse du chiffre d’affaires, des marges et du rythme de vente à partir des fiches financières enregistrées.</p>
        </div>
        <div className="commercial-header-actions">
          <select aria-label="Période analysée" value={period} onChange={event => setPeriod(event.target.value)}>
            {PERIODS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button type="button" className="act-btn" onClick={() => loadSales(true)} disabled={refreshing}>{refreshing ? 'Actualisation…' : '↻ Actualiser'}</button>
          <button type="button" className="act-btn" onClick={() => downloadCsv(selectedSales)} disabled={!selectedSales.length}>↓ Exporter CSV</button>
        </div>
      </div>

      {loadError && (
        <div className="commercial-error" role="alert">
          <strong>Impossible de charger les ventes</strong>
          <span>{loadError}</span>
          <button type="button" className="act-btn" onClick={() => loadSales(true)}>Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="commercial-loading">Chargement des indicateurs commerciaux…</div>
      ) : (
        <>
          <div className="commercial-kpis">
            <article className="commercial-kpi revenue">
              <span>CHIFFRE D’AFFAIRES</span>
              <strong>{fmt(metrics.revenue)}</strong>
              <small>{metrics.units} vente(s) · {periodLabel.toLowerCase()}</small>
              {metrics.revenueChange !== null && <em className={metrics.revenueChange >= 0 ? 'up' : 'down'}>{signedPercent(metrics.revenueChange)} vs période précédente</em>}
            </article>
            <article className="commercial-kpi profit">
              <span>MARGE BRUTE ENREGISTRÉE</span>
              <strong className={metrics.profit >= 0 ? 'positive' : 'negative'}>{fmt(metrics.profit)}</strong>
              <small>{metrics.margin.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % du chiffre d’affaires</small>
              {metrics.profitChange !== null && <em className={metrics.profitChange >= 0 ? 'up' : 'down'}>{signedPercent(metrics.profitChange)} vs période précédente</em>}
            </article>
            <article className="commercial-kpi units">
              <span>VÉHICULES VENDUS</span>
              <strong>{metrics.units}</strong>
              <small>Prix de vente réel saisi</small>
              {metrics.unitsChange !== null && <em className={metrics.unitsChange >= 0 ? 'up' : 'down'}>{signedPercent(metrics.unitsChange)} vs période précédente</em>}
            </article>
            <article className="commercial-kpi average">
              <span>PANIER MOYEN</span>
              <strong>{fmt(metrics.average)}</strong>
              <small>Prix moyen par véhicule vendu</small>
              <em>{metrics.units ? 'Sur ' + metrics.units + ' vente(s)' : 'Aucune vente sur cette période'}</em>
            </article>
          </div>

          <div className="commercial-overview-grid">
            <section className="commercial-card commercial-trend">
              <div className="commercial-section-heading">
                <div><span className="adm-eyebrow">ÉVOLUTION</span><h3>Chiffre d’affaires mensuel</h3><p>Six derniers mois · ventes datées uniquement</p></div>
                <span className="commercial-section-icon">↗</span>
              </div>
              <div className="commercial-chart">
                {monthlyTrend.map(item => (
                  <div className="commercial-chart-column" key={item.key} title={item.label + ' : ' + fmt(item.revenue) + ' · ' + item.units + ' vente(s)'}>
                    <strong>{item.revenue > 0 ? fmt(item.revenue) : '—'}</strong>
                    <div className="commercial-bar-track"><span style={{ height: (item.revenue / maxMonthlyRevenue * 100) + '%' }} /></div>
                    <small>{item.label}</small>
                    <em>{item.units} vente(s)</em>
                  </div>
                ))}
              </div>
              <div className="commercial-chart-legend"><span><i /> Chiffre d’affaires enregistré</span><small>Les ventes sans date sont exclues de cette courbe.</small></div>
            </section>

            <section className="commercial-card commercial-target-card">
              <div className="commercial-section-heading">
                <div><span className="adm-eyebrow">OBJECTIFS</span><h3>Performance du mois</h3><p>Suivi des objectifs mensuels du showroom</p></div>
                <button type="button" className="act-btn" onClick={() => setShowTargets(open => !open)}>{showTargets ? 'Fermer' : '⚙ Définir'}</button>
              </div>

              {showTargets && (
                <form className="commercial-target-form" onSubmit={saveGoals}>
                  <label>Objectif de chiffre d’affaires (DA)<input type="number" min="0" step="100000" value={targetRevenue} onChange={event => setTargetRevenue(event.target.value)} placeholder="Ex. 15 000 000" /></label>
                  <label>Objectif de ventes (véhicules)<input type="number" min="0" step="1" value={targetUnits} onChange={event => setTargetUnits(event.target.value)} placeholder="Ex. 5" /></label>
                  <div><button type="submit" className="btn-save" disabled={savingTargets}>{savingTargets ? 'Enregistrement…' : 'Enregistrer les objectifs'}</button></div>
                </form>
              )}

              <div className="commercial-goal">
                <div className="commercial-goal-copy"><span>Chiffre d’affaires</span><strong>{fmt(monthRevenue)} <small>{monthlyRevenueGoal > 0 ? '/ ' + fmt(monthlyRevenueGoal) : '· objectif non défini'}</small></strong></div>
                {monthlyRevenueGoal > 0 ? <div className="commercial-goal-track"><span style={{ width: revenueProgress + '%' }} /></div> : <div className="commercial-goal-empty">Définis un objectif pour afficher la progression.</div>}
              </div>
              <div className="commercial-goal">
                <div className="commercial-goal-copy"><span>Véhicules vendus</span><strong>{currentMonthSales.length} <small>{monthlyUnitsGoal > 0 ? '/ ' + monthlyUnitsGoal : '· objectif non défini'}</small></strong></div>
                {monthlyUnitsGoal > 0 ? <div className="commercial-goal-track units"><span style={{ width: unitsProgress + '%' }} /></div> : <div className="commercial-goal-empty">Définis un objectif pour afficher la progression.</div>}
              </div>
              <div className="commercial-goal-profit">Marge brute du mois : <strong className={monthProfit >= 0 ? 'positive' : 'negative'}>{fmt(monthProfit)}</strong></div>
            </section>
          </div>

          <div className="commercial-overview-grid commercial-overview-secondary">
            <section className="commercial-card">
              <div className="commercial-section-heading">
                <div><span className="adm-eyebrow">MIX DES VENTES</span><h3>Neuf vs occasion</h3><p>Répartition des ventes sur la période sélectionnée</p></div>
              </div>
              {typeBreakdown.every(item => item.units === 0) ? (
                <div className="commercial-empty">Aucune vente enregistrée sur cette période.</div>
              ) : typeBreakdown.map(item => (
                <div className="commercial-type-row" key={item.key}>
                  <div><strong>{item.label}</strong><span>{item.units} véhicule(s) · {fmt(item.revenue)}</span></div>
                  <div className="commercial-type-track"><span style={{ width: (metrics.revenue > 0 ? item.revenue / metrics.revenue * 100 : 0) + '%' }} /></div>
                  <small className={item.profit >= 0 ? 'positive' : 'negative'}>Marge : {fmt(item.profit)}</small>
                </div>
              ))}
              <div className="commercial-stock-note"><strong>{stockRows.length}</strong> fiche(s) financière(s) encore en stock · Capital engagé suivi : <b>{fmt(investedStock)}</b></div>
            </section>

            <section className="commercial-card">
              <div className="commercial-section-heading">
                <div><span className="adm-eyebrow">PIPELINE CLIENTS</span><h3>Opportunités à convertir</h3><p>Demandes ouvertes · distinctes des ventes comptabilisées</p></div>
              </div>
              <div className="commercial-pipeline-list">
                <div><span className="pipeline-icon reservation">▤</span><span><strong>Réservations à traiter</strong><small>Nouvelles ou contactées</small></span><b>{pendingReservations}</b></div>
                <div><span className="pipeline-icon trade">⇄</span><span><strong>Reprises / échanges en cours</strong><small>Hors dossiers finalisés, vendus ou refusés</small></span><b>{pendingTrades}</b></div>
                <div><span className="pipeline-icon followup">◷</span><span><strong>Relances urgentes</strong><small>En retard ou prévues maintenant</small></span><b>{urgentFollowUps}</b></div>
              </div>
            </section>
          </div>

          <div className="commercial-overview-grid commercial-overview-secondary">
            <section className="commercial-card">
              <div className="commercial-section-heading">
                <div><span className="adm-eyebrow">MEILLEURES MARGES</span><h3>Top ventes rentables</h3><p>Classement par marge brute enregistrée</p></div>
              </div>
              {bestSales.length ? (
                <div className="commercial-ranking">
                  {bestSales.map((row, index) => {
                    const profit = amount(row.sale_price) - totalCost(row)
                    return <div key={row.id}><span className="commercial-rank">{index + 1}</span><span><strong>{row.vehicle_label || 'Véhicule'}</strong><small>{row.sale_date || 'Date non renseignée'}</small></span><b className={profit >= 0 ? 'positive' : 'negative'}>{fmt(profit)}</b></div>
                  })}
                </div>
              ) : <div className="commercial-empty">Les marges apparaîtront après l’enregistrement des premières ventes.</div>}
              {lossSales.length > 0 && <div className="commercial-warning"><strong>{lossSales.length} vente(s) à marge négative</strong><span>Vérifie les frais, le prix de vente et la négociation dans les fiches financières.</span></div>}
            </section>

            <section className="commercial-card">
              <div className="commercial-section-heading">
                <div><span className="adm-eyebrow">DERNIÈRES VENTES</span><h3>Activité commerciale récente</h3><p>Véhicules dont le prix de vente a été renseigné</p></div>
              </div>
              {recentSales.length ? (
                <div className="commercial-recent">
                  {recentSales.map(row => {
                    const profit = amount(row.sale_price) - totalCost(row)
                    return <div key={row.id}><span><strong>{row.vehicle_label || 'Véhicule'}</strong><small>{row.sale_date || 'Date non renseignée'}</small></span><span><b>{fmt(row.sale_price)}</b><small className={profit >= 0 ? 'positive' : 'negative'}>{fmt(profit)} de marge</small></span></div>
                  })}
                </div>
              ) : <div className="commercial-empty">Aucune vente comptabilisée sur la période sélectionnée.</div>}
            </section>
          </div>

          {undatedSales > 0 && (
            <div className="commercial-info"><strong>{undatedSales} vente(s) sans date de vente.</strong> Elles sont incluses dans le total « Depuis le début », mais exclues des analyses mensuelles et des comparaisons de période jusqu’à ce que leur date soit renseignée dans Finances.</div>
          )}
          <p className="commercial-footnote">Source des chiffres : fiches « Suivi financier des véhicules ». Coût total = achat / reprise + transport + préparation + autres frais enregistrés. Marge affichée = prix de vente réel − coût total. Elle ne déduit pas les impôts ni les frais non saisis. Les réservations et reprises en cours ne sont jamais comptées comme chiffre d’affaires.</p>
        </>
      )}
    </section>
  )
}
