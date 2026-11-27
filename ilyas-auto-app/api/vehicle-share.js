const SITE_ORIGIN = 'https://auto-nabil.vercel.app'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function cleanText(value, maxLength = 220) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function formatPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0
    ? `${amount.toLocaleString('fr-FR')} DA`
    : ''
}

function imageUrlFor(vehicle) {
  const candidates = [
    ...(Array.isArray(vehicle.images) ? vehicle.images : []),
    vehicle.img,
  ]

  for (const item of candidates) {
    const raw = typeof item === 'string' ? item : item?.url || item?.src
    if (!raw) continue

    try {
      const url = new URL(String(raw), SITE_ORIGIN)
      if (url.protocol === 'https:' && !url.username && !url.password) return url.href
    } catch {}
  }

  return ''
}

function renderPage({ vehicle, canonical, title, description, image, isCrawler }) {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const safeCanonical = escapeHtml(canonical)
  const safeImage = image ? escapeHtml(image) : ''
  const safeName = escapeHtml(`${vehicle.marque} ${vehicle.modele}`)
  const price = formatPrice(vehicle.prix)
  const condition = vehicle.etat_vehicule === 'occasion' ? 'Véhicule d’occasion' : 'Véhicule neuf'
  const status = vehicle.statut === 'vendu'
    ? 'Vendu'
    : vehicle.statut === 'reserve'
      ? 'Réservé'
      : 'Disponible'

  const metadata = [
    '<!doctype html>',
    '<html lang="fr"><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDescription}">`,
    '<meta name="robots" content="index,follow">',
    '<meta property="og:type" content="product">',
    '<meta property="og:locale" content="fr_DZ">',
    '<meta property="og:site_name" content="Nabil Auto">',
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${safeDescription}">`,
    `<meta property="og:url" content="${safeCanonical}">`,
    ...(safeImage ? [
      `<meta property="og:image" content="${safeImage}">`,
      `<meta property="og:image:alt" content="${safeName}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:image" content="${safeImage}">`,
    ] : ['<meta name="twitter:card" content="summary">']),
    `<meta name="twitter:title" content="${safeTitle}">`,
    `<meta name="twitter:description" content="${safeDescription}">`,
    `<link rel="canonical" href="${safeCanonical}">`,
    '<meta name="theme-color" content="#151917">',
    ...(isCrawler ? [] : [`<meta http-equiv="refresh" content="0;url=${safeCanonical}">`]),
    '</head>',
  ]

  const card = [
    '<body style="margin:0;background:#111713;color:#f5f1e8;font:16px/1.5 Arial,sans-serif">',
    '<main style="max-width:720px;margin:0 auto;padding:32px 20px">',
    '<p style="color:#c5a66c;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Nabil Auto · Algérie</p>',
    ...(safeImage ? [`<img src="${safeImage}" alt="${safeName}" style="display:block;width:100%;max-height:420px;object-fit:cover;border-radius:18px">`] : []),
    `<h1 style="margin:22px 0 8px;font-size:30px">${safeName}</h1>`,
    `<p style="color:#c5a66c;font-size:24px;font-weight:700">${escapeHtml(price)}</p>`,
    `<p>${escapeHtml(condition)} · ${escapeHtml(status)} · ${escapeHtml(String(vehicle.annee || ''))}</p>`,
    `<p>${safeDescription}</p>`,
    `<p><a href="${safeCanonical}" style="display:inline-block;margin-top:12px;padding:13px 20px;background:#c5a66c;color:#151917;text-decoration:none;font-weight:700;border-radius:9px">Voir la fiche du véhicule</a></p>`,
    '<p style="color:#a9afa9;font-size:13px">La fiche complète et les informations de disponibilité sont consultables sur le site Nabil Auto.</p>',
    '</main>',
  ]

  if (!isCrawler) {
    card.push(`<script>window.location.replace(${JSON.stringify(canonical)})</script>`)
  }

  card.push('</body></html>')
  return [...metadata, ...card].join('')
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  res.setHeader('Vary', 'User-Agent')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method not allowed')
  }

  const rawId = String(req.query?.id ?? '')
  if (!/^\d{1,18}$/.test(rawId)) {
    return res.status(400).send('Identifiant de véhicule invalide.')
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return res.status(503).send('Le catalogue est temporairement indisponible.')
  }

  try {
    const endpoint = new URL('/rest/v1/vehicles', supabaseUrl)
    endpoint.searchParams.set(
      'select',
      'id,marque,modele,annee,prix,km,transmission,carburant,etat_vehicule,statut,description,images,img,is_active'
    )
    endpoint.searchParams.set('id', `eq.${rawId}`)
    endpoint.searchParams.set('is_active', 'eq.true')
    endpoint.searchParams.set('limit', '1')

    const response = await fetch(endpoint.href, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    })

    if (!response.ok) {
      console.warn('Vehicle share preview could not load the public catalogue:', response.status)
      return res.status(502).send('Impossible de charger cette fiche pour le moment.')
    }

    const rows = await response.json()
    const vehicle = Array.isArray(rows) ? rows[0] : null
    if (!vehicle) return res.status(404).send('Ce véhicule n’est plus disponible sur le catalogue.')

    const name = cleanText(`${vehicle.marque} ${vehicle.modele}`, 120) || 'Véhicule'
    const year = Number(vehicle.annee) || ''
    const price = formatPrice(vehicle.prix)
    const condition = vehicle.etat_vehicule === 'occasion' ? 'occasion' : 'neuf'
    const mileage = Number(vehicle.km) > 0
      ? `${Number(vehicle.km).toLocaleString('fr-FR')} km`
      : ''
    const fuel = cleanText(vehicle.carburant, 40)
    const transmission = cleanText(vehicle.transmission, 40)
    const status = vehicle.statut === 'vendu'
      ? 'Vendu'
      : vehicle.statut === 'reserve'
        ? 'Réservé'
        : 'Disponible'
    const title = `${name}${year ? ` ${year}` : ''} · ${price || 'Voir le prix'} | Nabil Auto`
    const details = [`Véhicule d’${condition}`, mileage, fuel, transmission, status].filter(Boolean).join(' · ')
    const customDescription = cleanText(vehicle.description, 150)
    const description = [details, customDescription].filter(Boolean).join(' — ').slice(0, 280)
    const canonicalUrl = new URL('/', SITE_ORIGIN)
    canonicalUrl.searchParams.set('vehicule', String(vehicle.id))
    const image = imageUrlFor(vehicle)
    const userAgent = String(req.headers['user-agent'] || '')
    const isCrawler = /(facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|discordbot|slackbot|telegrambot|pinterest|googlebot|bingbot)/i.test(userAgent)
    const html = renderPage({
      vehicle,
      canonical: canonicalUrl.href,
      title,
      description,
      image,
      isCrawler,
    })

    res.setHeader('X-Robots-Tag', 'index, follow')
    if (req.method === 'HEAD') return res.status(200).end()
    return res.status(200).send(html)
  } catch (error) {
    console.error('Vehicle share preview failed:', error)
    return res.status(500).send('Une erreur empêche de charger cette fiche.')
  }
}
