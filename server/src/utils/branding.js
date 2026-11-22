import supabaseAdmin from '../config/supabase.js'

const BRAND_PROVIDER = 'cj_branding'

const DEFAULT_BRANDING = {
  subtitle: 'Cervecería & Música',
  logoUrl: '',
  primaryColor: '#f59e0b',
  secondaryColor: '#f97316',
  maxSongsPerWindow: 2,
  windowMinutes: 10,
}

// Caché en memoria para respuestas instantáneas
const brandingCache = new Map()

/**
 * Obtiene la configuración visual (logo, subtítulo, colores) y límites antimonopolio de un negocio por su ID
 */
export async function getBusinessBranding(businessId) {
  if (!businessId) return { ...DEFAULT_BRANDING }

  const cached = brandingCache.get(String(businessId))
  if (cached && Date.now() - cached.loadedAt < 60 * 1000) {
    return cached.data
  }

  try {
    const { data: row } = await supabaseAdmin
      .from('songs')
      .select('title, artist, thumbnail_url, stream_url')
      .eq('provider', BRAND_PROVIDER)
      .eq('provider_song_id', String(businessId))
      .maybeSingle()

    if (!row) {
      return { ...DEFAULT_BRANDING }
    }

    let parsedColors = {}
    try {
      parsedColors = row.stream_url ? JSON.parse(row.stream_url) : {}
    } catch {
      parsedColors = {}
    }

    const branding = {
      subtitle: row.artist || DEFAULT_BRANDING.subtitle,
      logoUrl: row.thumbnail_url || '',
      primaryColor: parsedColors.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: parsedColors.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      maxSongsPerWindow:
        Number.isFinite(Number(parsedColors.maxSongsPerWindow)) && Number(parsedColors.maxSongsPerWindow) >= 1
          ? Math.min(Math.max(parseInt(parsedColors.maxSongsPerWindow, 10), 1), 20)
          : DEFAULT_BRANDING.maxSongsPerWindow,
      windowMinutes:
        Number.isFinite(Number(parsedColors.windowMinutes)) && Number(parsedColors.windowMinutes) >= 1
          ? Math.min(Math.max(parseInt(parsedColors.windowMinutes, 10), 1), 180)
          : DEFAULT_BRANDING.windowMinutes,
    }

    brandingCache.set(String(businessId), { data: branding, loadedAt: Date.now() })
    return branding
  } catch (err) {
    console.warn('[Get Business Branding]', err.message)
    return { ...DEFAULT_BRANDING }
  }
}

/**
 * Guarda la personalización visual (nombre, subtítulo, logo, colores y límite de canciones) de un negocio en Supabase
 */
export async function saveBusinessBranding(
  businessId,
  { name, subtitle, logoUrl, primaryColor, secondaryColor, maxSongsPerWindow, windowMinutes }
) {
  if (!businessId) throw new Error('businessId requerido')

  const existing = await getBusinessBranding(businessId)

  // 1. Si se envió un nuevo nombre comercial para el negocio, actualizar la tabla businesses
  if (name && typeof name === 'string' && name.trim()) {
    await supabaseAdmin
      .from('businesses')
      .update({ name: name.trim() })
      .eq('id', businessId)
  }

  const parsedMaxSongs =
    maxSongsPerWindow !== undefined && maxSongsPerWindow !== null && maxSongsPerWindow !== ''
      ? Math.min(Math.max(parseInt(maxSongsPerWindow, 10) || DEFAULT_BRANDING.maxSongsPerWindow, 1), 20)
      : existing.maxSongsPerWindow || DEFAULT_BRANDING.maxSongsPerWindow

  const parsedWindowMinutes =
    windowMinutes !== undefined && windowMinutes !== null && windowMinutes !== ''
      ? Math.min(Math.max(parseInt(windowMinutes, 10) || DEFAULT_BRANDING.windowMinutes, 1), 180)
      : existing.windowMinutes || DEFAULT_BRANDING.windowMinutes

  const cleanBranding = {
    subtitle: typeof subtitle === 'string' ? subtitle.trim() : existing.subtitle || DEFAULT_BRANDING.subtitle,
    logoUrl: typeof logoUrl === 'string' ? logoUrl.trim() : existing.logoUrl || '',
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(primaryColor || '')
      ? primaryColor
      : existing.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: /^#[0-9a-fA-F]{6}$/.test(secondaryColor || '')
      ? secondaryColor
      : existing.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    maxSongsPerWindow: parsedMaxSongs,
    windowMinutes: parsedWindowMinutes,
  }

  // 2. Persistir en la tabla songs bajo el proveedor reservado 'cj_branding' (no requiere migración SQL manual)
  const { error } = await supabaseAdmin
    .from('songs')
    .upsert(
      {
        provider: BRAND_PROVIDER,
        provider_song_id: String(businessId),
        title: (name || 'BRANDING_CONFIG').trim(),
        artist: cleanBranding.subtitle || 'Cervecería & Música',
        thumbnail_url: cleanBranding.logoUrl || null,
        duration: 0,
        stream_url: JSON.stringify({
          primaryColor: cleanBranding.primaryColor,
          secondaryColor: cleanBranding.secondaryColor,
          maxSongsPerWindow: cleanBranding.maxSongsPerWindow,
          windowMinutes: cleanBranding.windowMinutes,
        }),
      },
      { onConflict: 'provider,provider_song_id' }
    )

  if (error) throw error

  brandingCache.set(String(businessId), { data: cleanBranding, loadedAt: Date.now() })
  return cleanBranding
}
