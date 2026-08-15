import CONFIG from '../config'

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
  return 'IA-' + Date.now().toString(36).toUpperCase().slice(-6)
}

// ── Notifier une nouvelle réservation sur Telegram ──
export async function notifyTelegram(reservation) {
  const msg = `
🚗 *Nouvelle réservation — Ilyas Auto*
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

export function buildWAMessage(reservation) {
  return encodeURIComponent(
    `Bonjour ${reservation.nom_client}, ici Ilyas Auto 👋\n` +
    `Nous avons bien reçu votre demande concernant :\n` +
    `🚘 ${reservation.vehicule_nom} — ${fmt(reservation.vehicule_prix)}\n\n` +
    `Un conseiller va vous recontacter très vite pour confirmer les détails.`
  )
}

// Ouvrir WA avec le client concerné pour une réservation
export function openWA(reservation) {
  const phone = String(reservation.telephone || '').replace(/\D/g, '')
  const normalized = phone.startsWith('0') ? '213' + phone.slice(1) : phone
  window.open(`https://wa.me/${normalized}?text=${buildWAMessage(reservation)}`, '_blank')
}

// Lien WA générique (bouton flottant, footer, etc.) — phone optionnel, sinon celui de config.js
export function waLink(text, phone) {
  const p = phone || CONFIG.whatsapp || '213550123456'
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}
