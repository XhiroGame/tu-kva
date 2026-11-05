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
   * Busca canciones en YouTube
   * Prioriza canciones individuales oficiales para evitar bloqueos de copyright
   * @param {string} query - Término de búsqueda (ej: "Bohemian Rhapsody", "Bad Bunny")
   * @param {object} options - { limit: 20 }
   */
  async search(query, options = {}) {
    const limit = Math.min(options.limit || 20, 30)

    try {
      // Limpiar query de términos que generen mixes bloqueados
      const cleanQuery = query.replace(/\bmix\b|\b2025\b|\blive\b/gi, '').trim()
      const searchPrompt = `${cleanQuery || query} official audio`
      const searchResults = await ytSearch(searchPrompt)
      const videos = searchResults?.videos || []

      // Filtrar videos: dar preferencia a temas individuales (entre 45 seg y 10 minutos)
      // para evitar DJ sets y mixes largos que suelen tener bloqueos de embedding (LatinAutor / UMPG)
      const validVideos = videos.filter((video) => {
        const seconds = video.seconds || (video.duration?.seconds || 0)
        const titleLower = (video.title || '').toLowerCase()
        const isDjMix = titleLower.includes('dj set') || titleLower.includes('full album')
        return seconds >= 45 && seconds <= 600 && !isDjMix
      })

      const listToUse = validVideos.length > 0 ? validVideos : videos
      return listToUse.slice(0, limit).map((video) => this.normalize(video))
    } catch (error) {
      console.error('[YouTubeProvider Error]', error)
      throw new Error('Error al buscar en el catálogo de YouTube')
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
