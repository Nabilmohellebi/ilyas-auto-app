import { useMemo } from 'react'
import { fmt } from '../utils/notify'
import { PLACEHOLDER_IMG } from '../data/vehicles-data'

export default function EditorialSelection({ vehicles, onOpenVehicle }) {
  const collections = useMemo(() => {
    const groups = {}
    const premium = vehicles.filter(v => v.badge && v.badge.includes('Premium'))
    if (premium.length >= 2) groups['💎 Sélection Premium'] = premium

    vehicles.forEach(v => {
      if (!v.carrosserie) return
      const key = `🚙 Collection ${v.carrosserie}`
      if (!groups[key]) groups[key] = []
      groups[key].push(v)
    })

    return Object.entries(groups).filter(([, arr]) => arr.length >= 2).slice(0, 3)
  }, [vehicles])

  if (collections.length === 0) return null

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <h2>LA SÉLECTION</h2>
        <div className="bar" />
        <p>Une sélection distinguée, choisie pour son caractère et son exception.</p>
      </div>

      {collections.map(([title, list]) => (
        <div key={title} className="edito-row">
          <h3 className="edito-row-title">{title}</h3>
          <div className="edito-scroll">
            {list.slice(0, 8).map(v => (
              <div key={v.id} className="edito-card" onClick={() => onOpenVehicle(v)}>
                <img src={v.img || PLACEHOLDER_IMG} alt={v.marque} />
                <div className="edito-card-info">
                  <div className="name">{v.marque} {v.modele}</div>
                  <div className="price">{fmt(v.prix)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
