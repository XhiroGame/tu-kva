/**
 * MusicProvider - Abstract interface for music providers.
 *
 * This abstraction allows swapping music providers without
 * rewriting any application logic. Currently implemented by JamendoProvider.
 *
 * To add a new provider:
 *   1. Create a new class that extends MusicProvider
 *   2. Implement all abstract methods
 *   3. Update the factory function at the bottom
 */
class MusicProvider {
  /**
   * Search for songs by query.
   * @param {string} query - Search term (title, artist, genre)
   * @param {object} options - { limit: number, offset: number }
   * @returns {Promise<Song[]>}
   */
  async search(query, options = {}) {
    throw new Error('MusicProvider.search() must be implemented')
  }

  /**
   * Get a single song by provider ID.
   * @param {string} providerId - Provider-specific song ID
   * @returns {Promise<Song>}
   */
  async getSong(providerId) {
    throw new Error('MusicProvider.getSong() must be implemented')
  }

  /**
   * Get the streaming URL for a song.
   * @param {string} providerId - Provider-specific song ID
   * @returns {Promise<string>} - Direct audio URL
   */
  async getStreamUrl(providerId) {
    throw new Error('MusicProvider.getStreamUrl() must be implemented')
  }

  /**
   * Normalize provider response into the common Song format.
   * @param {object} rawSong - Provider-specific song object
   * @returns {Song}
   */
  normalize(rawSong) {
    throw new Error('MusicProvider.normalize() must be implemented')
  }
}

/**
 * @typedef {object} Song
 * @property {string} provider         - Provider name (e.g. 'jamendo')
 * @property {string} provider_song_id - Provider's unique song ID
 * @property {string} title            - Song title
 * @property {string} artist           - Artist name
 * @property {string} thumbnail_url    - Album cover image URL
 * @property {number} duration         - Duration in seconds
 * @property {string} [stream_url]     - Direct audio stream URL (if available)
 */

export default MusicProvider
