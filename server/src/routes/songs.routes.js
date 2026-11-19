import { Router } from 'express'
import { searchSongs, getSmartFallbackSongs, reportBlockedSong } from '../controllers/songs.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

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

/**
 * POST /api/songs/report-blocked
 * Marca un video bloqueado por derechos (error 101/150/100) en la lista negra
 */
router.post('/report-blocked', requireAuth, reportBlockedSong)

export default router
