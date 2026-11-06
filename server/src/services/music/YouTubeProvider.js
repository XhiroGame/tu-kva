import ytSearch from 'yt-search'
import MusicProvider from './MusicProvider.js'

/**
 * YouTubeProvider - Proveedor musical basado en búsqueda de YouTube
 * Permite buscar cualquier canción, artista o video musical del mundo.
 */
class YouTubeProvider extends MusicProvider {
  constructor() {
    super()
  }

  /**
   * Busca canciones en YouTube con timeout rápido y filtrado estricto
   * Regla estricta: ÚNICAMENTE canciones de menos de 10 minutos (duración < 600 segundos)
   * @param {string} query - Término de búsqueda
   * @param {object} options - { limit: 30 }
   */
  async search(query, options = {}) {
    const limit = Math.min(options.limit || 30, 45)

    try {
      // Limpiar query de términos que generen mixes, directos o recopilaciones largas
      const cleanQuery = query
        .replace(/\bmix\b|\bcompleto\b|\bfull album\b|\bdisco completo\b|\b1 hour\b|\b2 hours\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      const searchPrompt = cleanQuery || query

      // Buscar dos consultas complementarias en paralelo para obtener más de 30 resultados completos
      const p1 = ytSearch(searchPrompt)
      const p2 = ytSearch(`${searchPrompt} canciones`)

      // Timeout de 4.5 segundos para evitar bloqueos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('YouTube search timeout')), 4500)
      )

      const settled = await Promise.race([
        Promise.allSettled([p1, p2]),
        timeoutPromise,
      ])

      const videos = []
      const seenIds = new Set()

      if (Array.isArray(settled)) {
        for (const item of settled) {
          if (item.status === 'fulfilled' && item.value?.videos) {
            for (const v of item.value.videos) {
              const vid = String(v.videoId || v.id || '')
              if (vid && !seenIds.has(vid)) {
                seenIds.add(vid)
                videos.push(v)
              }
            }
          }
        }
      }

      // Filtrado estricto: estrictamente MENOS de 10 minutos (600 segundos) y más de 30 segundos
      const MAX_SECONDS = 599 // Menos de 10 minutos
      const MIN_SECONDS = 30

      const validSongs = videos.filter((video) => {
        const seconds = video.seconds || (video.duration?.seconds || 0)
        // Descartar videos sin duración, livestreams o canciones de 10 min o más
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

        // Si el título indica mix y dura más de 6 minutos, descartar
        if (isLongMix && seconds > 360) {
          return false
        }

        return true
      })

      return validSongs.slice(0, limit).map((video) => this.normalize(video))
    } catch (error) {
      console.warn('[YouTubeProvider Warning]', error.message)
      return []
    }
  }

  /**
   * Obtiene la información de un video por su ID
   * @param {string} videoId - YouTube Video ID (ej: "fJ9rUzIMcZQ")
   */
  async getSong(videoId) {
    try {
      const video = await ytSearch({ videoId })
      if (!video) throw new Error(`Video no encontrado: ${videoId}`)
      return this.normalize(video)
    } catch (error) {
      throw new Error(`Error obteniendo información de la canción: ${error.message}`)
    }
  }

  /**
   * Devuelve el ID para el reproductor embebido de YouTube
   * @param {string} videoId
   */
  async getStreamUrl(videoId) {
    // Para YouTube, la reproducción se hace mediante el ID oficial en el IFrame Player
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  /**
   * Normaliza los datos al formato estándar de BEER MUSIC
   * @param {object} video - Objeto devuelto por yt-search
   */
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
