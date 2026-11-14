import { useState, useEffect } from 'react'

export default function TestimonialsSection({ supabase, lang = 'fr' }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    let active = true

    async function loadTestimonials() {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('actif', true)
          .order('position', { ascending: true })

        if (error) throw error
        if (active) setItems(Array.isArray(data) ? data : [])
      } catch (error) {
        console.warn('HBR AUTO testimonials:', error)
      }
    }

    loadTestimonials()
    return () => { active = false }
  }, [supabase])

  if (items.length === 0) return null

  const isArabic = lang === 'ar'
  const heading = isArabic ? 'آراء عملائنا' : 'ILS NOUS FONT CONFIANCE'
  const subtitle = isArabic ? 'كلمات من عملائنا.' : 'La parole à nos clients.'

  return (
    <section id="avis-clients" className="section testimonials-section" style={{ paddingTop: 0 }} aria-labelledby="testimonials-heading">
      <div className="section-head">
        <h2 id="testimonials-heading">{heading}</h2>
        <div className="bar" />
        <p>{subtitle}</p>
      </div>
      <div className="testi-grid">
        {items.map(item => {
          const rawRating = Number(item.note)
          const rating = Number.isFinite(rawRating) && rawRating > 0
            ? Math.min(5, Math.round(rawRating))
            : 5
          const name = String(item.nom || '').trim()

          return (
            <article key={item.id} className="testi-card">
              <div className="testi-stars" role="img" aria-label={isArabic ? `${rating} من 5 نجوم` : `${rating} étoiles sur 5`}>
                {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
              </div>
              <p className="testi-quote">"{item.texte}"</p>
              <div className="testi-author">
                {item.photo_url
                  ? <img src={item.photo_url} alt={name || (isArabic ? 'عميل' : 'Client')} loading="lazy" decoding="async" />
                  : <div className="testi-avatar" aria-hidden="true">{name[0]?.toUpperCase() || (isArabic ? 'ع' : 'C')}</div>
                }
                <div>
                  <div className="testi-name">{name || (isArabic ? 'عميل' : 'Client')}</div>
                  {item.role && <div className="testi-role">{item.role}</div>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
