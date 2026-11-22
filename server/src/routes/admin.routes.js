import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import supabaseAdmin from '../config/supabase.js'
import { getBusinessBranding, saveBusinessBranding } from '../utils/branding.js'

const router = Router()

router.use(requireAuth)

/**
 * Resuelve el negocio exactamente por su slug (o usa 'tu-kva' si se pidió explícitamente 'tu-kva')
 */
async function resolveBusiness(businessSlug) {
  const safeSlug = String(businessSlug || 'tu-kva').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'tu-kva'

  // 1. Buscar coincidencia exacta por slug
  const { data: exactBusiness } = await supabaseAdmin
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', safeSlug)
    .maybeSingle()

  if (exactBusiness) return exactBusiness

  // 2. Si el slug solicitado es 'tu-kva', buscar también por el UUID histórico por compatibilidad
  if (safeSlug === 'tu-kva') {
    const { data: defaultBiz } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug')
      .eq('id', 'a1b2c3d4-0000-0000-0000-000000000001')
      .maybeSingle()

    if (defaultBiz) return defaultBiz
    return { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Tu K-VA', slug: 'tu-kva' }
  }

  return null
}

/**
 * Helper para verificar si el usuario actual es superadmin
 */
async function checkIsSuperAdmin(user) {
  if (!user) return false

  // 1. Verificar si el correo coincide con la variable de entorno SUPERADMIN_EMAILS (ej: cjperrony@gmail.com)
  const envSuperEmails = (process.env.SUPERADMIN_EMAILS || process.env.SUPERADMIN_EMAIL || 'cjperrony@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (user.email && envSuperEmails.includes(user.email.toLowerCase())) {
    return true
  }

  // 2. Verificar metadata de Supabase Auth
  if (user.user_metadata?.role === 'superadmin') return true

  // 3. Verificar en la tabla public.users
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (userRow?.role === 'superadmin') return true

  return false
}

/**
 * GET /api/admin/me
 * Devuelve el perfil del usuario autenticado, su negocio asignado y si tiene permisos de SuperAdmin (CJ Systems)
 */
router.get('/me', async (req, res) => {
  try {
    const authUser = req.user
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email, role, business_id, businesses ( id, name, slug, created_at )')
      .eq('id', authUser.id)
      .maybeSingle()

    let business = userProfile?.businesses || null
    let role = userProfile?.role || authUser.user_metadata?.role || 'admin'

    // Si el usuario aún no tenía fila en public.users (por ejemplo, creado desde dashboard de Supabase para Tu K-VA),
    // vincularlo al negocio en user_metadata o a Tu K-VA por defecto
    if (!business) {
      const metaSlug = authUser.user_metadata?.business_slug || 'tu-kva'
      business = await resolveBusiness(metaSlug)
    }

    const isSuperAdmin = await checkIsSuperAdmin(authUser)
    if (isSuperAdmin) {
      role = 'superadmin'
    }

    const resolvedBiz = business || {
      id: 'a1b2c3d4-0000-0000-0000-000000000001',
      name: 'Tu K-VA',
      slug: 'tu-kva',
    }
    const branding = await getBusinessBranding(resolvedBiz.id)

    return res.json({
      success: true,
      data: {
        user: {
          id: authUser.id,
          email: authUser.email,
          role,
          isSuperAdmin,
        },
        business: {
          ...resolvedBiz,
          branding,
        },
      },
    })
  } catch (error) {
    console.error('[Admin Me Error]', error)
    return res.status(500).json({ success: false, message: 'Error al obtener perfil del administrador' })
  }
})

/**
 * GET /api/admin/super/businesses
 * Lista todos los negocios registrados en CJ Systems con sus métricas, mesas y administradores
 */
router.get('/super/businesses', async (req, res) => {
  try {
    const isSuper = await checkIsSuperAdmin(req.user)
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Acceso restringido a CJ Systems SuperAdmin',
      })
    }

    const { data: businesses, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: false })

    if (bizErr) throw bizErr

    const [
      { data: allUsers },
      { data: allTables },
      { data: allQueueItems },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('id, business_id, email, role, created_at'),
      supabaseAdmin.from('tables').select('id, business_id, active'),
      supabaseAdmin.from('playlist_queue').select('id, business_id, status'),
    ])

    const enrichedBusinesses = await Promise.all(
      (businesses || []).map(async (biz) => {
        const admins = (allUsers || []).filter((u) => u.business_id === biz.id)
        const bizTables = (allTables || []).filter((t) => t.business_id === biz.id)
        const activeTables = bizTables.filter((t) => t.active).length
        const bizQueue = (allQueueItems || []).filter((q) => q.business_id === biz.id)
        const totalPlayed = bizQueue.filter((q) => q.status === 'played' || q.status === 'playing').length
        const pendingInQueue = bizQueue.filter((q) => q.status === 'pending').length
        const branding = await getBusinessBranding(biz.id)

        return {
          ...biz,
          branding,
          admins,
          totalTables: bizTables.length,
          activeTables,
          totalPlayed,
          pendingInQueue,
          isActive: bizTables.length === 0 ? true : activeTables > 0,
        }
      })
    )

    return res.json({
      success: true,
      data: enrichedBusinesses,
    })
  } catch (error) {
    console.error('[SuperAdmin List Businesses Error]', error)
    return res.status(500).json({ success: false, message: 'Error al listar negocios de CJ Systems' })
  }
})

/**
 * POST /api/admin/super/businesses
 * Crea un nuevo negocio cliente en CJ Systems, su usuario administrador en Supabase Auth y su Mesa 1 inicial
 * Body: { name, slug, adminEmail, adminPassword, initialTablesCount }
 */
router.post('/super/businesses', async (req, res) => {
  try {
    const isSuper = await checkIsSuperAdmin(req.user)
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Acceso restringido a CJ Systems SuperAdmin',
      })
    }

    const { name, slug, adminEmail, adminPassword, initialTablesCount = 5 } = req.body || {}

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del negocio es obligatorio' })
    }

    const cleanSlug = String(slug || name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!cleanSlug || cleanSlug.length < 2) {
      return res.status(400).json({ success: false, message: 'El identificador URL (slug) no es válido' })
    }

    // 1. Verificar que el slug no exista
    const { data: existingBiz } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle()

    if (existingBiz) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un negocio con el identificador "${cleanSlug}"`,
      })
    }

    // 2. Si se proporcionó correo y contraseña para el dueño del bar, validar o crear usuario en Supabase Auth
    let createdAuthUser = null
    if (adminEmail && adminEmail.trim()) {
      if (!adminPassword || String(adminPassword).length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña del administrador debe tener al menos 6 caracteres',
        })
      }

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail.trim().toLowerCase(),
        password: String(adminPassword),
        email_confirm: true,
        user_metadata: {
          business_slug: cleanSlug,
          business_name: name.trim(),
          role: 'admin',
        },
      })

      if (authErr) {
        return res.status(400).json({
          success: false,
          message: `No se pudo crear el usuario en Auth: ${authErr.message}`,
        })
      }
      createdAuthUser = authData?.user || null
    }

    // 3. Crear el negocio en la tabla businesses
    const { data: newBusiness, error: createBizErr } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: name.trim(),
        slug: cleanSlug,
      })
      .select('id, name, slug, created_at')
      .single()

    if (createBizErr) throw createBizErr

    // 4. Vincular el usuario en public.users
    if (createdAuthUser) {
      await supabaseAdmin.from('users').upsert(
        {
          id: createdAuthUser.id,
          business_id: newBusiness.id,
          email: createdAuthUser.email,
          role: 'admin',
        },
        { onConflict: 'id' }
      )
    }

    // 5. Asegurar que el usuario actual quede registrado como superadmin en public.users si no estaba
    if (req.user?.id) {
      const { data: myRow } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', req.user.id)
        .maybeSingle()

      if (myRow && myRow.role !== 'superadmin') {
        await supabaseAdmin.from('users').update({ role: 'superadmin' }).eq('id', req.user.id)
      }
    }

    // 6. Guardar branding inicial y límites antimonopolio personalizados si se proporcionaron
    const {
      subtitle,
      logoUrl,
      primaryColor,
      secondaryColor,
      maxSongsPerWindow,
      windowMinutes,
    } = req.body || {}
    const branding = await saveBusinessBranding(newBusiness.id, {
      name: newBusiness.name,
      subtitle: subtitle || 'Cervecería & Música',
      logoUrl: logoUrl || '',
      primaryColor: primaryColor || '#f59e0b',
      secondaryColor: secondaryColor || '#f97316',
      maxSongsPerWindow: maxSongsPerWindow ?? 2,
      windowMinutes: windowMinutes ?? 10,
    })

    // 7. Crear mesas iniciales con sus tokens QR listos para imprimir
    const tablesCount = Math.min(Math.max(parseInt(initialTablesCount, 10) || 0, 0), 30)
    if (tablesCount > 0) {
      const tablesToInsert = Array.from({ length: tablesCount }, (_, i) => ({
        business_id: newBusiness.id,
        table_name: `Mesa ${i + 1}`,
        qr_token: `qr-${cleanSlug}-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
        active: true,
      }))
      await supabaseAdmin.from('tables').insert(tablesToInsert)
    }

    return res.json({
      success: true,
      message: `Negocio "${newBusiness.name}" creado exitosamente en CJ Systems`,
      data: {
        business: { ...newBusiness, branding },
        adminEmail: createdAuthUser?.email || null,
        initialTablesCreated: tablesCount,
      },
    })
  } catch (error) {
    console.error('[SuperAdmin Create Business Error]', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al crear el nuevo negocio',
    })
  }
})

/**
 * PATCH /api/admin/super/businesses/:businessId/toggle-status
 * Activa o suspende todas las mesas de un negocio (útil para control de suscripción mensual)
 */
router.patch('/super/businesses/:businessId/toggle-status', async (req, res) => {
  try {
    const isSuper = await checkIsSuperAdmin(req.user)
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Acceso restringido a CJ Systems SuperAdmin',
      })
    }

    const { businessId } = req.params
    const { active } = req.body || {}
    const nextActive = Boolean(active)

    const { error } = await supabaseAdmin
      .from('tables')
      .update({ active: nextActive })
      .eq('business_id', businessId)

    if (error) throw error

    return res.json({
      success: true,
      message: nextActive
        ? 'Servicio del negocio activado correctamente'
        : 'Servicio del negocio pausado (mesas desactivadas temporalmente)',
      active: nextActive,
    })
  } catch (error) {
    console.error('[SuperAdmin Toggle Status Error]', error)
    return res.status(500).json({ success: false, message: 'Error al cambiar el estado del negocio' })
  }
})

/**
 * GET /api/admin/:businessSlug/branding
 * Obtiene la configuración de marca (nombre, subtítulo, logo, colores) del establecimiento
 */
router.get('/:businessSlug/branding', async (req, res) => {
  try {
    const business = await resolveBusiness(req.params.businessSlug)
    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }
    const branding = await getBusinessBranding(business.id)
    return res.json({
      success: true,
      business: {
        ...business,
        branding,
      },
    })
  } catch (error) {
    console.error('[Get Branding Error]', error)
    return res.status(500).json({ success: false, message: 'Error al obtener la personalización del negocio' })
  }
})

/**
 * PUT /api/admin/:businessSlug/branding
 * Actualiza el nombre comercial, subtítulo, logo y paleta de colores de la rockola del negocio
 * Exclusivo para SuperAdmin (CJ Systems)
 */
router.put('/:businessSlug/branding', async (req, res) => {
  try {
    const isSuper = await checkIsSuperAdmin(req.user)
    if (!isSuper) {
      return res.status(403).json({
        success: false,
        message: 'Solo el administrador de CJ Systems puede modificar la personalización de marca.',
      })
    }

    const business = await resolveBusiness(req.params.businessSlug)
    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }

    const { name, subtitle, logoUrl, primaryColor, secondaryColor, maxSongsPerWindow, windowMinutes } = req.body || {}
    const updatedBranding = await saveBusinessBranding(business.id, {
      name: name || business.name,
      subtitle,
      logoUrl,
      primaryColor,
      secondaryColor,
      maxSongsPerWindow,
      windowMinutes,
    })

    const updatedName = name && name.trim() ? name.trim() : business.name

    return res.json({
      success: true,
      message: `Personalización de "${updatedName}" guardada con éxito`,
      business: {
        ...business,
        name: updatedName,
        branding: updatedBranding,
      },
    })
  } catch (error) {
    console.error('[Update Branding Error]', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al guardar la personalización del negocio',
    })
  }
})

/**
 * GET /api/admin/:businessSlug/history
 * Devuelve el historial real de canciones reproducidas o saltadas
 */
router.get('/:businessSlug/history', async (req, res) => {
  try {
    const business = await resolveBusiness(req.params.businessSlug)
    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)

    const { data, error, count } = await supabaseAdmin
      .from('playlist_queue')
      .select(
        `
        id,
        status,
        requested_at,
        played_at,
        tables ( id, table_name ),
        songs ( id, provider, provider_song_id, title, artist, thumbnail_url, duration )
      `,
        { count: 'exact' }
      )
      .eq('business_id', business.id)
      .in('status', ['played', 'skipped'])
      .order('played_at', { ascending: false, nullsFirst: false })
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return res.json({
      success: true,
      business,
      total: count ?? data?.length ?? 0,
      data: data || [],
    })
  } catch (error) {
    console.error('[Admin History Error]', error)
    return res.status(500).json({ success: false, message: 'Error al obtener historial' })
  }
})

/**
 * GET /api/admin/:businessSlug/stats
 * Devuelve estadísticas reales del establecimiento (cola, reproducidas hoy, mesas activas, top 5)
 */
router.get('/:businessSlug/stats', async (req, res) => {
  try {
    const business = await resolveBusiness(req.params.businessSlug)
    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [
      { count: pendingCount },
      { count: playedTodayCount },
      { count: activeTablesCount },
      { data: recentHistory },
    ] = await Promise.all([
      supabaseAdmin
        .from('playlist_queue')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('status', 'pending'),
      supabaseAdmin
        .from('playlist_queue')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .in('status', ['played', 'playing'])
        .gte('requested_at', startOfToday.toISOString()),
      supabaseAdmin
        .from('tables')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('active', true),
      supabaseAdmin
        .from('playlist_queue')
        .select('songs ( provider_song_id, title, artist, thumbnail_url )')
        .eq('business_id', business.id)
        .in('status', ['played', 'playing'])
        .order('requested_at', { ascending: false })
        .limit(300),
    ])

    const counts = new Map()
    for (const row of recentHistory || []) {
      const s = row.songs
      if (!s?.provider_song_id) continue
      const existing = counts.get(s.provider_song_id)
      if (existing) {
        existing.playCount += 1
      } else {
        counts.set(s.provider_song_id, { ...s, playCount: 1 })
      }
    }

    const topSongs = Array.from(counts.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5)

    return res.json({
      success: true,
      business,
      data: {
        pendingInQueue: pendingCount || 0,
        playedToday: playedTodayCount || 0,
        activeTables: activeTablesCount || 0,
        topSongs,
      },
    })
  } catch (error) {
    console.error('[Admin Stats Error]', error)
    return res.status(500).json({ success: false, message: 'Error al obtener estadísticas' })
  }
})

export default router
