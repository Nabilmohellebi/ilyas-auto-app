import { useEffect, useRef } from 'react'
import { fmt } from '../utils/notify'
import { ORIGINS, PLACEHOLDER_IMG } from '../data/vehicles-data'
import { useLang } from '../i18n/LangContext'

export default function VehicleCompare({ vehicles = [], onClose, onOpenVehicle }) {
  const { lang, t, rtl } = useLang()
  const closeButtonRef = useRef(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [])

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR'
  const numericValues = (key) => vehicles
    .map(vehicle => {
      const raw = vehicle[key]
      if (raw === null || raw === undefined || raw === '') return null
      const value = Number(raw)
      return Number.isFinite(value) ? value : null
    })
    .filter(value => value !== null)

  const prices = numericValues('prix')
  const years = numericValues('annee')
  const mileages = numericValues('km')
  const lowestPrice = prices.length ? Math.min(...prices) : null
  const newestYear = years.length ? Math.max(...years) : null
  const lowestMileage = mileages.length ? Math.min(...mileages) : null

  const rows = [
    { key: 'prix', label: t.compare.prix, format: vehicle => fmt(vehicle.prix) },
    { key: 'annee', label: t.compare.annee, format: vehicle => vehicle.annee || t.compare.nonRenseigne },
    {
      key: 'km',
      label: t.compare.kilometrage,
      format: vehicle => {
        const raw = vehicle.km
        if (raw === null || raw === undefined || raw === '') return t.compare.nonRenseigne
        const value = Number(raw)
        return Number.isFinite(value) ? value === 0 ? t.compare.zeroKm : value.toLocaleString(locale) + ' km' : t.compare.nonRenseigne
      },
    },
    { key: 'transmission', label: t.compare.boite, format: vehicle => vehicle.transmission || t.compare.nonRenseigne },
    { key: 'carburant', label: t.compare.carburant, format: vehicle => vehicle.carburant || t.compare.nonRenseigne },
    { key: 'carrosserie', label: t.compare.carrosserie, format: vehicle => vehicle.carrosserie || t.compare.nonRenseigne },
    { key: 'provenance', label: t.compare.provenance, format: vehicle => ORIGINS[vehicle.provenance]?.label || t.compare.inconnue },
    {
      key: 'statut',
      label: t.compare.statut,
      format: vehicle => vehicle.statut === 'disponible'
        ? t.compare.disponible
        : vehicle.statut === 'reserve'
          ? t.compare.reserve
          : vehicle.statut === 'vendu'
            ? t.compare.vendu
            : t.compare.nonRenseigne,
    },
  ]

  function highlightsFor(vehicle) {
    const result = []
    const price = Number(vehicle.prix)
    const year = Number(vehicle.annee)
    const rawMileage = vehicle.km
    const mileage = rawMileage === null || rawMileage === undefined || rawMileage === '' ? NaN : Number(rawMileage)

    if (lowestPrice !== null && Number.isFinite(price) && price === lowestPrice) result.push(t.compare.moinsCher)
    if (newestYear !== null && Number.isFinite(year) && year === newestYear) result.push(t.compare.plusRecent)
    if (lowestMileage !== null && Number.isFinite(mileage) && mileage === lowestMileage) result.push(t.compare.kilometrageBas)
    return result
  }

  function isHighlighted(vehicle, key) {
    if (key === 'prix') return lowestPrice !== null && Number(vehicle.prix) === lowestPrice
    if (key === 'annee') return newestYear !== null && Number(vehicle.annee) === newestYear
    if (key === 'km') {
      const raw = vehicle.km
      return lowestMileage !== null && raw !== null && raw !== undefined && raw !== '' && Number(raw) === lowestMileage
    }
    return false
  }

  return (
    <div className="cmp-ov" dir={rtl ? 'rtl' : 'ltr'} onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="cmp-box" role="dialog" aria-modal="true" aria-labelledby="cmp-title" aria-describedby="cmp-description">
        <div className="cmp-hdr">
          <div className="cmp-heading-copy">
            <h2 id="cmp-title">⚖️ {t.compare.titre}</h2>
            <p id="cmp-description">{t.compare.description(vehicles.length)}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="btn-close" onClick={onClose} aria-label={t.compare.fermer} title={t.compare.fermer}>✕</button>
        </div>

        <div className="cmp-scroll" role="region" aria-label={t.compare.zoneTableau} tabIndex={0}>
          <table className="cmp-table">
            <caption>{t.compare.legende}</caption>
            <thead>
              <tr>
                <th scope="col" className="cmp-label-col">{t.compare.caracteristique}</th>
                {vehicles.map(vehicle => {
                  const highlights = highlightsFor(vehicle)
                  return (
                    <th key={vehicle.id} scope="col">
                      <div className="cmp-veh-card-wrap">
                        <button
                          type="button"
                          className="cmp-veh-card"
                          onClick={() => onOpenVehicle?.(vehicle)}
                          aria-label={`${t.compare.voirFiche} ${vehicle.marque} ${vehicle.modele}`}
                        >
                          <img src={vehicle.img || PLACEHOLDER_IMG} alt={`${vehicle.marque} ${vehicle.modele}`} loading="lazy" />
                          <span className="cmp-veh-name">{vehicle.marque}</span>
                          <span className="cmp-veh-model">{vehicle.modele}</span>
                          <span className="cmp-veh-open-hint">{t.compare.voirFiche} ↗</span>
                        </button>
                        {highlights.length > 0 && (
                          <div className="cmp-highlights" aria-label={t.compare.pointsForts}>
                            {highlights.map(label => <span className="cmp-highlight-badge" key={label}>{label}</span>)}
                          </div>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key}>
                  <th scope="row" className="cmp-label-col">{row.label}</th>
                  {vehicles.map(vehicle => {
                    const highlighted = isHighlighted(vehicle, row.key)
                    return (
                      <td key={vehicle.id} className={`${row.key === 'prix' ? 'cmp-price-cell' : ''} ${highlighted ? 'cmp-highlight-cell' : ''}`}>
                        {row.format(vehicle)}
                        {highlighted && <span className="cmp-highlight-check" aria-label={t.compare.pointFort}>✓</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cmp-footnote">{t.compare.note}</p>
      </section>
    </div>
  )
}
