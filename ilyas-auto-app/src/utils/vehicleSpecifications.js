const TECHNICAL_ORDER = [
  'moteur', 'architecture', 'cylindree', 'puissance', 'couple',
  'transmission', 'traction', 'carburant', 'consommation', 'co2',
  'batterie', 'autonomie', 'recharge', 'vitesse', 'acceleration',
  'dimensions', 'empattement', 'portes', 'places', 'coffre', 'poids',
]

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
}

function cleanListLine(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\s*(?:(?:[-*•✓✔▪◦])|(?:\d+[.)]))\s*/, '')
    .trim()
}

function uniqueByLabel(items, getLabel) {
  const seen = new Set()
  return items.filter(item => {
    const label = normalizeKey(getLabel(item))
    if (!label || seen.has(label)) return false
    seen.add(label)
    return true
  })
}

/** One equipment item per line. Bullets and numbering from copied lists are accepted. */
export function parseEquipmentLines(text) {
  const items = String(text ?? '')
    .split(/\r?\n/)
    .map(cleanListLine)
    .filter(Boolean)
  return uniqueByLabel(items, item => item)
}

/** Sort equipment alphabetically, ignoring accents and duplicate spellings. */
export function sortEquipment(items = []) {
  const clean = uniqueByLabel(
    (Array.isArray(items) ? items : []).map(cleanListLine).filter(Boolean),
    item => item,
  )
  return clean.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }))
}

/**
 * Expected format: "Label : Value" (also accepts =, tab, or spaced dash).
 * Example: "Puissance : 150 ch".
 */
export function parseTechnicalSpecLines(text) {
  const rows = String(text ?? '').split(/\r?\n/).map(cleanListLine).filter(Boolean)
  const parsed = []
  for (const line of rows) {
    const match = line.match(/^(.+?)\s*(?::|=|：|\t+|\s+[–—-]\s+)\s*(.+)$/)
    if (!match) continue
    const label = match[1].trim()
    const value = match[2].trim()
    if (label && value) parsed.push({ label, value })
  }
  return uniqueByLabel(parsed, item => item.label)
}

/** Keep one row per characteristic; pasted rows update a matching existing label. */
export function mergeTechnicalSpecs(existing = [], incoming = []) {
  const byLabel = new Map()
  for (const item of Array.isArray(existing) ? existing : []) {
    if (item?.label?.trim() && item?.value?.trim()) {
      byLabel.set(normalizeKey(item.label), { label: item.label.trim(), value: item.value.trim() })
    }
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (item?.label?.trim() && item?.value?.trim()) {
      byLabel.set(normalizeKey(item.label), { label: item.label.trim(), value: item.value.trim() })
    }
  }
  return sortTechnicalSpecs([...byLabel.values()])
}

/** Put common vehicle data in a familiar order; custom rows follow alphabetically. */
export function sortTechnicalSpecs(items = []) {
  const clean = (Array.isArray(items) ? items : []).filter(item => item?.label?.trim() && item?.value?.trim())
  const priority = label => {
    const key = normalizeKey(label)
    const index = TECHNICAL_ORDER.findIndex(term => key === term || key.startsWith(term + ' ') || key.startsWith(term + '('))
    return index < 0 ? TECHNICAL_ORDER.length : index
  }
  return [...clean].sort((a, b) =>
    priority(a.label) - priority(b.label) ||
    a.label.localeCompare(b.label, 'fr', { sensitivity: 'base', numeric: true })
  )
}
