// api/telegram.js — Proxy serveur pour les notifications Telegram.
// Le token et les détails de la réponse Telegram restent côté serveur.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Cette route est appelée depuis le même site. Refuse les appels navigateur cross-origin.
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return res.status(503).json({ error: 'Notifications non configurées' })
  }

  try {
    const text = req.body?.text
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) {
      return res.status(400).json({ error: 'Message invalide' })
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })

    if (!response.ok) {
      // Ne renvoie pas la réponse Telegram brute (ni ses métadonnées) au navigateur.
      return res.status(502).json({ error: 'Échec de la notification' })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Telegram notification failed:', error)
    return res.status(502).json({ error: 'Notification indisponible' })
  }
}
