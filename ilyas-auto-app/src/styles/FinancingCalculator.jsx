import { useState, useMemo } from 'react'
import { fmt } from '../utils/notify'
import { useLang } from '../i18n/LangContext'

const DUREES = [12, 24, 36, 48, 60]
const TAUX_ANNUEL = 0.07 // taux indicatif, à ajuster selon vos accords bancaires

export default function FinancingCalculator({ prix }) {
  const { t } = useLang()
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
      <h3>{t.finance.titre}</h3>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 14, lineHeight: 1.6 }}>
        {t.finance.desc}
      </p>

      <div className="form-field" style={{ marginBottom: 12 }}>
        <label>{t.finance.apport} — {fmt(apport)}</label>
        <input type="range" min="0" max={prix} step="50000" value={apport} onChange={e => setApport(Number(e.target.value))} />
      </div>

      <div className="form-field" style={{ marginBottom: 16 }}>
        <label>{t.finance.duree}</label>
        <select value={duree} onChange={e => setDuree(Number(e.target.value))}>
          {DUREES.map(d => <option key={d} value={d}>{d} {t.finance.mois}</option>)}
        </select>
      </div>

      <div className="finance-result">
        <div><span className="lbl">{t.finance.montantFinance}</span><strong>{fmt(montantFinance)}</strong></div>
        <div className="finance-highlight"><span className="lbl">{t.finance.mensualite}</span><strong>{fmt(Math.round(mensualite))} / {t.finance.mois}</strong></div>
      </div>
    </div>
  )
}
