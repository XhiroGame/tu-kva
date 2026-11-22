/**
 * CJ Systems — Motor de Personalización de Marca (Nombre, Logo, Subtítulo y Paleta de Colores)
 * Convierte cualquier color Hex o Preset elegido por el negocio en variables CSS RGB dinámicas
 * para que todas las clases Tailwind (bg-beer-500, text-gradient, shadow-beer, etc.)
 * cambien en vivo sin recargar la página.
 */

export const BRAND_COLOR_PRESETS = [
  {
    id: 'amber',
    name: 'Ámbar Cervecería (Clásico)',
    primaryColor: '#f59e0b',
    secondaryColor: '#f97316',
    preview: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  },
  {
    id: 'neon-pink',
    name: 'Rosa Neón / Discoteca',
    primaryColor: '#ec4899',
    secondaryColor: '#a855f7',
    preview: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
  },
  {
    id: 'emerald',
    name: 'Verde Esmeralda / Irish Pub',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    preview: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    id: 'electric-blue',
    name: 'Azul Eléctrico / Lounge',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    preview: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  },
  {
    id: 'crimson',
    name: 'Rojo Carmesí / Rock Bar',
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
    preview: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  {
    id: 'violet',
    name: 'Violeta Urbano / Gastrobar',
    primaryColor: '#8b5cf6',
    secondaryColor: '#6366f1',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  },
]

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '').trim()
  if (clean.length !== 6) return null
  const num = parseInt(clean, 16)
  if (isNaN(num)) return null
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function mixRgb(rgb1, rgb2, weight) {
  const w = Math.max(0, Math.min(1, weight))
  return [
    Math.round(rgb1[0] * (1 - w) + rgb2[0] * w),
    Math.round(rgb1[1] * (1 - w) + rgb2[1] * w),
    Math.round(rgb1[2] * (1 - w) + rgb2[2] * w),
  ]
}

function formatRgbVar(rgb) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`
}

/**
 * Aplica los colores de marca de un negocio al documento HTML en tiempo real
 */
export function applyBusinessTheme(branding = {}) {
  if (typeof document === 'undefined') return

  const primaryHex = branding?.primaryColor || '#f59e0b'
  const secondaryHex = branding?.secondaryColor || branding?.primaryColor || '#f97316'

  const baseRgb = hexToRgb(primaryHex) || [245, 158, 11]
  const accentRgb = hexToRgb(secondaryHex) || [249, 115, 22]
  const white = [255, 255, 255]
  const black = [0, 0, 0]

  const root = document.documentElement

  // Generar escala completa 50..950 mezclando con blanco y negro
  root.style.setProperty('--brand-50', formatRgbVar(mixRgb(baseRgb, white, 0.92)))
  root.style.setProperty('--brand-100', formatRgbVar(mixRgb(baseRgb, white, 0.82)))
  root.style.setProperty('--brand-200', formatRgbVar(mixRgb(baseRgb, white, 0.65)))
  root.style.setProperty('--brand-300', formatRgbVar(mixRgb(baseRgb, white, 0.42)))
  root.style.setProperty('--brand-400', formatRgbVar(mixRgb(baseRgb, white, 0.2)))
  root.style.setProperty('--brand-500', formatRgbVar(baseRgb))
  root.style.setProperty('--brand-600', formatRgbVar(mixRgb(baseRgb, black, 0.14)))
  root.style.setProperty('--brand-700', formatRgbVar(mixRgb(baseRgb, black, 0.3)))
  root.style.setProperty('--brand-800', formatRgbVar(mixRgb(baseRgb, black, 0.45)))
  root.style.setProperty('--brand-900', formatRgbVar(mixRgb(baseRgb, black, 0.58)))
  root.style.setProperty('--brand-950', formatRgbVar(mixRgb(baseRgb, black, 0.78)))

  root.style.setProperty('--brand-accent-400', formatRgbVar(mixRgb(accentRgb, white, 0.18)))
  root.style.setProperty('--brand-accent-500', formatRgbVar(accentRgb))
  root.style.setProperty('--brand-accent-600', formatRgbVar(mixRgb(accentRgb, black, 0.15)))
}
