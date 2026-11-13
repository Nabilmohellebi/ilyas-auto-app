export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  if (!host || /[\r\n]/.test(host)) {
    return res.status(400).send('Bad host')
  }

  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() === 'http' ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  return res.status(200).send([
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'))
}
