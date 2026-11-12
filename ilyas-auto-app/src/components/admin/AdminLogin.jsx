import { useState } from 'react'

export default function AdminLogin({ onLogin, error }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event?.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    try {
      await onLogin(password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <div style={{ fontSize: 48 }}>🚗</div>
        <h1>HBR <em>AUTO</em></h1>
        <p>Espace administrateur — Gestion du showroom</p>

        {error && <div className="login-error" role="alert">❌ {error}</div>}

        <label className="login-label" htmlFor="admin-password">Mot de passe administrateur</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Saisis ton mot de passe"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoFocus
          required
        />
        <button type="submit" disabled={submitting || !password}>
          {submitting ? 'Connexion…' : 'Connexion →'}
        </button>
      </form>
    </div>
  )
}
