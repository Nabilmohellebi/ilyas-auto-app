import { createCipheriv, createHash, randomBytes } from 'node:crypto'

// Vercel serverless function: rename the customer project from the admin settings.
// The Vercel API token is read server-side only and is never returned to the browser.

function json(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(payload)
}

function slugifyProjectName(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42)
    .replace(/-+$/g, '')
  return slug.length >= 3 ? slug : 'garage-auto'
}

function teamQuery(teamId) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''
}

async function vercelRequest(path, token, options = {}) {
  const response = await fetch(`https://api.vercel.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

function projectDomain(project, requestedDomain) {
  const domains = Array.isArray(project?.domains) ? project.domains : []
  const exact = domains.find(item => (typeof item === 'string' ? item : item?.name) === requestedDomain)
  return exact ? requestedDomain : null
}

async function assignDomainToLatestProduction(projectId, domain, token, teamId) {
  const params = new URLSearchParams({
    projectId,
    target: 'production',
    limit: '1',
  })
  if (teamId) params.set('teamId', teamId)

  const deployments = await vercelRequest(`/v6/deployments?${params.toString()}`, token)
  const deployment = deployments.payload?.deployments?.[0]
  const deploymentId = deployment?.uid || deployment?.id

  if (!deployments.response.ok || !deploymentId) {
    return { ok: false, error: 'Aucun déploiement de production prêt n’a été trouvé pour ce projet.' }
  }

  const aliasPath = `/v2/deployments/${encodeURIComponent(deploymentId)}/aliases${teamQuery(teamId)}`
  const assigned = await vercelRequest(aliasPath, token, {
    method: 'POST',
    body: JSON.stringify({ alias: domain }),
  })

  if (assigned.response.ok && assigned.payload?.alias === domain) {
    return { ok: true, deploymentId }
  }

  // L’alias peut déjà être affecté au bon déploiement. On vérifie avant de déclarer un échec.
  const existing = await vercelRequest(`/v4/aliases/${encodeURIComponent(domain)}${teamQuery(teamId)}`, token)
  const existingDeploymentId = existing.payload?.deploymentId || existing.payload?.deployment?.id
  if (existing.response.ok && existingDeploymentId === deploymentId) {
    return { ok: true, deploymentId }
  }

  return {
    ok: false,
    error: 'Le domaine est enregistré, mais Vercel n’a pas confirmé son association au dernier déploiement de production.',
  }
}

async function listAttachedProjectDomains(projectId, token, teamId) {
  const params = new URLSearchParams({ limit: '100' })
  if (teamId) params.set('teamId', teamId)
  const listed = await vercelRequest(
    '/v9/projects/' + encodeURIComponent(projectId) + '/domains?' + params.toString(),
    token,
  )
  if (!listed.response.ok) return []
  const domains = Array.isArray(listed.payload?.domains) ? listed.payload.domains : []
  return domains
    .map(item => typeof item === 'string' ? item : item?.name)
    .filter(domain => typeof domain === 'string' && domain.length > 0)
}

function createDomainHandoffToken(claims, secret) {
  const key = createHash('sha256')
    .update('garage-domain-handoff:v1:')
    .update(secret)
    .digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(claims), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' })

  const origin = req.headers.origin
  const host = req.headers.host
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return json(res, 403, { error: 'Origine non autorisée.' })
    } catch {
      return json(res, 403, { error: 'Origine non autorisée.' })
    }
  }

  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return json(res, 415, { error: 'Format de requête invalide.' })
  }

  const body = req.body || {}
  if (typeof body.shopName !== 'string' || body.shopName.trim().length < 2 || body.shopName.length > 100) {
    return json(res, 400, { error: 'Le nom du garage doit contenir entre 2 et 100 caractères.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const vercelToken = process.env.VERCEL_RENAME_TOKEN
  const projectId = process.env.VERCEL_RENAME_PROJECT_ID
  const teamId = process.env.VERCEL_RENAME_TEAM_ID
  const adminSession = String(req.headers['x-hbr-admin-session'] || '')

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(res, 503, { code: 'SUPABASE_SERVER_CONFIG_MISSING', error: 'La validation de la session admin n’est pas configurée côté serveur.' })
  }

  if (!adminSession || adminSession.length < 32 || adminSession.length > 128) {
    return json(res, 401, { error: 'Session administrateur manquante.' })
  }

  try {
    const sessionResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/admin_check_session`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'x-hbr-admin-session': adminSession,
      },
      body: '{}',
    })

    if (!sessionResponse.ok || await sessionResponse.json().catch(() => false) !== true) {
      return json(res, 401, { error: 'Session administrateur invalide ou expirée.' })
    }
  } catch {
    return json(res, 503, { error: 'Impossible de vérifier la session administrateur.' })
  }

  if (!vercelToken || !projectId) {
    return json(res, 503, {
      code: 'VERCEL_RENAME_NOT_CONFIGURED',
      error: 'Le changement automatique du domaine n’est pas encore configuré sur ce projet.',
    })
  }

  const query = teamQuery(teamId)
  const projectPath = `/v9/projects/${encodeURIComponent(projectId)}${query}`
  const desiredSlug = slugifyProjectName(body.shopName)
  const desiredDomain = `${desiredSlug}.vercel.app`

  try {
    const current = await vercelRequest(projectPath, vercelToken)
    if (!current.response.ok) {
      return json(res, current.response.status, {
        error: 'Vercel ne reconnaît pas le projet configuré. Vérifie VERCEL_RENAME_PROJECT_ID et VERCEL_RENAME_TEAM_ID.',
      })
    }

    const currentName = current.payload?.name || ''
    const currentDomain = projectDomain(current.payload, desiredDomain)

    if (currentName !== desiredSlug) {
      const rename = await vercelRequest(projectPath, vercelToken, {
        method: 'PATCH',
        body: JSON.stringify({ name: desiredSlug }),
      })

      if (!rename.response.ok) {
        const message = rename.response.status === 409
          ? 'Ce nom de projet est déjà utilisé dans ce compte Vercel. Essaie un nom légèrement différent.'
          : 'Vercel a refusé le changement de nom du projet.'
        return json(res, rename.response.status, { error: message })
      }
    }

    let activeDomain = currentDomain

    if (activeDomain !== desiredDomain) {
      const addPath = `/v10/projects/${encodeURIComponent(projectId)}/domains${query}`
      const add = await vercelRequest(addPath, vercelToken, {
        method: 'POST',
        body: JSON.stringify({ name: desiredDomain }),
      })

      if (add.response.ok && add.payload?.verified !== false) {
        activeDomain = add.payload?.name || desiredDomain
      } else {
        // Les noms *.vercel.app sont globaux. En cas de collision, essaie une variante
        // déterministe liée à l'ID du projet plutôt que d'écraser un domaine existant.
        const suffix = String(projectId).replace(/[^a-z0-9]/gi, '').slice(-5).toLowerCase()
        const fallbackSlug = `${desiredSlug.slice(0, 35)}-${suffix}`
        const fallbackDomain = `${fallbackSlug}.vercel.app`
        const fallbackRename = await vercelRequest(projectPath, vercelToken, {
          method: 'PATCH',
          body: JSON.stringify({ name: fallbackSlug }),
        })

        if (fallbackRename.response.ok) {
          const fallbackAdd = await vercelRequest(addPath, vercelToken, {
            method: 'POST',
            body: JSON.stringify({ name: fallbackDomain }),
          })
          if (fallbackAdd.response.ok && fallbackAdd.payload?.verified !== false) {
            activeDomain = fallbackAdd.payload?.name || fallbackDomain
          }
        }

        if (!activeDomain) {
          const refreshed = await vercelRequest(projectPath, vercelToken)
          activeDomain = projectDomain(refreshed.payload, fallbackDomain)
        }
      }
    }

    if (!activeDomain) {
      return json(res, 502, {
        code: 'PROJECT_RENAMED_DOMAIN_PENDING',
        error: 'Le projet a été renommé, mais Vercel n’a pas confirmé son nouveau domaine. Réessaie depuis les paramètres.',
      })
    }

    // L’ajout d’un domaine au projet ne suffit pas toujours à l’attacher au déploiement
    // déjà en production. On l’assigne explicitement au dernier déploiement de production.
    const alias = await assignDomainToLatestProduction(projectId, activeDomain, vercelToken, teamId)
    if (!alias.ok) {
      return json(res, 502, {
        code: 'PROJECT_RENAMED_ALIAS_PENDING',
        domain: activeDomain,
        error: alias.error,
      })
    }

    // Prépare un transfert chiffré de la session admin vers le nouveau domaine.
    // Les anciens domaines sont limités aux domaines .vercel.app explicitement liés à ce projet.
    const previousDomains = new Set(await listAttachedProjectDomains(projectId, vercelToken, teamId))
    if (currentName && currentName !== activeDomain.replace(/\.vercel\.app$/, '')) {
      previousDomains.add(currentName + '.vercel.app')
    }
    const cleanupDomains = [...previousDomains].filter(domain =>
      /^[a-z0-9-]+\.vercel\.app$/i.test(domain) && domain !== activeDomain
    )
    const issuedAt = Date.now()
    const handoffToken = createDomainHandoffToken({
      version: 1,
      projectId,
      teamId: teamId || null,
      newDomain: activeDomain,
      previousDomains: cleanupDomains,
      adminSession,
      issuedAt,
      expiresAt: issuedAt + (10 * 60 * 1000),
    }, vercelToken)

    return json(res, 200, {
      ok: true,
      projectName: activeDomain.replace(/\.vercel\.app$/, ''),
      domain: activeDomain,
      url: 'https://' + activeDomain,
      handoffToken,
      previousDomainCleanupScheduled: cleanupDomains.length > 0,
    })
  } catch (error) {
    console.error('Vercel project rename failed:', error)
    return json(res, 502, { error: 'Service Vercel temporairement indisponible. Le nom commercial reste bien enregistré.' })
  }
}
