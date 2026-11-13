function xmlEscape(value) {
  return String(value).replace(/[<>&"']/g, char => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[char])
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  if (!host || /[\r\n]/.test(host)) {
    return res.status(400).send('Invalid host')
  }

  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() === 'http' ? 'http' : 'https'
  const origin = `${protocol}://${host}`
  const urls = [new URL('/', origin).href]

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  // Include public active vehicle detail links when Supabase is configured.
  if (supabaseUrl && anonKey) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/vehicles?select=id&is_active=eq.true`
      const response = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      })
      if (response.ok) {
        const vehicles = await response.json()
        if (Array.isArray(vehicles)) {
          for (const vehicle of vehicles) {
            if (vehicle?.id != null) {
              const detail = new URL('/', origin)
              detail.searchParams.set('vehicule', String(vehicle.id))
              urls.push(detail.href)
            }
          }
        }
      }
    } catch (error) {
      console.warn('Dynamic sitemap could not load vehicle links:', error)
    }
  }

  const uniqueUrls = [...new Set(urls)]
  const entries = uniqueUrls.map(url => (
    `  <url><loc>${xmlEscape(url)}</loc></url>`
  )).join('\n')

  return res.status(200).send([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n'))
}
