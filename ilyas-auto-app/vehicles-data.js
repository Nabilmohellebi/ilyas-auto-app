// ══════════════════════════════════════════════
//  DONNÉES VÉHICULES — Marques, provenances, drapeaux
// ══════════════════════════════════════════════

export const BRANDS = [
  'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Renault', 'Peugeot',
  'Citroën', 'Toyota', 'Hyundai', 'Kia', 'Fiat', 'Seat', 'Skoda',
  'Porsche', 'Range Rover', 'Land Rover', 'Volvo', 'Ford', 'Opel',
  'Nissan', 'Mazda', 'Chevrolet', 'Jeep', 'Mini', 'Suzuki', 'Dacia',
]

export const TRANSMISSIONS = ['Automatique', 'Manuelle']
export const FUELS = ['Diesel', 'Essence', 'Hybride', 'GPL', 'Électrique']
export const BADGES = ['', '⚡ Nouveau', '🔥 Coup de cœur', '⭐ Best-seller', '💎 Premium', '🎯 Prix cassé']
export const STATUTS = [
  { key: 'disponible', label: '✅ Disponible',  color: '#22c55e' },
  { key: 'reserve',    label: '⏳ Réservé',      color: '#f59e0b' },
  { key: 'vendu',      label: '🚫 Vendu',        color: '#6b7280' },
]

const FLAG_SVG = {
  france:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="3" height="6" fill="#002395"/><rect x="3" width="3" height="6" fill="#fff"/><rect x="6" width="3" height="6" fill="#ED2939"/></svg>',
  allemagne: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="2" fill="#000"/><rect y="2" width="9" height="2" fill="#DD0000"/><rect y="4" width="9" height="2" fill="#FFCE00"/></svg>',
  italie:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="3" height="6" fill="#009246"/><rect x="3" width="3" height="6" fill="#fff"/><rect x="6" width="3" height="6" fill="#CE2B37"/></svg>',
  usa:       '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#B22234"/><g fill="#fff"><rect y=".9" width="9" height=".85"/><rect y="2.6" width="9" height=".85"/><rect y="4.3" width="9" height=".85"/></g><rect width="4" height="3" fill="#3C3B6E"/></svg>',
  emirats:   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="2" fill="#00732F"/><rect y="2" width="9" height="2" fill="#fff"/><rect y="4" width="9" height="2" fill="#000"/><rect width="3" height="6" fill="#FF0000"/></svg>',
  monde:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#1e293b"/><circle cx="4.5" cy="3" r="2.3" fill="none" stroke="#94a3b8" stroke-width=".5"/><path d="M2.2 3h4.6M4.5.7c1.6 1.5 1.6 3.1 0 4.6M4.5.7c-1.6 1.5-1.6 3.1 0 4.6" stroke="#94a3b8" stroke-width=".4" fill="none"/></svg>',
}

export const ORIGINS = {
  france:    { label: 'France' },
  allemagne: { label: 'Allemagne' },
  italie:    { label: 'Italie' },
  usa:       { label: 'États-Unis' },
  emirats:   { label: 'Émirats (UAE)' },
  monde:     { label: 'Autre / Monde' },
}

export function flagURI(key) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(FLAG_SVG[key] || FLAG_SVG.monde)
}

export const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="#1f2937"/><path d="M80 160c12-32 42-52 82-52h56c42 0 72 20 92 52z" fill="#374151"/><circle cx="132" cy="168" r="20" fill="#4b5563"/><circle cx="278" cy="168" r="20" fill="#4b5563"/><text x="200" y="218" fill="#9ca3af" font-family="sans-serif" font-size="16" text-anchor="middle">Photo à venir</text></svg>'
)
