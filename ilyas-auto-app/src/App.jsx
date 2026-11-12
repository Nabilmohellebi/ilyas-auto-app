import { lazy, Suspense, useEffect, useState } from 'react'
import AdminLogin from './components/admin/AdminLogin'
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'))
import PublicSite from './components/PublicSite'
import { supabase } from './supabase'

// Identifiant technique non distribuable : l'écran de connexion reste password-only.
const ADMIN_AUTH_ALIAS = 'admin@hbrauto.invalid'

export default function App() {
  const isAdminRoute =
    window.location.search.includes('admin') ||
    window.location.hash === '#admin'

  const [authLoading, setAuthLoading] = useState(true)
  const [adminUser, setAdminUser] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.error('HBR AUTO auth session:', error)
      const user = data?.session?.user || null
      setAdminUser(user?.app_metadata?.role === 'admin' ? user : null)
      setAuthLoading(false)
    }).catch(error => {
      console.error('HBR AUTO auth:', error)
      if (mounted) setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setAdminUser(user?.app_metadata?.role === 'admin' ? user : null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  function toast(msg, type = 'default') {
    const id = Date.now() + Math.random()
    setToasts(items => [...items, { id, msg, type }])
    window.setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 3200)
  }

  async function handleLogin(password) {
    setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_AUTH_ALIAS,
      password,
    })

    if (error) {
      setLoginError('Adresse e-mail ou mot de passe incorrect.')
      return
    }

    const { data: verified, error: verifyError } = await supabase.auth.getUser()
    const user = verified?.user || data?.user
    if (verifyError || user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut()
      setLoginError("Ce compte n'a pas les droits administrateur.")
      return
    }
    setAdminUser(user)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) toast('Erreur lors de la déconnexion : ' + error.message, 'error')
    setAdminUser(null)
    window.location.href = '/'
  }

  if (isAdminRoute) {
    if (authLoading) {
      return <div className="adm-loading" role="status">Vérification de la session…</div>
    }
    if (!adminUser) {
      return <AdminLogin onLogin={handleLogin} error={loginError} />
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
