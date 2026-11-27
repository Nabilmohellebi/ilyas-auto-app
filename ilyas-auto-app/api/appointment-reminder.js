import { timingSafeEqual } from 'node:crypto'

function matchesSecret(candidate, expected) {
  if (!candidate || !expected) return false
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer)
}

function cleanText(value, maxLength = 140) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function formatAlgeriaDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expectedSecret = process.env.CRON_SECRET
  const authorization = String(req.headers.authorization || '')
  const suppliedSecret = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  if (!matchesSecret(suppliedSecret, expectedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) {
    return res.status(503).json({ error: 'Telegram notifications are not configured' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const reminderType = body.reminderType
  const startsAt = body.startsAt
  const endsAt = body.endsAt

  if (
    !['24h', '1h'].includes(reminderType) ||
    !Number.isFinite(Date.parse(startsAt)) ||
    !Number.isFinite(Date.parse(endsAt)) ||
    Date.parse(endsAt) <= Date.parse(startsAt)
  ) {
    return res.status(400).json({ error: 'Invalid appointment reminder payload' })
  }

  const clientName = cleanText(body.clientName, 120) || 'Client'
  const phone = cleanText(body.phone, 40) || 'Non renseigné'
  const vehicleName = cleanText(body.vehicleName, 160) || 'Véhicule non précisé'
  const label = cleanText(body.label, 100) || 'Rendez-vous'
  const leadLabel = reminderType === '24h' ? '24 heures' : '1 heure'

  const message = [
    `🔔 RAPPEL RENDEZ-VOUS — ${leadLabel} avant`,
    '',
    `📅 ${formatAlgeriaDate(startsAt)}`,
    `🕒 Fin : ${new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Algiers',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(endsAt))}`,
    `👤 Client : ${clientName}`,
    `📞 Téléphone : ${phone}`,
    `🚘 Véhicule : ${vehicleName}`,
    `📌 Motif : ${label}`,
  ].join('\n')

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    })

    const result = await telegramResponse.json().catch(() => null)
    if (!telegramResponse.ok || result?.ok !== true) {
      console.error('Appointment reminder delivery failed with Telegram status:', telegramResponse.status)
      return res.status(502).json({ error: 'Telegram delivery failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Appointment reminder delivery failed:', error)
    return res.status(502).json({ error: 'Notification unavailable' })
  }
}
