import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

let cache = null
let cacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

const DEFAULTS = {
  shop_name:       'Ilyas Auto',
  shop_phone:      '213550123456',
  shop_whatsapp:   '213550123456',
  shop_email:      'contact@ilyasauto.com',
  shop_address:    'Boumerdès, Algérie',
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

export async function saveSetting(key, value) {
  cache = null; cacheTime = 0
  const { error: errU } = await supabase
    .from('settings')
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq('key', key)

  if (errU) {
    const { error: errI } = await supabase
      .from('settings')
      .insert({ key, value: String(value), updated_at: new Date().toISOString() })
    if (errI) { console.error('saveSetting insert:', errI); throw errI }
  }
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
