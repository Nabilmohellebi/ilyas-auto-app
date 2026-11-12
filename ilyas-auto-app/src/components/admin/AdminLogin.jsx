import { useState } from 'react'

export default function AdminLogin({ onLogin, error }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event?.preventDefault()
    if (!email.trim() || !pw || submitting) return
    setSubmitting(true)
    try {
      await onLogin(email, pw)
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

        <label className="login-label" htmlFor="admin-email">Adresse e-mail</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          placeholder="admin@hbrauto.dz"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoFocus
          required
        />
        <label className="login-label" htmlFor="admin-password">Mot de passe</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={pw}
          onChange={event => setPw(event.target.value)}
          required
        />
        <button type="submit" disabled={submitting || !email.trim() || !pw}>{submitting ? 'Connexion…' : 'Connexion →'}</button>
      </form>
    </div>
  )
}
