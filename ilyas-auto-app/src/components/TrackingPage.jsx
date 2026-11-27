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


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function createPrintableRecord(record, { t, locale, rtl }) {
  const status = t.tracking.statusLabels[record.statut] || record.statut || '—'
  const type = record.request_type === 'reservation'
    ? t.tracking.reservationType
    : t.tracking.tradeType
  const amount = record.amount === null || record.amount === undefined ? null : fmt(record.amount)
  const date = value => formatDate(value, locale)
  const title = `${t.tracking.pdfTitle} - ${record.reference}`
  const fileTitle = escapeHtml(title)
  const language = rtl ? 'ar' : 'fr'
  const direction = rtl ? 'rtl' : 'ltr'

  return `<!doctype html>
<html lang="${language}" dir="${direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fileTitle}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #202329; background: #fff; font-family: Arial, Tahoma, sans-serif; line-height: 1.55; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 20px; border-bottom: 3px solid #b58a4b; }
    .brand { color: #171a20; font-size: 24px; font-weight: 900; letter-spacing: .08em; }
    .eyebrow { margin-top: 5px; color: #9a743e; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .generated { color: #777; font-size: 10px; text-align: end; }
    h1 { margin: 27px 0 5px; color: #171a20; font-size: 22px; line-height: 1.2; }
    .subtitle { margin: 0 0 24px; color: #737780; font-size: 12px; }
    .vehicle { margin-bottom: 19px; padding: 17px 18px; border: 1px solid #e5e0d7; border-radius: 10px; background: #faf9f6; }
    .vehicle-label { margin-bottom: 5px; color: #96713e; font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .vehicle-name { color: #171a20; font-size: 18px; font-weight: 850; }
    .status { display: inline-block; margin-top: 10px; padding: 5px 10px; border-radius: 30px; background: #f2eadc; color: #75572f; font-size: 10px; font-weight: 800; }
    .section-title { margin: 23px 0 10px; color: #171a20; font-size: 12px; font-weight: 850; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
    .item { padding: 11px 12px; border: 1px solid #e9e9e9; border-radius: 8px; break-inside: avoid; }
    .label { display: block; margin-bottom: 5px; color: #7c8088; font-size: 9px; }
    .value { display: block; color: #252932; font-size: 11px; font-weight: 800; overflow-wrap: anywhere; }
    .notice { margin-top: 27px; padding: 12px 14px; border-inline-start: 3px solid #b58a4b; background: #faf9f6; color: #6e727a; font-size: 10px; }
    .footer { display: flex; justify-content: space-between; gap: 15px; margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e5e5; color: #969aa1; font-size: 9px; }
    @media (max-width: 600px) { .details { grid-template-columns: 1fr; } }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header class="top">
    <div><div class="brand">NABIL AUTO</div><div class="eyebrow">${escapeHtml(t.tracking.eyebrow)}</div></div>
    <div class="generated">${escapeHtml(t.tracking.pdfGenerated)}<br>${escapeHtml(date(new Date().toISOString()))}</div>
  </header>
  <main>
    <h1>${escapeHtml(t.tracking.pdfTitle)}</h1>
    <p class="subtitle">${escapeHtml(t.tracking.pdfSubtitle)}</p>
    <section class="vehicle">
      <div class="vehicle-label">${escapeHtml(type)}</div>
      <div class="vehicle-name">${escapeHtml(record.label || '—')}</div>
      <span class="status">${escapeHtml(status)}</span>
    </section>
    <div class="section-title">${escapeHtml(t.tracking.pdfDetails)}</div>
    <section class="details">
      <div class="item"><span class="label">${escapeHtml(t.tracking.referenceNumber)}</span><strong class="value">${escapeHtml(record.reference)}</strong></div>
      <div class="item"><span class="label">${escapeHtml(t.tracking.pdfStatus)}</span><strong class="value">${escapeHtml(status)}</strong></div>
      ${amount === null ? '' : `<div class="item"><span class="label">${escapeHtml(t.tracking.amountLabel)}</span><strong class="value">${escapeHtml(amount)}</strong></div>`}
      <div class="item"><span class="label">${escapeHtml(t.tracking.createdAt)}</span><strong class="value">${escapeHtml(date(record.created_at))}</strong></div>
      <div class="item"><span class="label">${escapeHtml(t.tracking.updatedAt)}</span><strong class="value">${escapeHtml(date(record.updated_at))}</strong></div>
      <div class="item"><span class="label">${escapeHtml(t.tracking.pdfType)}</span><strong class="value">${escapeHtml(type)}</strong></div>
    </section>
    <p class="notice">${escapeHtml(t.tracking.pdfNotice)}</p>
  </main>
  <footer class="footer"><span>NABIL AUTO</span><span>${escapeHtml(record.reference)}</span></footer>
</body>
</html>`
}

function openRecordPdf(record, options) {
  const printWindow = window.open('', '_blank', 'width=900,height=720')
  if (!printWindow) return false

  printWindow.opener = null
  printWindow.document.open()
  printWindow.document.write(createPrintableRecord(record, options))
  printWindow.document.close()

  let printStarted = false
  const startPrint = () => {
    if (printStarted) return
    printStarted = true
    window.setTimeout(() => {
      try {
        printWindow.focus()
        printWindow.print()
      } catch (error) {
        console.error('HBR AUTO PDF:', error)
      }
    }, 250)
  }

  if (printWindow.document.readyState === 'complete') startPrint()
  else printWindow.addEventListener('load', startPrint, { once: true })
  return true
}

export default function TrackingPage({ onClose }) {
  const { t, lang, rtl } = useLang()
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR'

  function downloadRecord(record) {
    const opened = openRecordPdf(record, { t, locale, rtl })
    if (!opened) setError(t.tracking.popupBlocked)
  }

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
                  <div className="customer-portal-record-actions">
                    <button type="button" className="customer-portal-pdf-button" onClick={() => downloadRecord(record)}>
                      📄 {t.tracking.pdfButton}
                    </button>
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
