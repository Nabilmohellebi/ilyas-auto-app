import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

let cache = null
let cacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

const DEFAULTS = {
  shop_name:       'HBR Auto',
  shop_phone:      '213550123456',
  shop_whatsapp:   '213550123456',
  shop_email:      'contact@hbrauto.com',
  shop_address:    'HBR Melaba, Azazga, Algérie',
  shop_horaires:   'Samedi – Jeudi : 09h00 – 19h00 · Vendredi : fermé',
  shop_maps_url:   'https://maps.app.goo.gl/mrnBnx1ZRXTS4xoi6',
  shop_maps_embed: 'https://maps.google.com/maps?q=HBR+MELABA,+Azazga&z=16&output=embed',
  maintenance:     'false',
  admin_password:  '', // si vide → on retombe sur VITE_ADMIN_PASSWORD
}

export async function getSettings() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache
  const { data, error } = await supabase.from('settings').select('key, value')
  if (error) { console.error('getSettings:', error); return DEFAULTS }
  if (!data || data.length === 0) return DEFAULTS
  const s = { ...DEFAULTS }
  data.forEach(({ key, value }) => { s[key] = value })
  cache = s
  cacheTime = Date.now()
  return s
}

// ── Upsert : crée la ligne si elle n'existe pas encore, sinon la met à jour.
//    (l'ancienne version faisait un update puis un insert "si erreur", mais un
//    update sur une clé absente ne renvoie PAS d'erreur côté Supabase → rien
//    n'était jamais sauvegardé pour une clé nouvelle. Upsert règle ça.) ──
export async function saveSetting(key, value) {
  cache = null; cacheTime = 0
  const { error } = await supabase
    .from('settings')
    .upsert(
      { key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  if (error) { console.error('saveSetting:', error); throw error }
}

export async function saveSettings(obj) {
  cache = null; cacheTime = 0
  const errors = []
  for (const [key, value] of Object.entries(obj)) {
    try { await saveSetting(key, value) } catch (e) { errors.push(key + ': ' + e.message) }
  }
  if (errors.length > 0) throw new Error('Erreurs : ' + errors.join(', '))
  return true
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setLoading(false) })
  }, [])

  return { settings, loading }
}
