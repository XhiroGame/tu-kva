import { Router } from 'express'

const router = Router()

/**
 * Admin routes — Etapa 7
 * GET /api/admin/:businessSlug/history     → Play history
 * GET /api/admin/:businessSlug/stats       → Dashboard stats
 */

router.get('/:businessSlug/history', (_req, res) => {
  res.json({ success: true, message: 'History — Etapa 7', data: [] })
})

router.get('/:businessSlug/stats', (_req, res) => {
  res.json({ success: true, message: 'Stats — Etapa 7', data: {} })
})

export default router
