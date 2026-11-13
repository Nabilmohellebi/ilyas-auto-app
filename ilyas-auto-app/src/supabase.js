import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('❌ Variables Supabase manquantes dans .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

// Le jeton admin est attaché à chaque requête PostgREST / Storage depuis l'onglet courant.
function hbrAdminFetch(input, init = {}) {
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
  try {
    const token = window.sessionStorage.getItem('hbr_admin_session')
    if (token) headers.set('x-hbr-admin-session', token)
    else headers.delete('x-hbr-admin-session')
  } catch {
    headers.delete('x-hbr-admin-session')
  }
  return fetch(input, { ...init, headers })
}

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: { fetch: hbrAdminFetch },
})
