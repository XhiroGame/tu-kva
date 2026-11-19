import { Router } from 'express'
import { getQueue, addToQueue, updateQueueStatus, removeFromQueue, reorderQueue, playerHeartbeat } from '../controllers/queue.controller.js'
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js'

const router = Router()

/**
 * Rutas de gestión de playlist
 */
router.get('/:businessSlug', getQueue)
router.post('/:businessSlug/heartbeat', requireAuth, playerHeartbeat)
router.post('/', optionalAuth, addToQueue)
router.put('/reorder', requireAuth, reorderQueue)
router.patch('/:itemId', requireAuth, updateQueueStatus)
router.delete('/:itemId', requireAuth, removeFromQueue)

export default router
