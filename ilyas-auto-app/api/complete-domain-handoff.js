import { createDecipheriv, createHash } from 'node:crypto'

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return res.status(status).json(payload)
}

function teamQuery(teamId) {
  return teamId ? '?teamId=' + encodeURIComponent(teamId) : ''
}

function decryptDomainHandoffToken(token, secret) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3 || parts.some(part => !part)) throw new Error('Jeton de transfert invalide.')

  const key = createHash('sha256')
    .update('garage-domain-handoff:v1:')
    .update(secret)
    .digest()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'base64url'))
  decipher.setAuthTag(Buffer.from(parts[2], 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parts[1], 'base64url')),
    decipher.final(),
  ]).toString('utf8')
  return JSON.parse(decrypted)
}

async function vercelRequest(path, token, options = {}) {
  const response = await fetch('https://api.vercel.com' + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

async function validateAdminSession(supabaseUrl, supabaseAnonKey, adminSession) {
  const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/admin_check_session', {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + supabaseAnonKey,
      'Content-Type': 'application/json',
      'x-hbr-admin-session': adminSession,
    },
    body: '{}',
  })
  return response.ok && await response.json().catch(() => false) === true
}

async function removePreviousDomain(domain, projectId, teamId, vercelToken) {
  const warnings = []
  const query = new URLSearchParams({ domain, projectId })
  if (teamId) query.set('teamId', teamId)

  // Les alias de déploiement doivent être retirés avant le domaine du projet.
  const listed = await vercelRequest('/v4/aliases?' + query.toString(), vercelToken)
  if (listed.response.ok) {
    const aliases = Array.isArray(listed.payload?.aliases) ? listed.payload.aliases : []
    for (const alias of aliases) {
      if (alias?.alias !== domain) continue
      const aliasId = alias.uid || alias.id || alias.alias
      const removedAlias = await vercelRequest(
        '/v2/aliases/' + encodeURIComponent(aliasId) + teamQuery(teamId),
        vercelToken,
        { method: 'DELETE' },
      )
      if (!removedAlias.response.ok && removedAlias.response.status !== 404) {
        warnings.push(domain + ' : alias de déploiement non supprimé.')
      }
    }
  } else if (listed.response.status !== 404) {
    warnings.push(domain + ' : impossible de vérifier les alias associés.')
  }

  const domainPath = '/v9/projects/' + encodeURIComponent(projectId) +
    '/domains/' + encodeURIComponent(domain) + teamQuery(teamId)
  let removedDomain = await vercelRequest(domainPath, vercelToken, { method: 'DELETE' })

  // Vercel peut encore signaler un conflit d'alias ; on refait une passe ciblée avant de réessayer.
  if (removedDomain.response.status === 409) {
    const retryList = await vercelRequest('/v4/aliases?' + query.toString(), vercelToken)
    const retryAliases = Array.isArray(retryList.payload?.aliases) ? retryList.payload.aliases : []
    for (const alias of retryAliases) {
      if (alias?.alias !== domain) continue
      const aliasId = alias.uid || alias.id || alias.alias
      await vercelRequest(
        '/v2/aliases/' + encodeURIComponent(aliasId) + teamQuery(teamId),
        vercelToken,
        { method: 'DELETE' },
      )
    }
    removedDomain = await vercelRequest(domainPath, vercelToken, { method: 'DELETE' })
  }

  if (removedDomain.response.ok || removedDomain.response.status === 404) {
    return { removed: true, warnings }
  }

  warnings.push(domain + ' : Vercel a refusé la suppression du domaine.')
  return { removed: false, warnings }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' })

  const requestHost = String(req.headers.host || '').split(':')[0].toLowerCase()
  const origin = req.headers.origin
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== requestHost) {
        return json(res, 403, { error: 'Origine non autorisée.' })
      }
    } catch {
      return json(res, 403, { error: 'Origine non autorisée.' })
    }
  }

  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return json(res, 415, { error: 'Format de requête invalide.' })
  }

  const token = typeof req.body?.token === 'string' ? req.body.token : ''
  if (!token || token.length > 12000) {
    return json(res, 400, { error: 'Jeton de transfert manquant ou invalide.' })
  }

  const vercelToken = process.env.VERCEL_RENAME_TOKEN
  const projectId = process.env.VERCEL_RENAME_PROJECT_ID
  const teamId = process.env.VERCEL_RENAME_TEAM_ID || null
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!vercelToken || !projectId || !supabaseUrl || !supabaseAnonKey) {
    return json(res, 503, { error: 'La configuration serveur du transfert de domaine est incomplète.' })
  }

  let claims
  try {
    claims = decryptDomainHandoffToken(token, vercelToken)
  } catch {
    return json(res, 401, { error: 'Le transfert de domaine est invalide ou a expiré.' })
  }

  const now = Date.now()
  if (
    claims?.version !== 1 ||
    claims.projectId !== projectId ||
    (claims.teamId || null) !== teamId ||
    claims.newDomain !== requestHost ||
    !Number.isFinite(claims.issuedAt) ||
    !Number.isFinite(claims.expiresAt) ||
    claims.issuedAt > now + 30000 ||
    claims.expiresAt <= now ||
    claims.expiresAt - claims.issuedAt > 10 * 60 * 1000 ||
    typeof claims.adminSession !== 'string' ||
    claims.adminSession.length < 32 ||
    claims.adminSession.length > 128
  ) {
    return json(res, 401, { error: 'Le transfert de domaine est invalide ou a expiré.' })
  }

  try {
    const validSession = await validateAdminSession(supabaseUrl, supabaseAnonKey, claims.adminSession)
    if (!validSession) {
      return json(res, 401, { error: 'La session administrateur a expiré. Reconnecte-toi.' })
    }
  } catch {
    return json(res, 503, { error: 'Impossible de vérifier la session administrateur.' })
  }

  const candidates = Array.isArray(claims.previousDomains) ? claims.previousDomains : []
  const previousDomains = [...new Set(candidates)].filter(domain =>
    typeof domain === 'string' &&
    /^[a-z0-9-]+\.vercel\.app$/i.test(domain) &&
    domain !== claims.newDomain
  ).slice(0, 20)

  const removedDomains = []
  const warnings = []
  for (const domain of previousDomains) {
    try {
      const result = await removePreviousDomain(domain, projectId, teamId, vercelToken)
      warnings.push(...result.warnings)
      if (result.removed) removedDomains.push(domain)
    } catch {
      warnings.push(domain + ' : erreur temporaire pendant la suppression.')
    }
  }

  return json(res, 200, {
    ok: true,
    adminSession: claims.adminSession,
    newDomain: claims.newDomain,
    removedDomains,
    warnings,
  })
}
