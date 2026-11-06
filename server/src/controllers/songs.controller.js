import YouTubeProvider from '../services/music/YouTubeProvider.js'
import supabaseAdmin from '../config/supabase.js'

const musicProvider = new YouTubeProvider()

// Caché ultra-rápido en memoria RAM del servidor (evita scraping repetido)
const searchMemoryCache = new Map()
const CACHE_TTL_MS = 1000 * 60 * 60 * 2 // 2 horas de duración
const MAX_CACHE_ENTRIES = 400

function getFromMemoryCache(key) {
  const cached = searchMemoryCache.get(key)
  if (!cached) return null
  if (Date.now() > cached.expiresAt) {
    searchMemoryCache.delete(key)
    return null
  }
  return cached.data
}

function setToMemoryCache(key, data) {
  if (searchMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchMemoryCache.keys().next().value
    searchMemoryCache.delete(oldestKey)
  }
  searchMemoryCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * GET /api/songs/search
 * Busca canciones por término (query) con caché en memoria ultra-rápido y caché en base de datos
 */
export async function searchSongs(req, res) {
  try {
    const query = (req.query.q || '').trim()
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 25)
    const offset = parseInt(req.query.offset, 10) || 0

    // Si la búsqueda está vacía, retornar catálogo inicial sugerido
    const normalizedKey = query.toLowerCase() || '__default_populares__'

    // 1. Revisar caché en memoria (Respuesta instantánea en < 5ms)
    const memoryCached = getFromMemoryCache(normalizedKey)
    if (memoryCached && memoryCached.length > 0) {
      return res.json({
        success: true,
        source: 'memory_cache',
        count: memoryCached.length,
        data: memoryCached.slice(0, limit),
      })
    }

    let results = []

    // 2. Si no hay query, buscar éxitos populares de ambiente
    if (!query) {
      // Intentar primero desde canciones populares ya guardadas en Supabase
      const { data: popularDbSongs } = await supabaseAdmin
        .from('songs')
        .select('*')
        .eq('provider', 'youtube')
        .lte('duration', 600)
        .gt('duration', 60)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (popularDbSongs && popularDbSongs.length >= 8) {
        results = popularDbSongs
      } else {
        results = await musicProvider.search('exitos populares musica bar canciones', { limit })
      }
    } else {
      // 3. Buscar en Supabase por si ya fue buscada antes (coincidencia rápida en BD)
      if (query.length >= 3) {
        const { data: dbMatches } = await supabaseAdmin
          .from('songs')
          .select('*')
          .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
          .lte('duration', 600)
          .gt('duration', 45)
          .limit(limit)

        if (dbMatches && dbMatches.length >= 6) {
          results = dbMatches
        }
      }

      // 4. Si aún no hay suficientes resultados locales, buscar en YouTube
      if (results.length === 0) {
        results = await musicProvider.search(query, { limit, offset })
      }
    }

    // 5. Guardar en caché en memoria para que las próximas consultas sean instantáneas
    if (results.length > 0) {
      setToMemoryCache(normalizedKey, results)

      // 6. Cachear de forma asíncrona en Supabase (tabla songs) en segundo plano
      const songsToUpsert = results.map((song) => ({
        provider: song.provider,
        provider_song_id: String(song.provider_song_id),
        title: song.title,
        artist: song.artist,
        album: song.album || null,
        thumbnail_url: song.thumbnail_url,
        duration: song.duration || 0,
        stream_url: song.stream_url,
      }))

      supabaseAdmin
        .from('songs')
        .upsert(songsToUpsert, { onConflict: 'provider,provider_song_id' })
        .then(({ error }) => {
          if (error) console.warn('[Songs Cache Error]', error.message)
        })
    }

    return res.json({
      success: true,
      query,
      count: results.length,
      data: results.slice(0, limit),
    })
  } catch (error) {
    console.error('[Search Songs Error]', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al buscar canciones',
    })
  }
}

/**
 * GET /api/songs/smart-fallback/:businessSlug
 * Obtiene las canciones más sonadas en el bar (o éxitos populares de respaldo)
 * para reproducir aleatoriamente cuando la cola queda vacía.
 */
export async function getSmartFallbackSongs(req, res) {
  try {
    const { businessSlug } = req.params
    const excludeParam = req.query.exclude || ''
    const excludeIds = new Set(
      excludeParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )

    // 1. Obtener el business_id con soporte para slug por defecto
    let { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug')
      .or(`slug.eq.${businessSlug},slug.eq.tu-kva,id.eq.a1b2c3d4-0000-0000-0000-000000000001`)
      .limit(1)
      .single()

    if (!business) {
      business = { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Tu K-VA', slug: 'tu-kva' }
    }

    // 2. Consultar el historial de canciones reproducidas/pedidas en el bar para calcular las MÁS SONADAS
    const { data: queueHistory } = await supabaseAdmin
      .from('playlist_queue')
      .select(`
        song_id,
        status,
        songs (
          id,
          provider,
          provider_song_id,
          title,
          artist,
          album,
          thumbnail_url,
          duration,
          stream_url
        )
      `)
      .eq('business_id', business.id)
      .in('status', ['played', 'playing', 'pending'])
      .order('requested_at', { ascending: false })
      .limit(300)

    // Contabilizar cuántas veces ha sonado/sido pedida cada canción
    const songCountsMap = new Map()
    if (queueHistory && queueHistory.length > 0) {
      for (const item of queueHistory) {
        const s = item.songs
        if (!s || !s.provider_song_id) continue
        // Ignorar sesiones de más de 10 minutos
        if (s.duration && s.duration > 600) continue

        const key = String(s.provider_song_id)
        if (!songCountsMap.has(key)) {
          songCountsMap.set(key, {
            ...s,
            play_count: 1,
          })
        } else {
          songCountsMap.get(key).play_count += 1
        }
      }
    }

    // Ordenar de mayor a menor número de reproducciones (Las más sonadas)
    let mostPlayedSongs = Array.from(songCountsMap.values()).sort(
      (a, b) => b.play_count - a.play_count
    )

    // Filtrar las canciones recientemente reproducidas para no repetir la misma seguida
    const filteredMostPlayed = mostPlayedSongs.filter(
      (s) => !excludeIds.has(String(s.provider_song_id))
    )

    // Si hay canciones más sonadas disponibles en el historial del bar, usar el Top 15
    if (filteredMostPlayed.length > 0) {
      const topPool = filteredMostPlayed.slice(0, 15)
      return res.json({
        success: true,
        source: 'most_played_bar',
        detectedStyle: 'Las más sonadas del bar',
        data: topPool,
      })
    }

    // 3. Si solo había 1 canción en el historial (y está en excludeIds) o aún no hay historial,
    // buscar en el catálogo local de canciones guardadas en Supabase (tabla songs)
    const { data: cachedSongs } = await supabaseAdmin
      .from('songs')
      .select('*')
      .eq('provider', 'youtube')
      .lte('duration', 600)
      .gt('duration', 60)
      .order('created_at', { ascending: false })
      .limit(30)

    const validCachedSongs = (cachedSongs || []).filter(
      (s) => s.provider_song_id && !excludeIds.has(String(s.provider_song_id))
    )

    if (validCachedSongs.length >= 3) {
      return res.json({
        success: true,
        source: 'cached_popular',
        detectedStyle: 'Favoritas del catálogo del bar',
        data: validCachedSongs.slice(0, 15),
      })
    }

    // 4. Fallback final: buscar éxitos populares en YouTube (canciones individuales, no mixes largos)
    let genreSeed = 'exitos mas sonados rock pop latino'
    if (mostPlayedSongs.length > 0 && mostPlayedSongs[0].artist) {
      genreSeed = `${mostPlayedSongs[0].artist} grandes exitos canciones`
    }

    const ytResults = await musicProvider.search(genreSeed, { limit: 20 })
    const filteredYt = ytResults.filter(
      (s) =>
        !excludeIds.has(String(s.provider_song_id)) &&
        (!s.duration || (s.duration > 60 && s.duration <= 600))
    )

    const finalPool =
      filteredYt.length > 0
        ? filteredYt
        : mostPlayedSongs.length > 0
          ? mostPlayedSongs
          : ytResults

    return res.json({
      success: true,
      source: 'youtube_top_hits',
      detectedStyle: 'Éxitos más sonados',
      data: finalPool,
    })
  } catch (error) {
    console.error('[Smart Fallback Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}
