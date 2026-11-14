import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

let cache = null
let cacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

const PUBLIC_SETTING_KEYS = [
  'brand_identity', 'hero_images', 'shop_name', 'shop_phone', 'shop_whatsapp', 'shop_email', 'shop_address',
  'shop_horaires', 'shop_maps_url', 'shop_maps_embed', 'shop_phones',
  'maintenance', 'trade_margin_percent', 'site_theme',
]

export const DEFAULT_BRAND_IDENTITY = Object.freeze({
  accentColor: '#d7b15f',
  fontStyle: 'sport',
  logoUrl: '',
  logoPath: '',
})

export function parseBrandIdentity(raw) {
  const fallback = DEFAULT_BRAND_IDENTITY
  let value = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { value = null }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...fallback }

  const safeUrl = input => typeof input === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(input) ? input : ''
  const safePath = input => {
    if (typeof input !== 'string' || !input.startsWith('logo/')) return ''
    const filename = input.slice(5)
    return /^[A-Za-z0-9._-]+$/.test(filename) ? input : ''
  }

  return {
    accentColor: typeof value.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.accentColor)
      ? value.accentColor
      : fallback.accentColor,
    fontStyle: ['sport', 'elegant', 'modern'].includes(value.fontStyle)
      ? value.fontStyle
      : fallback.fontStyle,
    logoUrl: safeUrl(value.logoUrl),
    logoPath: safePath(value.logoPath),
  }
}

export function parseShowroomHeroImages(raw) {
  let value = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { value = [] }
  }
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).map(item => {
    const url = typeof item === 'string' ? item : item?.url
    if (typeof url !== 'string' || !/^https:\/\/[^\s"'<>]+$/i.test(url)) return null
    const path = typeof item === 'object' && item && typeof item.path === 'string'
      && item.path.startsWith('hero/')
      && /^[A-Za-z0-9._-]+$/.test(item.path.slice(5))
      ? item.path
      : ''
    return { url, path }
  }).filter(Boolean)
}

const DEFAULTS = {
  brand_identity: JSON.stringify(DEFAULT_BRAND_IDENTITY),
  hero_images: '[]',
  shop_name:       'Nabil Auto',
  shop_phone:      '',
  shop_whatsapp:   '',
  shop_email:      '',
  shop_address:    '',
  shop_horaires:   '',
  shop_maps_url:   '',
  shop_maps_embed: '',
  maintenance:     'false',
  site_theme:      'light',
}

export async function getSettings() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache
  const { data, error } = await supabase.from('settings').select('key, value').in('key', PUBLIC_SETTING_KEYS)
  if (error) {
    console.error('getSettings:', error)
    return DEFAULTS
  }
  if (!data || data.length === 0) return DEFAULTS
  const settings = { ...DEFAULTS }
  data.forEach(({ key, value }) => { settings[key] = value })
  cache = settings
  cacheTime = Date.now()
  return settings
}

// Upsert creates a missing setting row or updates the existing one.
export async function saveSetting(key, value) {
  cache = null
  cacheTime = 0
  const { error } = await supabase
    .from('settings')
    .upsert(
      { key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  if (error) {
    console.error('saveSetting:', error)
    throw error
  }
}

export async function saveSettings(obj) {
  cache = null
  cacheTime = 0
  const errors = []
  for (const [key, value] of Object.entries(obj)) {
    try { await saveSetting(key, value) } catch (error) { errors.push(key + ': ' + error.message) }
  }
  if (errors.length > 0) throw new Error('Erreurs : ' + errors.join(', '))
  return true
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(value => {
      setSettings(value)
      setLoading(false)
    })
  }, [])

  return { settings, loading }
}
