import { Router } from 'express'
import { getQueue, addToQueue, updateQueueStatus, removeFromQueue } from '../controllers/queue.controller.js'

const router = Router()

/**
 * Rutas de gestión de playlist
 */
router.get('/:businessSlug', getQueue)
router.post('/', addToQueue)
router.patch('/:itemId', updateQueueStatus)
router.delete('/:itemId', removeFromQueue)

export default router
