import { Router } from 'express'
import { getTables, createTable, deleteTable, validateTable } from '../controllers/tables.controller.js'

const router = Router()

/**
 * Rutas de Mesas y Códigos QR
 */
router.get('/validate/:qrToken', validateTable)
router.get('/:businessSlug', getTables)
router.post('/', createTable)
router.delete('/:tableId', deleteTable)

export default router
