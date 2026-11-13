import { lazy, Suspense, useEffect, useState } from 'react'
import AdminLogin from './components/admin/AdminLogin'
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'))
import PublicSite from './components/PublicSite'
import { supabase } from './supabase'
import { getSettings } from './utils/useSettings'

export default function App() {
  const isAdminRoute =
    window.location.search.includes('admin') ||
    window.location.hash.split('&')[0] === '#admin'

  const [authLoading, setAuthLoading] = useState(true)
  const [adminSession, setAdminSession] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [toasts, setToasts] = useState([])
  const [shopName, setShopName] = useState('Nabil Auto')

  useEffect(() => {
    let mounted = true
    getSettings()
      .then(settings => { if (mounted) setShopName(settings.shop_name || 'Nabil Auto') })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true

    async function bootstrapSession() {
      let token = window.sessionStorage.getItem('hbr_admin_session')
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const handoffToken = hashParams.get('domainHandoff')

      if (handoffToken) {
        // Retire immédiatement le jeton de l'adresse visible et de l'historique.
        const cleanHash = window.location.hash
          .slice(1)
          .split('&')
          .filter(part => !part.startsWith('domainHandoff='))
          .join('&')
        const cleanUrl = window.location.pathname + window.location.search + (cleanHash ? '#' + cleanHash : '')
        window.history.replaceState(null, '', cleanUrl)

        try {
          const response = await fetch('/api/complete-domain-handoff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: handoffToken }),
          })
          const result = await response.json().catch(() => ({}))

          if (response.ok && typeof result.adminSession === 'string') {
            token = result.adminSession
            window.sessionStorage.setItem('hbr_admin_session', token)
            if (result.warnings?.length) {
              toast('Adresse modifiée. Certains anciens alias restent à vérifier dans Vercel.', 'error')
            } else if (result.removedDomains?.length) {
              toast('✅ Nouvelle adresse active · Ancien domaine supprimé.', 'default')
            }
          } else {
            token = null
            window.sessionStorage.removeItem('hbr_admin_session')
            if (mounted) setLoginError('Le domaine a changé. Reconnecte-toi avec ton mot de passe administrateur.')
          }
        } catch {
          token = null
          window.sessionStorage.removeItem('hbr_admin_session')
          if (mounted) setLoginError('Le transfert de session n’a pas abouti. Reconnecte-toi avec ton mot de passe administrateur.')
        }
      }

      if (!token) {
        if (mounted) setAuthLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.rpc('admin_check_session')
        if (!mounted) return
        if (error || data !== true) {
          window.sessionStorage.removeItem('hbr_admin_session')
          setAdminSession(false)
        } else {
          setAdminSession(true)
        }
      } catch (error) {
        console.error('Admin session check failed:', error)
        window.sessionStorage.removeItem('hbr_admin_session')
        if (mounted) setAdminSession(false)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    bootstrapSession().catch(error => {
      console.error('Admin session bootstrap failed:', error)
      window.sessionStorage.removeItem('hbr_admin_session')
      if (mounted) setAuthLoading(false)
    })

    return () => { mounted = false }
  }, [])

  function toast(msg, type = 'default') {
    const id = Date.now() + Math.random()
    setToasts(items => [...items, { id, msg, type }])
    window.setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 3200)
  }

  async function handleLogin(password) {
    setLoginError('')
    const { data: token, error } = await supabase.rpc('admin_login', {
      p_password: password,
    })
    if (error || typeof token !== 'string' || token.length < 32) {
      setLoginError('Mot de passe incorrect ou accès temporairement verrouillé.')
      return
    }

    window.sessionStorage.setItem('hbr_admin_session', token)
    const { data: valid, error: checkError } = await supabase.rpc('admin_check_session')
    if (checkError || valid !== true) {
      window.sessionStorage.removeItem('hbr_admin_session')
      setLoginError("La session n'a pas pu être validée. Réessaie.")
      return
    }
    setAdminSession(true)
  }

  async function handleLogout() {
    const { error } = await supabase.rpc('admin_logout')
    window.sessionStorage.removeItem('hbr_admin_session')
    setAdminSession(false)
    if (error) toast('Session locale fermée. ' + error.message, 'error')
    window.location.href = '/'
  }

  if (isAdminRoute) {
    if (authLoading) {
      return <div className="adm-loading" role="status">Vérification de la session…</div>
    }
    if (!adminSession) {
      return <AdminLogin onLogin={handleLogin} error={loginError} shopName={shopName} />
    }
    return (
      <>
        <Suspense fallback={<div className="adm-loading" role="status">Chargement de l’administration…</div>}>
          <AdminPanel onLogout={handleLogout} onToast={toast} />
        </Suspense>
        <div className="toasts">
          {toasts.map(item => <div key={item.id} className={`toast-msg ${item.type}`}>{item.msg}</div>)}
        </div>
      </>
    )
  }

  return <PublicSite />
}
