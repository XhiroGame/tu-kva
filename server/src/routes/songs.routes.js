import { Router } from 'express'
import { searchSongs, getSmartFallbackSongs } from '../controllers/songs.controller.js'

const router = Router()

/**
 * GET /api/songs/search?q=nombre&limit=20&offset=0
 */
router.get('/search', searchSongs)

/**
 * GET /api/songs/smart-fallback/:businessSlug
 * Música ambiental inteligente basada en el gusto musical del bar
 */
router.get('/smart-fallback/:businessSlug', getSmartFallbackSongs)

export default router
