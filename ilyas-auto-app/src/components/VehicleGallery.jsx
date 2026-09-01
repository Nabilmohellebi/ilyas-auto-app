// ══════════════════════════════════════════════
//  BANDE DÉFILANTE — Nouveautés & Promotions
//  S'affiche tout en haut du site
// ══════════════════════════════════════════════
import { useState } from 'react'
import { fmt } from '../utils/notify'
import { PLACEHOLDER_IMG } from '../data/vehicles-data'

export default function VehicleGallery({ vehicles, onVehicleClick, newLabel }) {
  const [paused, setPaused] = useState(false)

  const items = vehicles.slice(0, 12)
  if (items.length < 2) return null

  const all = [...items, ...items, ...items]

  return (
    <div className="veh-strip"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
    >
      <div className="veh-strip-fade left" />
      <div className="veh-strip-fade right" />
      <div className="veh-strip-track" style={{ animationPlayState: paused ? 'paused' : 'running', animationDuration: `${all.length * 3}s` }}>
        {all.map((v, i) => {
          const isNew = i % items.length === 0
          const disc = v.prix_old && v.prix_old > v.prix ? Math.round(100 - (v.prix / v.prix_old) * 100) : 0
          return (
            <div key={`${v.id}-${i}`} className="veh-strip-card" onClick={() => onVehicleClick(v)}>
              <div className="veh-strip-img">
                <img src={v.img || PLACEHOLDER_IMG} alt={v.marque} loading="lazy" />
                {isNew && <span className="veh-strip-tag new">{newLabel || '🆕 Nouveau'}</span>}
                {!isNew && disc > 0 && <span className="veh-strip-tag promo">-{disc}%</span>}
              </div>
              <div className="veh-strip-info">
                <div className="name">{v.marque} {v.modele}</div>
                <div className="price">{fmt(v.prix)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
