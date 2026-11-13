import { lazy, Suspense, useEffect, useState } from 'react'
import AdminLogin from './components/admin/AdminLogin'
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'))
import PublicSite from './components/PublicSite'
import { supabase } from './supabase'
import { getSettings } from './utils/useSettings'

export default function App() {
  const isAdminRoute =
    window.location.search.includes('admin') ||
    window.location.hash === '#admin'

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
    async function checkSession() {
      const token = window.sessionStorage.getItem('hbr_admin_session')
      if (!token) {
        if (mounted) setAuthLoading(false)
        return
      }
      const { data, error } = await supabase.rpc('admin_check_session')
      if (mounted) {
        if (error || data !== true) {
          window.sessionStorage.removeItem('hbr_admin_session')
          setAdminSession(false)
        } else {
          setAdminSession(true)
        }
        setAuthLoading(false)
      }
    }
    checkSession().catch(error => {
      console.error('HBR AUTO admin session:', error)
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
