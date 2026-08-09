import { useState } from 'react'
import AdminLogin from './components/admin/AdminLogin'
import AdminPanel from './components/admin/AdminPanel'
import { getSettings } from './utils/useSettings'
import { waLink } from './utils/notify'
import CONFIG from './config'

export default function App() {
  const [isAdmin] = useState(() =>
    window.location.search.includes('admin') ||
    window.location.hash === '#admin' ||
    localStorage.getItem('ia_admin') === '1'
  )
  const [adminAuth, setAdminAuth] = useState(() => localStorage.getItem('ia_admin') === '1')
  const [loginError, setLoginError] = useState(false)
  const [toasts, setToasts] = useState([])

  function toast(msg, type = 'default') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }

  async function handleLogin(pw) {
    try {
      const s = await getSettings()
      const validPw = s.admin_password || import.meta.env.VITE_ADMIN_PASSWORD || 'ilyas2026'
      if (pw === validPw) {
        localStorage.setItem('ia_admin', '1')
        setAdminAuth(true)
        setLoginError(false)
      } else {
        setLoginError(true)
      }
    } catch (e) {
      const fallback = import.meta.env.VITE_ADMIN_PASSWORD || 'ilyas2026'
      if (pw === fallback) { localStorage.setItem('ia_admin', '1'); setAdminAuth(true); setLoginError(false) }
      else setLoginError(true)
    }
  }

  function handleLogout() {
    localStorage.removeItem('ia_admin')
    setAdminAuth(false)
    window.location.href = '/'
  }

  if (isAdmin) {
    if (!adminAuth) return <AdminLogin onLogin={handleLogin} error={loginError} />
    return (
      <>
        <AdminPanel onLogout={handleLogout} onToast={toast} />
        <div className="toasts">
          {toasts.map(t => <div key={t.id} className={`toast-msg ${t.type}`}>{t.msg}</div>)}
        </div>
      </>
    )
  }

  // ── Placeholder site public — la vitrine (grille véhicules, fiche, réservation)
  //    arrive dans la prochaine étape. Le panel admin est déjà 100% fonctionnel. ──
  return (
    <div className="public-placeholder">
      <div style={{ fontSize: 56, marginBottom: 8 }}>🚗</div>
      <h1>ILYAS <em>AUTO</em></h1>
      <p>{CONFIG.slogan}<br/>Le site vitrine arrive très bientôt — contactez-nous dès maintenant sur WhatsApp.</p>
      <a href={waLink('Bonjour ILYAS AUTO, je vous contacte depuis votre site web.')} target="_blank" rel="noreferrer">
        💬 Nous contacter sur WhatsApp
      </a>
      <a href="#admin" className="admin-link">Espace Admin</a>
    </div>
  )
}
