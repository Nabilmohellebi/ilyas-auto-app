import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import CONFIG from './config'
import { fr, ar } from './translations'
import './global.css'

// ── Components (à adapter selon ta structure réelle) ──
// Tu dois importer tes vrais composants ici :
// import PublicPage from './components/PublicPage'
// import AdminLogin from './components/AdminLogin'
// import AdminPanel from './components/AdminPanel'

function App() {
  // ═══════════════════════════════════════════════════════
  // FIX #1 : Lit le hash au démarrage — plus besoin de refresh !
  // ═══════════════════════════════════════════════════════
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '').trim()
    return hash === 'admin' ? 'admin' : 'public'
  }

  const [view, setView] = useState(getInitialView)
  const [adminAuth, setAdminAuth] = useState(false)
  const [lang, setLang] = useState('fr')

  const t = lang === 'ar' ? ar : fr

  // ═══════════════════════════════════════════════════════
  // FIX #2 : Écoute les changements de hash en temps réel
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim()
      setView(hash === 'admin' ? 'admin' : 'public')
    }
    window.addEventListener('hashchange', handleHashChange)
    // Vérifie aussi au cas où le hash serait déjà présent au mount
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // ── Admin password check ──
  const checkAdminPassword = async (pwd) => {
    const envPwd = import.meta.env.VITE_ADMIN_PASSWORD
    // Vérifie d'abord le mot de passe en dur dans .env
    if (envPwd && pwd === envPwd) {
      setAdminAuth(true)
      return true
    }
    // Sinon vérifie dans Supabase settings
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'admin_password')
        .single()
      if (data?.value && pwd === data.value) {
        setAdminAuth(true)
        return true
      }
    } catch (e) { console.error(e) }
    return false
  }

  // ═══════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════

  // ── Page Admin ──
  if (view === 'admin') {
    if (!adminAuth) {
      return <AdminLogin onLogin={checkAdminPassword} t={t} />
    }
    return <AdminPanel t={t} lang={lang} setLang={setLang} onLogout={() => setAdminAuth(false)} />
  }

  // ── Site Public ──
  return <PublicPage t={t} lang={lang} setLang={setLang} config={CONFIG} />
}

// ═══════════════════════════════════════════════════════
// PLACEHOLDERS — Remplace par tes vrais composants
// ═══════════════════════════════════════════════════════

function AdminLogin({ onLogin, t }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await onLogin(pwd)
    if (!ok) setError(t.login?.erreur || 'Mot de passe incorrect')
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ fontSize: 40 }}>🔐</div>
        <h1><em>HBR</em> Auto — Admin</h1>
        <p>Panel de gestion</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Mot de passe"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="login-hint">
          <a href="#/" style={{ color: 'var(--g5)' }}>← Retour au site</a>
        </div>
      </div>
    </div>
  )
}

function AdminPanel({ t, lang, setLang, onLogout }) {
  const [tab, setTab] = useState('vehicles')
  return (
    <div className="adm">
      <div className="adm-top">
        <div className="adm-logo">🚗 <em>HBR</em> Auto</div>
        <span className="adm-badge">ADMIN</span>
        <div className="adm-tabs">
          <button className={`adm-tab ${tab==='vehicles'?'active':''}`} onClick={()=>setTab('vehicles')}>Véhicules</button>
          <button className={`adm-tab ${tab==='reservations'?'active':''}`} onClick={()=>setTab('reservations')}>Réservations</button>
          <button className={`adm-tab ${tab==='settings'?'active':''}`} onClick={()=>setTab('settings')}>Paramètres</button>
        </div>
        <button className="adm-logout" onClick={onLogout}>Déconnexion</button>
      </div>
      <div className="adm-body">
        <p style={{ color: 'var(--g4)' }}>Panel admin — intègre tes vrais composants ici.</p>
      </div>
    </div>
  )
}

function PublicPage({ t, lang, setLang, config }) {
  return (
    <div className="public-placeholder">
      <h1><em>HBR</em> Auto</h1>
      <p>{config.slogan}</p>
      <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer">
        💬 Contactez-nous sur WhatsApp
      </a>
      <a href="#/admin" className="admin-link">Panel admin</a>
      <button
        onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
        style={{ marginTop: 20, background: 'none', border: '1px solid var(--brd)', color: 'var(--g4)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
      >
        {lang === 'fr' ? 'العربية' : 'Français'}
      </button>
    </div>
  )
}
