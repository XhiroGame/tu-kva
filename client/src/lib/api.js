import { supabase } from './supabase'

/**
 * API client for communicating with the BEER MUSIC backend.
 * All music searches and queue mutations go through the backend
 * to protect API keys and enforce rate limiting.
 */

/**
 * Detecta la URL base del backend dinámicamente.
 * En producción (Vercel) utiliza VITE_API_BASE_URL (Render).
 * En desarrollo local si se abre por IP de Wi-Fi, utiliza el puerto 3001.
 */
function getApiBaseUrl() {
  // 1. En producción o si está configurada la variable en Vercel / .env, usarla siempre
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '')
  }

  // 2. Fallback para desarrollo local por IP de red Wi-Fi (ej: 192.168.1.6)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname
    const protocol = window.location.protocol || 'http:'
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:3001`
    }
  }

  return 'http://localhost:3001'
}

const API_BASE_URL = getApiBaseUrl()

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  // Attach Supabase Auth JWT token if logged in (admin / player routes)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      defaultHeaders['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch {
    // Public client without session
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    // Si la sesión expiró en rutas protegidas, cerrar sesión limpiamente para redirigir a /admin/login
    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/player'))
    ) {
      supabase.auth.signOut().catch(() => {})
    }

    const error = new Error(data.message || 'API Error')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

// ---- Songs API ----

/**
 * Search songs by query term via backend (keeps API key private).
 * @param {string} query - Search term (title, artist, genre)
 * @param {object} options - { limit, offset, signal }
 */
export const searchSongs = (query, options = {}) =>
  apiFetch(
    `/songs/search?q=${encodeURIComponent(query)}&limit=${options.limit || 15}&offset=${options.offset || 0}`,
    { signal: options.signal }
  )

/**
 * Obtener canciones más sonadas del bar / ambiente inteligente
 * @param {string} businessSlug
 * @param {string[]} excludeIds - IDs de canciones recientes a evitar repetir
 */
export const getSmartFallback = (businessSlug, excludeIds = []) => {
  const excludeQuery =
    excludeIds.length > 0 ? `?exclude=${encodeURIComponent(excludeIds.join(','))}` : ''
  return apiFetch(`/songs/smart-fallback/${businessSlug}${excludeQuery}`)
}

// ---- Queue API ----

/**
 * Add a song to the playlist queue.
 * @param {object} payload - { businessId, tableId, song }
 */
export const addToQueue = (payload) =>
  apiFetch('/queue', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

/**
 * Get the current queue for a business.
 * @param {string} businessSlug
 */
export const getQueue = (businessSlug) =>
  apiFetch(`/queue/${businessSlug}`)

/**
 * Update a queue item (admin only: status, position).
 * @param {string} itemId
 * @param {object} updates
 */
export const updateQueueItem = (itemId, updates) =>
  apiFetch(`/queue/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

/**
 * Remove an item from the queue (admin only).
 * @param {string} itemId
 */
export const removeFromQueue = (itemId) =>
  apiFetch(`/queue/${itemId}`, { method: 'DELETE' })

/**
 * Clear the entire queue (admin only).
 * @param {string} businessSlug
 */
export const clearQueue = (businessSlug) =>
  apiFetch(`/queue/${businessSlug}/clear`, { method: 'DELETE' })

// ---- Tables API ----

/**
 * Get all tables for a business (admin only).
 * @param {string} businessSlug
 */
export const getTables = (businessSlug) =>
  apiFetch(`/tables/${businessSlug}`)

/**
 * Validate a QR token and return table info.
 * @param {string} qrToken
 */
export const validateTable = (qrToken) =>
  apiFetch(`/tables/validate/${qrToken}`)

/**
 * Create a new table and generate its QR code (admin only).
 * @param {object} payload - { businessId, tableName }
 */
export const createTable = (payload) =>
  apiFetch('/tables', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

/**
 * Delete a table (admin only).
 * @param {string} tableId
 */
export const deleteTable = (tableId) =>
  apiFetch(`/tables/${tableId}`, {
    method: 'DELETE',
  })

// ---- Admin API ----

/**
 * Reporta un video bloqueado por derechos (error 101/150/100) a la lista negra del servidor
 */
export const reportBlockedSong = (providerSongId, errorCode) =>
  apiFetch('/songs/report-blocked', {
    method: 'POST',
    body: JSON.stringify({ provider_song_id: providerSongId, errorCode }),
  })

/**
 * Get play history for a business (admin only).
 * @param {string} businessSlug
 * @param {object} options - { limit, offset }
 */
export const getHistory = (businessSlug, options = {}) =>
  apiFetch(`/admin/${businessSlug}/history?limit=${options.limit || 50}&offset=${options.offset || 0}`)

/**
 * Get dashboard stats for a business (admin only).
 * @param {string} businessSlug
 */
export const getAdminStats = (businessSlug) =>
  apiFetch(`/admin/${businessSlug}/stats`)

export default apiFetch
