import { useState, useMemo } from 'react'
import { fmt } from '../utils/notify'

const DUREES = [12, 24, 36, 48, 60]
const TAUX_ANNUEL = 0.07 // taux indicatif, à ajuster selon vos accords bancaires

export default function FinancingCalculator({ prix }) {
  const [apport, setApport] = useState(Math.round(prix * 0.2 / 10000) * 10000)
  const [duree, setDuree] = useState(36)

  const { montantFinance, mensualite } = useMemo(() => {
    const mf = Math.max(prix - Number(apport || 0), 0)
    const interet = mf * TAUX_ANNUEL * (duree / 12)
    const total = mf + interet
    const m = duree > 0 ? total / duree : 0
    return { montantFinance: mf, mensualite: m }
  }, [prix, apport, duree])

  return (
    <div className="vd-section">
      <h3>💰 Simulateur de financement</h3>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 14, lineHeight: 1.6 }}>
        Estimation indicative — hors frais de dossier, à confirmer avec notre équipe ou votre banque.
      </p>

      <div className="form-field" style={{ marginBottom: 12 }}>
        <label>Apport initial — {fmt(apport)}</label>
        <input type="range" min="0" max={prix} step="50000" value={apport} onChange={e => setApport(Number(e.target.value))} />
      </div>

      <div className="form-field" style={{ marginBottom: 16 }}>
        <label>Durée du financement</label>
        <select value={duree} onChange={e => setDuree(Number(e.target.value))}>
          {DUREES.map(d => <option key={d} value={d}>{d} mois</option>)}
        </select>
      </div>

      <div className="finance-result">
        <div><span className="lbl">Montant financé</span><strong>{fmt(montantFinance)}</strong></div>
        <div className="finance-highlight"><span className="lbl">Mensualité estimée</span><strong>{fmt(Math.round(mensualite))} / mois</strong></div>
      </div>
    </div>
  )
}
