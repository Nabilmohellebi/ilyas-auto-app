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
export const BODY_TYPES = ['Berline', 'SUV', 'Citadine', 'Coupé', 'Break', 'Monospace', 'Pick-up', 'Cabriolet']
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
  chine:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#DE2910"/><g fill="#FFDE00"><path d="M1.7.55l.28.86h.9l-.73.53.28.86-.73-.53-.73.53.28-.86-.73-.53h.9z"/><path d="M3.8.3l.1.3.32-.1-.22.23.2.25-.31-.12-.2.25.02-.33-.3-.14.32-.08zM4.5 1.05l.1.3.32-.1-.22.23.2.25-.31-.12-.2.25.02-.33-.3-.14.32-.08zM4.5 2l.1.3.32-.1-.22.23.2.25-.31-.12-.2.25.02-.33-.3-.14.32-.08zM3.8 2.75l.1.3.32-.1-.22.23.2.25-.31-.12-.2.25.02-.33-.3-.14.32-.08z"/></g></svg>',
  coree_sud: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#fff"/><path d="M4.5 1.5a1.5 1.5 0 0 1 0 3 0.75 0.75 0 0 0 0-1.5 0.75 0.75 0 0 1 0-1.5" fill="#CD2E3A"/><path d="M4.5 4.5a1.5 1.5 0 0 1 0-3 .75.75 0 0 0 0 1.5.75.75 0 0 1 0 1.5" fill="#0047A0"/><g stroke="#111" stroke-width=".22"><path d="M.9.7h1.4m-1.4.35h1.4m-1.4.35h1.4M6.7 4.6h1.4m-1.4.35h1.4m-1.4.35h1.4M6.7.7h1.4m-1.4.35h.55m.3 0h.55m-1.4.35h1.4M.9 4.6h.55m.3 0h.55m-1.4.35h1.4m-1.4.35h1.4"/></g></svg>',
  japon:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#fff"/><circle cx="4.5" cy="3" r="1.65" fill="#BC002D"/></svg>',
  monde:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#1e293b"/><circle cx="4.5" cy="3" r="2.3" fill="none" stroke="#94a3b8" stroke-width=".5"/><path d="M2.2 3h4.6M4.5.7c1.6 1.5 1.6 3.1 0 4.6M4.5.7c-1.6 1.5-1.6 3.1 0 4.6" stroke="#94a3b8" stroke-width=".4" fill="none"/></svg>',
}

export const ORIGINS = {
  france:    { label: 'France' },
  allemagne: { label: 'Allemagne' },
  italie:    { label: 'Italie' },
  usa:       { label: 'États-Unis' },
  emirats:   { label: 'Émirats (UAE)' },
  chine:     { label: 'Chine' },
  coree_sud: { label: 'Corée du Sud' },
  japon:     { label: 'Japon' },
  monde:     { label: 'Autre / Monde' },
}

export function flagURI(key) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(FLAG_SVG[key] || FLAG_SVG.monde)
}

export const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="#1f2937"/><path d="M80 160c12-32 42-52 82-52h56c42 0 72 20 92 52z" fill="#374151"/><circle cx="132" cy="168" r="20" fill="#4b5563"/><circle cx="278" cy="168" r="20" fill="#4b5563"/><text x="200" y="218" fill="#9ca3af" font-family="sans-serif" font-size="16" text-anchor="middle">Photo à venir</text></svg>'
)
