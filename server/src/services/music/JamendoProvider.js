import MusicProvider from './MusicProvider.js'

/**
 * JamendoProvider - Music provider implementation using the Jamendo API.
 *
 * Jamendo is a music platform featuring Creative Commons licensed music.
 * It allows free, legal use in commercial settings with the appropriate plan.
 *
 * API Documentation: https://developer.jamendo.com/v3.0
 * Commercial licensing: https://www.jamendo.com/start-licensing
 *
 * Setup:
 *   1. Create account at https://devportal.jamendo.com
 *   2. Register an app to get your Client ID
 *   3. For commercial use in a venue: purchase a commercial license
 *   4. Set JAMENDO_CLIENT_ID in .env
 *
 * Note: Full implementation is in Etapa 4.
 *       This file defines the structure and normalization logic.
 */
class JamendoProvider extends MusicProvider {
  constructor() {
    super()
    this.clientId = process.env.JAMENDO_CLIENT_ID
    this.baseUrl  = process.env.JAMENDO_API_URL || 'https://api.jamendo.com/v3.0'

    if (!this.clientId) {
      console.warn(
        '[JamendoProvider] JAMENDO_CLIENT_ID not set. ' +
        'Music search will not work until configured.'
      )
    }
  }

  /**
   * Search songs via Jamendo API.
   * @param {string} query
   * @param {{ limit?: number, offset?: number }} options
   */
  async search(query, options = {}) {
    const { limit = 20, offset = 0 } = options

    if (!this.clientId) {
      throw new Error('Jamendo Client ID not configured. See server/.env.example')
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      format:    'json',
      limit:     Math.min(limit, 50),
      offset,
      namesearch: query,             // Búsqueda inteligente por nombre de tema o artista
      fuzzysearch: query,            // Búsqueda tolerante a faltas ortográficas
      order:     'popularity_month_desc', // Canciones más populares y de mejor calidad primero
      audioformat: 'mp32',           // MP3 alta fidelidad
      imagesize: '300',              // Portadas en alta calidad
    })

    const url = `${this.baseUrl}/tracks/?${params.toString()}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Jamendo API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.headers?.status !== 'success') {
      throw new Error(`Jamendo API: ${data.headers?.error_message || 'Unknown error'}`)
    }

    return (data.results || []).map((track) => this.normalize(track))
  }

  /**
   * Get a single track by Jamendo ID.
   * @param {string} providerId - Jamendo track ID
   */
  async getSong(providerId) {
    if (!this.clientId) {
      throw new Error('Jamendo Client ID not configured')
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      format:    'json',
      id:        providerId,
      audioformat: 'mp32',
      imagesize: '300',
    })

    const response = await fetch(`${this.baseUrl}/tracks/?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Jamendo API error: ${response.status}`)
    }

    const data = await response.json()
    const track = data.results?.[0]

    if (!track) {
      throw new Error(`Song not found: ${providerId}`)
    }

    return this.normalize(track)
  }

  /**
   * Get audio stream URL.
   * Jamendo provides direct MP3 URLs in track data.
   * @param {string} providerId
   */
  async getStreamUrl(providerId) {
    const song = await this.getSong(providerId)
    return song.stream_url
  }

  /**
   * Normalize a Jamendo track object to our standard Song format.
   * @param {object} track - Raw Jamendo track
   * @returns {import('./MusicProvider.js').Song}
   */
  normalize(track) {
    return {
      provider:         'jamendo',
      provider_song_id: String(track.id),
      title:            track.name,
      artist:           track.artist_name,
      thumbnail_url:    track.image || track.album_image || null,
      duration:         track.duration || 0,
      stream_url:       track.audio || null,
      album:            track.album_name || null,
      license:          track.license_ccurl || null,
    }
  }
}

export default JamendoProvider
