import { Router } from 'express'
import { getTables, createTable, deleteTable, validateTable } from '../controllers/tables.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

/**
 * Rutas de Mesas y Códigos QR
 */
router.get('/validate/:qrToken', validateTable)
router.get('/:businessSlug', requireAuth, getTables)
router.post('/', requireAuth, createTable)
router.delete('/:tableId', requireAuth, deleteTable)

export default router
