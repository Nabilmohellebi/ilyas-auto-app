import { useState } from 'react'
import { supabase } from '../supabase'
import { fmt } from '../utils/notify'
import { useLang } from '../i18n/LangContext'

const IDX = { nouvelle: 0, contactee: 1, vendue: 2 }

export default function TrackingPage({ onClose }) {
  const { t } = useLang()
  const [input, setInput] = useState('')
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    const q = input.trim().toUpperCase()
    if (!q) return
    setLoading(true); setError(''); setRes(null)
    const { data } = await supabase.from('reservations').select('*').ilike('id', `%${q}%`).limit(1).maybeSingle()
    setLoading(false)
    if (!data) { setError(t.tracking.aucune); return }
    setRes(data)
  }

  const STEPS = t.tracking.steps
  const curStep = res ? (IDX[res.statut] ?? 0) : -1
  const cancelled = res?.statut === 'annulee'

  return (
    <div className="res-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-box" style={{ maxWidth: 480 }}>
        <button className="btn-close" onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 4 }}>{t.tracking.titre}</h2>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)', marginBottom: 16 }}>{t.tracking.desc}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="track-input" placeholder="IA-XXXXXX" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          <button className="btn-save" onClick={search} disabled={loading}>{loading ? '…' : '🔍'}</button>
        </div>

        {error && <div style={{ color: '#ffb3b8', fontSize: 12.5, marginBottom: 12 }}>❌ {error}</div>}

        {res && (
          <div>
            <div className="track-summary">
              <div><span className="lbl">{t.tracking.vehicule}</span><strong>{res.vehicule_nom}</strong></div>
              <div><span className="lbl">{t.tracking.prix}</span><strong style={{ color: 'var(--br3)' }}>{fmt(res.vehicule_prix)}</strong></div>
            </div>

            {cancelled ? (
              <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: 14, textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
                {t.tracking.annulee}
              </div>
            ) : (
              <div className="track-steps">
                {STEPS.map((s, i) => {
                  const done = i <= curStep
                  const current = i === curStep
                  return (
                    <div key={i} className="track-step">
                      {i < STEPS.length - 1 && <div className={`track-line ${done ? 'done' : ''}`} />}
                      <div className={`track-icon ${done ? 'done' : ''} ${current ? 'current' : ''}`}>{s.icon}</div>
                      <div>
                        <div className={`track-label ${done ? 'done' : ''}`}>{s.label}{current && <span className="track-current-tag">{t.tracking.enCours}</span>}</div>
                        <div className="track-desc">{s.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
