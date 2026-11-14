import CONFIG from '../config'
import { getSettings } from './useSettings'

// Telegram via proxy serveur sécurisé — le token ne quitte jamais Vercel
async function sendTelegram(text) {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (e) { console.warn('Telegram proxy:', e) }
}

export function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' DA' }

export function genId() {
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : null
  const randomPart = cryptoApi?.randomUUID
    ? cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12)
    : cryptoApi?.getRandomValues
      ? Array.from(cryptoApi.getRandomValues(new Uint8Array(6)), byte => byte.toString(16).padStart(2, '0')).join('')
      : Math.random().toString(36).slice(2, 14)
  return 'IA-' + randomPart.toUpperCase()
}

// ── Notifier une nouvelle réservation sur Telegram ──
export async function notifyTelegram(reservation) {
  const settings = await getSettings().catch(() => ({}))
  const shopName = settings.shop_name || CONFIG.nom
  const msg = `
🚗 *Nouvelle réservation — ${shopName}*
━━━━━━━━━━━━━━━━
🆔 *${reservation.id}*

🚘 *Véhicule :* ${reservation.vehicule_nom}
💰 *Prix :* ${fmt(reservation.vehicule_prix)}

👤 *Client :* ${reservation.nom_client}
📞 *Tél :* ${reservation.telephone}
${reservation.message ? `📝 *Message :* ${reservation.message}\n` : ''}━━━━━━━━━━━━━━━━
`.trim()

  await sendTelegram(msg)
}

export async function notifyTelegramSellRequest(request, details = {}) {
  const settings = await getSettings().catch(() => ({}))
  const shopName = settings.shop_name || CONFIG.nom
  const isExchange = details.type === 'exchange'
  const trade = details.trade
  const target = details.targetVehicle

  const msg = `
${isExchange ? '🔄 *Nouvelle demande d’échange*' : '💰 *Nouvelle proposition de vente*'} — ${shopName}
━━━━━━━━━━━━━━━━
🆔 *${request.id}*
🚘 *Véhicule :* ${request.marque} ${request.modele}
📅 *Année :* ${request.annee || 'Non précisée'}
🛣️ *Kilométrage :* ${request.km == null ? 'Non précisé' : Number(request.km).toLocaleString('fr-FR') + ' km'}
💵 *Prix / valeur annoncée :* ${request.prix_souhaite ? fmt(request.prix_souhaite) : 'À discuter'}
${isExchange && target ? `🚗 *Véhicule souhaité :* ${target.label}\n` : ''}${isExchange && trade ? `📊 *Reprise simulée :* ${fmt(trade.offer)}\n⚖️ *Différence estimée :* ${fmt(Math.abs(trade.balance))}\n` : ''}👤 *Client :* ${request.nom_client}
📞 *Téléphone :* ${request.telephone}
${details.note ? `📝 *Note :* ${details.note}\n` : ''}━━━━━━━━━━━━━━━━
`.trim()

  await sendTelegram(msg)
}

export function buildWAMessage(reservation, shopName = CONFIG.nom) {
  return encodeURIComponent(
    `Bonjour ${reservation.nom_client}, ici ${shopName} 👋\n` +
    `Nous avons bien reçu votre demande concernant :\n` +
    `🚘 ${reservation.vehicule_nom} — ${fmt(reservation.vehicule_prix)}\n\n` +
    `Un conseiller va vous recontacter très vite pour confirmer les détails.`
  )
}

// Ouvrir WA avec le client concerné pour une réservation (usage admin)
export function openWA(reservation, shopName = CONFIG.nom) {
  const phone = String(reservation.telephone || '').replace(/\D/g, '')
  const normalized = phone.startsWith('0') ? '213' + phone.slice(1) : phone
  window.open(`https://wa.me/${normalized}?text=${buildWAMessage(reservation, shopName)}`, '_blank')
}

// Lien WhatsApp public. Retourne null si aucun numéro valide n'est configuré :
// ne jamais utiliser "#" comme destination de secours, car cela rouvre le site.
export function normalizeWhatsAppPhone(phone) {
  let digits = String(phone || CONFIG.whatsapp || '').replace(/\\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  // Format algérien national (0XXXXXXXXX) -> format international 213XXXXXXXXX.
  if (digits.length === 10 && digits.startsWith('0')) digits = '213' + digits.slice(1)
  return /^\\d{8,15}$/.test(digits) ? digits : ''
}

export function waLink(text, phone) {
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}
