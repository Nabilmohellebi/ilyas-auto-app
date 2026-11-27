import { useState } from 'react'
import { supabase } from '../supabase'
import { fmt } from '../utils/notify'
import { useLang } from '../i18n/LangContext'

function formatDate(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function TrackingPage({ onClose }) {
  const { t, lang, rtl } = useLang()
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR'

  async function search() {
    const requestReference = reference.trim().toUpperCase()
    const phoneDigits = phone.replace(/\D/g, '')
    if (!requestReference || phoneDigits.length < 8) {
      setError(t.tracking.invalidInput)
      return
    }

    setLoading(true)
    setError('')
    setRecords([])

    try {
      const { data, error: lookupError } = await supabase.rpc('customer_portal_lookup', {
        p_reference: requestReference,
        p_phone: phone.trim(),
      })
      if (lookupError) throw lookupError
      if (!Array.isArray(data) || data.length === 0) {
        setError(t.tracking.aucune)
      } else {
        setRecords(data)
      }
    } catch (lookupError) {
      console.error('HBR AUTO customer portal:', lookupError)
      setError(t.tracking.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="res-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-box track-modal customer-portal-modal" dir={rtl ? 'rtl' : 'ltr'}>
        <button className="btn-close" onClick={onClose} aria-label={t.tracking.close}>✕</button>
        <div className="customer-portal-heading">
          <span className="customer-portal-eyebrow">{t.tracking.eyebrow}</span>
          <h2 style={{ fontFamily: 'var(--ff)', fontSize: 21, fontWeight: 900, color: 'white', marginBottom: 5 }}>{t.tracking.titre}</h2>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', lineHeight: 1.65, marginBottom: 18 }}>{t.tracking.desc}</p>
        </div>

        <div className="customer-portal-form">
          <div className="form-field">
            <label htmlFor="customer-portal-reference">{t.tracking.referenceLabel}</label>
            <input
              id="customer-portal-reference"
              className="track-input"
              placeholder={t.tracking.referencePlaceholder}
              maxLength={40}
              autoComplete="off"
              value={reference}
              onChange={e => setReference(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <div className="form-field">
            <label htmlFor="customer-portal-phone">{t.tracking.phoneLabel}</label>
            <input
              id="customer-portal-phone"
              className="track-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              placeholder={t.tracking.phonePlaceholder}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <button className="btn-save customer-portal-submit" type="button" onClick={search} disabled={loading || !reference.trim() || phone.replace(/\D/g, '').length < 8}>
            {loading ? t.tracking.loading : t.tracking.accessButton}
          </button>
        </div>

        <p className="customer-portal-note">🔒 {t.tracking.accessNote}</p>
        {error && <div role="alert" style={{ color: '#ffb3b8', fontSize: 12.5, margin: '12px 0' }}>❌ {error}</div>}

        {records.length > 0 && (
          <section className="customer-portal-results" aria-live="polite">
            <div className="customer-portal-results-heading">
              <h3>{t.tracking.recordsTitle}</h3>
              <span>{records.length}</span>
            </div>
            <div className="customer-portal-record-list">
              {records.map(record => (
                <article className="customer-portal-record" key={record.request_type + ':' + record.reference}>
                  <div className="customer-portal-record-top">
                    <span className="customer-portal-kind">
                      {record.request_type === 'reservation' ? t.tracking.reservationType : t.tracking.tradeType}
                    </span>
                    <span className={'res-badge ' + (record.statut || 'nouvelle')}>
                      {t.tracking.statusLabels[record.statut] || record.statut || '—'}
                    </span>
                  </div>
                  <h4>{record.label || '—'}</h4>
                  <div className="customer-portal-record-details">
                    <div>
                      <span>{t.tracking.referenceNumber}</span>
                      <strong>{record.reference}</strong>
                    </div>
                    {record.amount !== null && record.amount !== undefined && (
                      <div>
                        <span>{t.tracking.amountLabel}</span>
                        <strong className="customer-portal-amount">{fmt(record.amount)}</strong>
                      </div>
                    )}
                    <div>
                      <span>{t.tracking.createdAt}</span>
                      <strong>{formatDate(record.created_at, locale)}</strong>
                    </div>
                    <div>
                      <span>{t.tracking.updatedAt}</span>
                      <strong>{formatDate(record.updated_at, locale)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
