import os from 'os'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import supabaseAdmin from '../config/supabase.js'

/**
 * Obtiene la dirección IPv4 local de la máquina para que los celulares
 * puedan escanear el QR y abrir la web en la misma red Wi-Fi
 */
function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
          return net.address
        }
      }
    }
  } catch (err) {
    console.warn('[Network IP Detection]', err)
  }
  return 'localhost'
}

/**
 * Determina la URL base que se incrustará en el código QR
 */
function getBaseClientUrl(req) {
  // 1. Si en el .env se configuró un dominio o IP explícita distinta a localhost
  if (process.env.QR_BASE_URL && !process.env.QR_BASE_URL.includes('localhost')) {
    return process.env.QR_BASE_URL
  }

  // 2. Si la petición viene desde una IP de red (ej: http://192.168.1.6:3001)
  const reqHost = req?.get ? req.get('host') : null
  if (reqHost && !reqHost.includes('localhost')) {
    const hostOnly = reqHost.split(':')[0]
    return `http://${hostOnly}:5173`
  }

  // 3. Detección automática de la IP de la máquina (ej: 192.168.1.6)
  const localIp = getLocalIpAddress()
  if (localIp && localIp !== 'localhost') {
    return `http://${localIp}:5173`
  }

  return process.env.QR_BASE_URL || 'http://localhost:5173'
}

/**
 * GET /api/tables/:businessSlug
 * Obtiene todas las mesas de un establecimiento con su URL y QR generado
 */
export async function getTables(req, res) {
  try {
    const { businessSlug } = req.params
    const baseClientUrl = getBaseClientUrl(req)

    let { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug')
      .or(`slug.eq.${businessSlug},slug.eq.tu-kva,id.eq.a1b2c3d4-0000-0000-0000-000000000001`)
      .limit(1)
      .single()

    if (!business) {
      business = { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Tu K-VA', slug: 'tu-kva' }
    }

    const { data: tables, error } = await supabaseAdmin
      .from('tables')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Generar el código QR en DataURL para cada mesa con la IP real accesible desde móviles
    const tablesWithQR = await Promise.all(
      tables.map(async (table) => {
        const clientUrl = `${baseClientUrl}/${business.slug}/table/${table.qr_token}`
        const qrCodeDataUrl = await QRCode.toDataURL(clientUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#111111',
            light: '#ffffff',
          },
        })

        return {
          ...table,
          client_url: clientUrl,
          qr_code_url: qrCodeDataUrl,
        }
      })
    )

    return res.json({ success: true, business, data: tablesWithQR, baseClientUrl })
  } catch (error) {
    console.error('[Get Tables Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * POST /api/tables
 * Crea una nueva mesa y genera su QR Token único
 * Body: { businessSlug, tableName }
 */
export async function createTable(req, res) {
  try {
    const { businessSlug, tableName } = req.body
    const baseClientUrl = getBaseClientUrl(req)

    if (!tableName || !tableName.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la mesa es requerido' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, slug')
      .eq('slug', businessSlug)
      .single()

    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }

    const qrToken = `qr-${uuidv4().slice(0, 8)}`

    const { data: newTable, error } = await supabaseAdmin
      .from('tables')
      .insert({
        business_id: business.id,
        table_name: tableName.trim(),
        qr_token: qrToken,
        active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Ya existe una mesa con ese nombre' })
      }
      throw error
    }

    const clientUrl = `${baseClientUrl}/${business.slug}/table/${newTable.qr_token}`
    const qrCodeDataUrl = await QRCode.toDataURL(clientUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    })

    return res.json({
      success: true,
      message: 'Mesa creada con éxito',
      data: {
        ...newTable,
        client_url: clientUrl,
        qr_code_url: qrCodeDataUrl,
      },
    })
  } catch (error) {
    console.error('[Create Table Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * GET /api/tables/validate/:qrToken
 * Valida un token de QR y devuelve el nombre real de la mesa y del negocio
 */
export async function validateTable(req, res) {
  try {
    const { qrToken } = req.params

    const { data: table, error } = await supabaseAdmin
      .from('tables')
      .select('id, table_name, active, business_id, businesses ( name, slug )')
      .eq('qr_token', qrToken)
      .single()

    if (error || !table) {
      return res.status(404).json({ success: false, message: 'Mesa no encontrada o token inválido' })
    }

    return res.json({
      success: true,
      data: {
        tableId: table.id,
        tableName: table.table_name,
        active: table.active,
        businessName: table.businesses?.name || 'Tu K-VA',
        businessSlug: table.businesses?.slug || 'tu-kva',
      },
    })
  } catch (error) {
    console.error('[Validate Table Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * DELETE /api/tables/:tableId
 * Elimina una mesa
 */
export async function deleteTable(req, res) {
  try {
    const { tableId } = req.params

    const { error } = await supabaseAdmin
      .from('tables')
      .delete()
      .eq('id', tableId)

    if (error) throw error

    return res.json({ success: true, message: 'Mesa eliminada correctamente' })
  } catch (error) {
    console.error('[Delete Table Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}
