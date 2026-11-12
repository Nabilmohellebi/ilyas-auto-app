import { useMemo, useState } from 'react'
import { fmt, openWA } from '../../utils/notify'

const REQUEST_PREFIX = 'HBR_REQUEST_V2:'

function requestDetails(record) {
  const raw = record?.message || ''
  if (!raw.startsWith(REQUEST_PREFIX)) return { note: raw, type: 'sell' }
  try {
    return JSON.parse(raw.slice(REQUEST_PREFIX.length))
  } catch {
    return { note: raw, type: 'sell' }
  }
}

function phoneKey(value) {
  let digits = String(value || '').replace(/\\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = '213' + digits.slice(1)
  return digits
}

function safeCsv(value) {
  let text = String(value ?? '')
  if (/^[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

function exportContacts(contacts) {
  if (!contacts.length) return
  const rows = [
    ['Client', 'Téléphone', 'Nombre de demandes', 'Dernière activité', 'Dernier véhicule', 'Demandes à traiter'],
    ...contacts.map(client => [
      client.name,
      client.phone,
      client.interactions.length,
      client.lastAt ? new Date(client.lastAt).toLocaleString('fr-FR') : '',
      client.interactions[0]?.vehicle || '',
      client.pendingCount,
    ]),
  ]
  const csv = '\\uFEFF' + rows.map(row => row.map(safeCsv).join(';')).join('\\r\\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'hbr-auto-clients-' + new Date().toISOString().slice(0, 10) + '.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CRMPanel({
  reservations = [],
  sellRequests = [],
  onSetReservationStatus,
  onSetSellRequestStatus,
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const contacts = useMemo(() => {
    const grouped = new Map()
    const add = (record, kind) => {
      const rawPhone = String(record.telephone || '').trim()
      const key = phoneKey(rawPhone) || `${kind}:${record.id}`
      const client = grouped.get(key) || {
        id: key,
        name: record.nom_client || 'Client',
        phone: rawPhone,
        interactions: [],
      }
      if ((!client.name || client.name === 'Client') && record.nom_client) client.name = record.nom_client
      if (!client.phone && rawPhone) client.phone = rawPhone

      const details = kind === 'sell' ? requestDetails(record) : {}
      const isExchange = details.type === 'exchange'
      const vehicle = kind === 'reservation'
        ? record.vehicule_nom || 'Véhicule non précisé'
        : `${record.marque || ''} ${record.modele || ''}`.trim() || 'Véhicule proposé'
      client.interactions.push({
        id: record.id,
        key: `${kind}:${record.id}`,
        kind,
        kindLabel: kind === 'reservation' ? 'Réservation' : (isExchange ? 'Échange' : 'Vente proposée'),
        vehicle: kind === 'sell' && isExchange && details.targetVehicle?.label
          ? `${vehicle} ↔ ${details.targetVehicle.label}`
          : vehicle,
        date: record.created_at || null,
        status: record.statut || 'nouvelle',
        note: details.note || (kind === 'reservation' ? record.message : ''),
        price: kind === 'reservation' ? Number(record.vehicule_prix || 0) : Number(record.prix_souhaite || 0),
      })
      grouped.set(key, client)
    }

    reservations.forEach(record => add(record, 'reservation'))
    sellRequests.forEach(record => add(record, 'sell'))

    return Array.from(grouped.values()).map(client => {
      client.interactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      client.lastAt = client.interactions[0]?.date || null
      client.pendingCount = client.interactions.filter(item => item.status === 'nouvelle').length
      client.converted = client.interactions.some(item => item.status === 'vendue')
      return client
    }).sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime())
  }, [reservations, sellRequests])

  const filtered = contacts.filter(client => {
    if (filter === 'todo' && client.pendingCount === 0) return false
    if (filter === 'converted' && !client.converted) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    return [client.name, client.phone, ...client.interactions.map(item => item.vehicle)]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  const totalInteractions = reservations.length + sellRequests.length
  const needsFollowUp = contacts.filter(client => client.pendingCount > 0).length
  const converted = contacts.filter(client => client.converted).length

  function markInteraction(item, status) {
    if (item.kind === 'reservation') onSetReservationStatus?.(item.id, status)
    else onSetSellRequestStatus?.(item.id, status)
  }

  return (
    <section className="crm-root">
      <div className="crm-header">
        <div>
          <div className="adm-eyebrow">RELATION CLIENT</div>
          <h2>CRM clients</h2>
          <p>Un seul endroit pour retrouver les clients issus des réservations, ventes et échanges.</p>
        </div>
        <button className="act-btn" onClick={() => exportContacts(filtered)} disabled={!filtered.length}>↓ Exporter les clients</button>
      </div>

      <div className="crm-stats">
        <div className="crm-stat-card"><span>Clients identifiés</span><strong>{contacts.length}</strong></div>
        <div className="crm-stat-card"><span>À contacter</span><strong className="crm-highlight">{needsFollowUp}</strong></div>
        <div className="crm-stat-card"><span>Demandes enregistrées</span><strong>{totalInteractions}</strong></div>
        <div className="crm-stat-card"><span>Clients convertis</span><strong>{converted}</strong></div>
      </div>

      <div className="crm-toolbar">
        <input
          className="adm-search crm-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Rechercher un nom, téléphone ou véhicule…"
          aria-label="Rechercher un client"
        />
        {[
          ['all', 'Tous les clients'],
          ['todo', 'À contacter'],
          ['converted', 'Convertis'],
        ].map(([key, label]) => (
          <button key={key} className={`filter-btn ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="crm-empty">
          <div>👥</div>
          <strong>{contacts.length ? 'Aucun résultat' : 'Aucun client pour le moment'}</strong>
          <p>Les personnes qui envoient une réservation ou une proposition de vente/échange apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="crm-clients">
          {filtered.map(client => (
            <article className="crm-client-card" key={client.id}>
              <div className="crm-client-main">
                <div className="crm-avatar">{(client.name || 'C').trim().charAt(0).toUpperCase()}</div>
                <div className="crm-client-identity">
                  <strong>{client.name}</strong>
                  <a href={client.phone ? `tel:${client.phone.replace(/[^+\\d]/g, '')}` : undefined}>{client.phone || 'Téléphone non renseigné'}</a>
                  <small>{client.interactions.length} demande{client.interactions.length > 1 ? 's' : ''} · Dernière activité : {client.lastAt ? new Date(client.lastAt).toLocaleDateString('fr-FR') : '—'}</small>
                </div>
                <div className="crm-client-tags">
                  {client.pendingCount > 0 && <span className="crm-tag pending">{client.pendingCount} à traiter</span>}
                  {client.converted && <span className="crm-tag converted">Converti</span>}
                </div>
                <div className="crm-client-actions">
                  <button className="act-btn wa" disabled={!client.phone} onClick={() => openWA({
                    nom_client: client.name,
                    telephone: client.phone,
                    vehicule_nom: client.interactions[0]?.vehicle || 'Votre demande',
                    vehicule_prix: client.interactions[0]?.price || 0,
                  })}>WhatsApp</button>
                  <button className="act-btn" onClick={() => setExpanded(value => value === client.id ? null : client.id)}>
                    {expanded === client.id ? 'Masquer' : 'Historique'}
                  </button>
                </div>
              </div>

              {expanded === client.id && (
                <div className="crm-history">
                  <div className="crm-history-title">Historique des demandes</div>
                  {client.interactions.map(item => (
                    <div className="crm-history-row" key={item.key}>
                      <div className="crm-history-dot" />
                      <div className="crm-history-content">
                        <div className="crm-history-heading">
                          <strong>{item.kindLabel} · {item.vehicle}</strong>
                          <span className={`res-badge ${item.status}`}>{item.status}</span>
                        </div>
                        <small>{item.date ? new Date(item.date).toLocaleString('fr-FR') : 'Date inconnue'}{item.price > 0 ? ` · ${fmt(item.price)}` : ''}</small>
                        {item.note && <p>{item.note}</p>}
                        <div className="crm-history-actions">
                          {item.status === 'nouvelle' && <button className="act-btn" onClick={() => markInteraction(item, 'contactee')}>Marquer contacté</button>}
                          {item.status === 'contactee' && <button className="act-btn" onClick={() => markInteraction(item, 'vendue')}>Marquer traité / vendu</button>}
                          {item.status !== 'annulee' && item.status !== 'vendue' && <button className="act-btn danger" onClick={() => markInteraction(item, 'annulee')}>Annuler la demande</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <p className="crm-footnote">Les clients sont regroupés par numéro de téléphone. L’historique provient des demandes déjà enregistrées ; aucune fiche client supplémentaire n’est créée.</p>
    </section>
  )
}
