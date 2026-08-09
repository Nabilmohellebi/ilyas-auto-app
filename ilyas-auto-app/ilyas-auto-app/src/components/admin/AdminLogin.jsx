import { useState } from 'react'

export default function AdminLogin({ onLogin, error }) {
  const [pw, setPw] = useState('')

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ fontSize: 48 }}>🚗</div>
        <h1>ILYAS <em>AUTO</em></h1>
        <p>Espace administrateur — Gestion du showroom</p>

        {error && <div className="login-error">❌ Mot de passe incorrect.</div>}

        <input
          type="password"
          placeholder="Mot de passe"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin(pw)}
          autoFocus
        />
        <button onClick={() => onLogin(pw)}>Connexion →</button>

        <div className="login-hint">
          💡 Mot de passe par défaut : <strong>ilyas2026</strong><br/>
          (à changer dans Paramètres une fois connecté)
        </div>
      </div>
    </div>
  )
}
