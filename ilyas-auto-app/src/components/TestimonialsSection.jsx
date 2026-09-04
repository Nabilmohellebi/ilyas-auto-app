import { useState, useEffect } from 'react'

export default function TestimonialsSection({ supabase }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    supabase.from('testimonials').select('*').eq('actif', true).order('position', { ascending: true })
      .then(({ data }) => setItems(data || []))
  }, [])

  if (items.length === 0) return null

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <h2>ILS NOUS FONT CONFIANCE</h2>
        <div className="bar" />
        <p>La parole à nos clients.</p>
      </div>
      <div className="testi-grid">
        {items.map(t => (
          <div key={t.id} className="testi-card">
            <div className="testi-stars">{'★'.repeat(t.note || 5)}{'☆'.repeat(5 - (t.note || 5))}</div>
            <p className="testi-quote">"{t.texte}"</p>
            <div className="testi-author">
              {t.photo_url
                ? <img src={t.photo_url} alt={t.nom} />
                : <div className="testi-avatar">{t.nom?.[0]?.toUpperCase()}</div>
              }
              <div>
                <div className="testi-name">{t.nom}</div>
                {t.role && <div className="testi-role">{t.role}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
