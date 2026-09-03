import { fmt } from '../utils/notify'
import { ORIGINS, flagURI, PLACEHOLDER_IMG } from '../data/vehicles-data'

const ROWS = [
  { key: 'prix',         label: '💰 Prix',          fmt: v => fmt(v.prix) },
  { key: 'annee',        label: '📅 Année',          fmt: v => v.annee },
  { key: 'km',           label: '🛣️ Kilométrage',    fmt: v => v.km ? Number(v.km).toLocaleString('fr-FR') + ' km' : 'Neuf / 0 km' },
  { key: 'transmission', label: '⚙️ Boîte',          fmt: v => v.transmission },
  { key: 'carburant',    label: '⛽ Carburant',      fmt: v => v.carburant },
  { key: 'carrosserie',  label: '🚙 Carrosserie',    fmt: v => v.carrosserie || '—' },
  { key: 'provenance',   label: '🌍 Provenance',     fmt: v => ORIGINS[v.provenance]?.label || 'Monde' },
  { key: 'statut',       label: '📍 Statut',         fmt: v => v.statut === 'disponible' ? '✅ Disponible' : v.statut === 'reserve' ? '⏳ Réservé' : '🚫 Vendu' },
]

export default function VehicleCompare({ vehicles, onClose, onOpenVehicle }) {
  return (
    <div className="cmp-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cmp-box">
        <div className="cmp-hdr">
          <h2>⚖️ Comparateur de véhicules</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr>
                <th className="cmp-label-col"></th>
                {vehicles.map(v => (
                  <th key={v.id}>
                    <div className="cmp-veh-card" onClick={() => onOpenVehicle && onOpenVehicle(v)}>
                      <img src={v.img || PLACEHOLDER_IMG} alt={v.marque} />
                      <div className="cmp-veh-name">{v.marque}</div>
                      <div className="cmp-veh-model">{v.modele}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.key}>
                  <td className="cmp-label-col">{row.label}</td>
                  {vehicles.map(v => (
                    <td key={v.id} className={row.key === 'prix' ? 'cmp-price-cell' : ''}>{row.fmt(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
