import { lazy, Suspense, useState } from 'react'
import AdminLogin from './components/admin/AdminLogin'
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'))
import PublicSite from './components/PublicSite'
import { supabase } from './supabase'

export default function App() {
  const isAdmin =
    window.location.search.includes('admin') ||
    window.location.hash === '#admin' ||
    localStorage.getItem('ia_admin') === '1'
  const [adminAuth, setAdminAuth] = useState(() => localStorage.getItem('ia_admin') === '1')
  const [loginError, setLoginError] = useState(false)
  const [toasts, setToasts] = useState([])

  function toast(msg, type = 'default') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }

  async function handleLogin(email, password) {
    setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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
    await supabase.auth.signOut()
    setAdminUser(null)
    window.location.href = '/'
  }

  if (isAdmin) {
    if (authLoading) return <div className="adm-loading" role="status">Vérification de la session…</div>
    if (!adminUser) return <AdminLogin onLogin={handleLogin} error={loginError} />
    return (
      <>
        <Suspense fallback={<div className="adm-loading" role="status">Chargement de l’administration…</div>}>
          <AdminPanel onLogout={handleLogout} onToast={toast} />
        </Suspense>
        <div className="toasts">
          {toasts.map(t => <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>)}
        </div>
      </>
    )
  }

  return <PublicSite />
}
