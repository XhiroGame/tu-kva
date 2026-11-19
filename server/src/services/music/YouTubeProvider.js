import ytSearch from 'yt-search'
import MusicProvider from './MusicProvider.js'

/**
 * Convierte duración ISO 8601 de YouTube Data API v3 (ej: "PT3M45S", "PT1H2M10S") a segundos
 */
function parseIsoDuration(iso) {
  if (!iso || typeof iso !== 'string') return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const mins = parseInt(match[2] || '0', 10)
  const secs = parseInt(match[3] || '0', 10)
  return hours * 3600 + mins * 60 + secs
}

/**
 * YouTubeProvider - Proveedor musical basado en YouTube
 * 1. Si YOUTUBE_API_KEY está configurada, usa YouTube Data API v3 oficial con videoEmbeddable=true (< 300ms).
 * 2. Si no está configurada o se agota la cuota diaria, cae automáticamente a yt-search.
 */
class YouTubeProvider extends MusicProvider {
  constructor() {
    super()
  }

  /**
   * Búsqueda ultrarrápida con YouTube Data API v3 oficial (solo videos embebibles)
   */
  async searchWithOfficialApi(searchPrompt, limit) {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey || !apiKey.trim()) return null

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('videoEmbeddable', 'true')
    searchUrl.searchParams.set('videoSyndicated', 'true')
    searchUrl.searchParams.set('maxResults', String(Math.min(limit, 25)))
    searchUrl.searchParams.set('q', searchPrompt)
    searchUrl.searchParams.set('key', apiKey.trim())

    const searchRes = await fetch(searchUrl.toString())
    if (!searchRes.ok) {
      throw new Error(`YouTube Data API search HTTP ${searchRes.status}`)
    }

    const searchData = await searchRes.json()
    const items = searchData?.items || []
    const videoIds = items.map((item) => item?.id?.videoId).filter(Boolean)
    if (videoIds.length === 0) return []

    // Consultar duración exacta y confirmar embeddable en una sola petición batch
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    detailsUrl.searchParams.set('part', 'contentDetails,status,snippet')
    detailsUrl.searchParams.set('id', videoIds.join(','))
    detailsUrl.searchParams.set('key', apiKey.trim())

    const detailsRes = await fetch(detailsUrl.toString())
    if (!detailsRes.ok) {
      throw new Error(`YouTube Data API videos HTTP ${detailsRes.status}`)
    }

    const detailsData = await detailsRes.json()
    const detailedVideos = detailsData?.items || []

    const MAX_SECONDS = 599
    const MIN_SECONDS = 30

    return detailedVideos
      .filter((v) => {
        if (v.status?.embeddable === false) return false
        const seconds = parseIsoDuration(v.contentDetails?.duration)
        if (!seconds || seconds <= MIN_SECONDS || seconds > MAX_SECONDS) return false
        const titleLower = (v.snippet?.title || '').toLowerCase()
        const isLongMix =
          titleLower.includes('mix') ||
          titleLower.includes('full album') ||
          titleLower.includes('dj set') ||
          titleLower.includes('1 hour') ||
          titleLower.includes('2 hours') ||
          titleLower.includes('completo')
        if (isLongMix && seconds > 360) return false
        return true
      })
      .map((v) => ({
        provider: 'youtube',
        provider_song_id: String(v.id),
        title: v.snippet?.title || 'Sin título',
        artist: v.snippet?.channelTitle || 'Artista oficial',
        album: null,
        thumbnail_url:
          v.snippet?.thumbnails?.medium?.url ||
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.default?.url ||
          null,
        duration: parseIsoDuration(v.contentDetails?.duration),
        stream_url: `https://www.youtube.com/watch?v=${v.id}`,
      }))
  }

  /**
   * Busca canciones en YouTube
   * Regla estricta: ÚNICAMENTE canciones de menos de 10 minutos (duración < 600 segundos)
   */
  async search(query, options = {}) {
    const limit = Math.min(options.limit || 30, 45)
    const cleanQuery = query
      .replace(/\bmix\b|\b2025\b|\b2026\b|\blive\b|\bcompleto\b|\bfull album\b|\bdisco completo\b/gi, '')
      .trim()
    const searchPrompt = cleanQuery || query

    // 1. Intentar con YouTube Data API v3 oficial si está configurada
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const officialResults = await this.searchWithOfficialApi(searchPrompt, limit)
        if (officialResults && officialResults.length > 0) {
          return officialResults.slice(0, limit)
        }
      } catch (apiErr) {
        console.warn('[YouTubeProvider Official API fallback to yt-search]', apiErr.message)
      }
    }

    // 2. Fallback automático con yt-search
    try {
      const searchResults = await ytSearch(searchPrompt)
      const videos = searchResults?.videos || []

      const MAX_SECONDS = 599
      const MIN_SECONDS = 30

      const validSongs = videos.filter((video) => {
        const seconds = video.seconds || (video.duration?.seconds || 0)
        if (!seconds || seconds <= MIN_SECONDS || seconds > MAX_SECONDS) {
          return false
        }

        const titleLower = (video.title || '').toLowerCase()
        const isLongMix =
          titleLower.includes('mix') ||
          titleLower.includes('full album') ||
          titleLower.includes('dj set') ||
          titleLower.includes('1 hour') ||
          titleLower.includes('2 hours') ||
          titleLower.includes('completo')

        if (isLongMix && seconds > 360) {
          return false
        }

        return true
      })

      return validSongs.slice(0, limit).map((video) => this.normalize(video))
    } catch (error) {
      console.error('[YouTubeProvider Error]', error)
      throw new Error('Error al buscar en el catálogo de YouTube')
    }
  }

  async getSong(videoId) {
    try {
      const video = await ytSearch({ videoId })
      if (!video) throw new Error(`Video no encontrado: ${videoId}`)
      return this.normalize(video)
    } catch (error) {
      throw new Error(`Error obteniendo información de la canción: ${error.message}`)
    }
  }

  async getStreamUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  normalize(video) {
    return {
      provider: 'youtube',
      provider_song_id: String(video.videoId || video.id),
      title: video.title,
      artist: video.author?.name || 'Artista oficial',
      album: null,
      thumbnail_url: video.thumbnail || video.image || null,
      duration: video.seconds || (video.duration?.seconds || 0),
      stream_url: `https://www.youtube.com/watch?v=${video.videoId || video.id}`,
    }
  }
}

export default YouTubeProvider
