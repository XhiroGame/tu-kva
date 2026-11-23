import supabaseAdmin from '../config/supabase.js'
import { getBusinessBranding } from '../utils/branding.js'

// Memoria para rastrear solicitudes por dispositivo e IP (ventana de 10 minutos)
const deviceRequestsMap = new Map()

// Heartbeat en tiempo real del Reproductor Central por negocio (detecta si la pestaña del bar está abierta y sonando)
const playerHeartbeatMap = new Map()

// Limpieza periódica cada 15 minutos para evitar acumulación en memoria
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [key, timestamps] of deviceRequestsMap.entries()) {
    const valid = timestamps.filter((t) => t > cutoff)
    if (valid.length === 0) {
      deviceRequestsMap.delete(key)
    } else {
      deviceRequestsMap.set(key, valid)
    }
  }
}, 15 * 60 * 1000)

/**
 * Resuelve un negocio por su slug exacto (manteniendo soporte automático para 'tu-kva')
 */
async function resolveBusinessBySlug(businessSlug) {
  const safeSlug = String(businessSlug || 'tu-kva').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'tu-kva'

  const { data: exactBiz } = await supabaseAdmin
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', safeSlug)
    .maybeSingle()

  if (exactBiz) return exactBiz

  if (safeSlug === 'tu-kva') {
    const { data: defaultBiz } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug')
      .eq('id', 'a1b2c3d4-0000-0000-0000-000000000001')
      .maybeSingle()

    if (defaultBiz) return defaultBiz

    const { data: fallbackBiz } = await supabaseAdmin
      .from('businesses')
      .upsert(
        { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Tu K-VA', slug: 'tu-kva' },
        { onConflict: 'id' }
      )
      .select('id, name, slug')
      .single()
    return fallbackBiz
  }

  return null
}

/**
 * GET /api/queue/:businessSlug
 * Obtiene la lista actual de canciones en cola y la canción en reproducción
 */
export async function getQueue(req, res) {
  try {
    const { businessSlug } = req.params

    // 1. Obtener el business_id por el slug exacto
    const business = await resolveBusinessBySlug(businessSlug)
    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }

    // 2. Obtener la cola activa (playing y pending) ordenada por posición
    const { data: queue, error: qError } = await supabaseAdmin
      .from('playlist_queue')
      .select(`
        id,
        status,
        position,
        requested_at,
        played_at,
        table_id,
        tables ( id, table_name ),
        songs ( id, provider, provider_song_id, title, artist, thumbnail_url, duration, stream_url )
      `)
      .eq('business_id', business.id)
      .in('status', ['playing', 'pending'])
      .order('position', { ascending: true })

    if (qError) throw qError

    let currentTrack = queue.find((item) => item.status === 'playing') || null
    const pendingQueue = queue.filter((item) => item.status === 'pending')

    // Auto-expirar canción "playing" si el reproductor del bar se cerró y ya superó su duración (+ 2 min margen)
    if (currentTrack) {
      const startedAt = new Date(currentTrack.played_at || currentTrack.requested_at).getTime()
      const trackDurationSec = Number(currentTrack.songs?.duration) || 360
      const maxValidMs = (trackDurationSec + 120) * 1000

      if (!isNaN(startedAt) && Date.now() - startedAt > maxValidMs) {
        await supabaseAdmin
          .from('playlist_queue')
          .update({ status: 'played' })
          .eq('id', currentTrack.id)
        currentTrack = null
      }
    }

    const hb = playerHeartbeatMap.get(business.id)
    const isPlayerActive = Boolean(hb && Date.now() - hb.lastSeen < 20000 && hb.isPlaying)
    const isPlayerRequest = req.query.role === 'player'

    // Para clientes en mesa:
    // - Si hay pedido de mesa en estado 'playing' y el reproductor está activo, mostrarlo.
    // - Si NO hay pedido en BD pero el reproductor está tocando una canción aleatoria/ambiente,
    //   mostrar la canción real reportada por el heartbeat del reproductor.
    let visibleCurrentTrack = null
    if (isPlayerRequest) {
      visibleCurrentTrack = currentTrack
    } else if (isPlayerActive) {
      visibleCurrentTrack = currentTrack || hb?.currentTrack || null
    }

    const branding = await getBusinessBranding(business.id)

    return res.json({
      success: true,
      business: {
        ...business,
        branding,
      },
      playerActive: isPlayerActive,
      currentTrack: visibleCurrentTrack,
      queue: pendingQueue,
    })
  } catch (error) {
    console.error('[Get Queue Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * POST /api/queue
 * Agrega una canción a la cola desde la mesa del cliente
 * Body: { businessSlug, qrToken, song }
 */
export async function addToQueue(req, res) {
  try {
    const { businessSlug, qrToken, song, deviceId } = req.body

    if (!song || !song.provider_song_id) {
      return res.status(400).json({ success: false, message: 'Datos de canción incompletos' })
    }

    // 1. Validar establecimiento por slug exacto
    const business = await resolveBusinessBySlug(businessSlug)
    if (!business) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' })
    }

    // 2. Validar mesa por qr_token (obligatorio para clientes no autenticados)
    const isAdminOrDj = Boolean(req.user)
    let tableId = null

    if (qrToken) {
      const { data: table } = await supabaseAdmin
        .from('tables')
        .select('id, active')
        .eq('qr_token', qrToken)
        .eq('business_id', business.id)
        .maybeSingle()

      if (table && table.active) {
        tableId = table.id
      }
    }

    if (!isAdminOrDj && !tableId) {
      return res.status(403).json({
        success: false,
        message: 'Código QR de mesa inválido o inactivo. Escanea el código QR de tu mesa para pedir canciones.',
      })
    }

    // 3. Regla de Duración Máxima (máx 10 minutos / 600 segundos)
    const MAX_DURATION_SECONDS = 600
    if (song.duration && song.duration > MAX_DURATION_SECONDS) {
      return res.status(400).json({
        success: false,
        message: 'La canción es demasiado larga (máximo 10 minutos para mantener la rotación)',
      })
    }

    // 4. Regla de Duplicados Activos: verificar si la canción ya está en cola o sonando
    const { data: existingInQueue } = await supabaseAdmin
      .from('playlist_queue')
      .select('id, status, songs!inner(provider_song_id)')
      .eq('business_id', business.id)
      .in('status', ['pending', 'playing'])
      .eq('songs.provider_song_id', String(song.provider_song_id))
      .limit(1)

    if (existingInQueue && existingInQueue.length > 0) {
      return res.status(400).json({
        success: false,
        message: '¡Esta canción ya está en la playlist o sonando en este momento!',
      })
    }

    // 5. Regla Antimonopolio configurable por negocio (ej: 1 canción c/ 15 min, o 2 canciones c/ 10 min)
    const bizConfig = await getBusinessBranding(business.id)
    const maxSongsPerWindow = Math.max(1, parseInt(bizConfig?.maxSongsPerWindow, 10) || 2)
    const windowMinutes = Math.max(1, parseInt(bizConfig?.windowMinutes, 10) || 10)
    const windowMs = windowMinutes * 60 * 1000
    const songsLabel = maxSongsPerWindow === 1 ? '1 canción' : `${maxSongsPerWindow} canciones`

    const isClientOrder = !isAdminOrDj
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip'
    const deviceKey = `${business.id}:${deviceId ? `dev:${deviceId}` : `ip:${clientIp}`}`
    const now = Date.now()

    if (isClientOrder) {
      // 5.a Por Código QR / Mesa en Base de Datos
      if (tableId) {
        const windowAgoIso = new Date(now - windowMs).toISOString()
        const { data: recentRequests } = await supabaseAdmin
          .from('playlist_queue')
          .select('id, requested_at')
          .eq('business_id', business.id)
          .eq('table_id', tableId)
          .gte('requested_at', windowAgoIso)
          .order('requested_at', { ascending: true })

        if (recentRequests && recentRequests.length >= maxSongsPerWindow) {
          const oldestTime = new Date(recentRequests[0].requested_at).getTime()
          const minutesRemaining = Math.max(1, Math.ceil((oldestTime + windowMs - now) / 60000))
          return res.status(429).json({
            success: false,
            message: `Límite alcanzado: Máximo ${songsLabel} cada ${windowMinutes} minutos por mesa. Podrán pedir otra en aprox. ${minutesRemaining} min.`,
            minutesRemaining,
          })
        }
      }

      // 5.b Por Dispositivo Móvil en Memoria
      const currentTimestamps = (deviceRequestsMap.get(deviceKey) || []).filter((t) => t > now - windowMs)
      if (currentTimestamps.length >= maxSongsPerWindow) {
        const oldestTime = currentTimestamps[0]
        const minutesRemaining = Math.max(1, Math.ceil((oldestTime + windowMs - now) / 60000))
        return res.status(429).json({
          success: false,
          message: `Has alcanzado el límite de ${songsLabel} cada ${windowMinutes} minutos desde este dispositivo. Podrás pedir otra en aprox. ${minutesRemaining} min.`,
          minutesRemaining,
        })
      }
    }

    // 6. Asegurar que la canción esté registrada en la tabla songs
    const { data: savedSong, error: songError } = await supabaseAdmin
      .from('songs')
      .upsert(
        {
          provider: song.provider || 'youtube',
          provider_song_id: String(song.provider_song_id),
          title: song.title,
          artist: song.artist,
          album: song.album || null,
          thumbnail_url: song.thumbnail_url,
          duration: song.duration || 0,
          stream_url: song.stream_url,
        },
        { onConflict: 'provider,provider_song_id' }
      )
      .select('id')
      .single()

    if (songError) throw songError

    // 7. Calcular la siguiente posición en la cola
    const { data: maxPositionData } = await supabaseAdmin
      .from('playlist_queue')
      .select('position')
      .eq('business_id', business.id)
      .in('status', ['pending', 'playing'])
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = (maxPositionData?.[0]?.position ?? -1) + 1

    // 8. Insertar en playlist_queue
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('playlist_queue')
      .insert({
        business_id: business.id,
        table_id: tableId,
        song_id: savedSong.id,
        status: 'pending',
        position: nextPosition,
        requested_at: new Date().toISOString(),
      })
      .select(`
        id,
        status,
        position,
        songs (*)
      `)
      .single()

    if (queueError) throw queueError

    // 9. Registrar pedido en el historial en memoria del dispositivo
    if (isClientOrder) {
      const valid = (deviceRequestsMap.get(deviceKey) || []).filter((t) => t > now - windowMs)
      valid.push(now)
      deviceRequestsMap.set(deviceKey, valid)
    }

    return res.json({
      success: true,
      message: 'Canción agregada a la playlist con éxito',
      data: queueItem,
    })
  } catch (error) {
    console.error('[Add To Queue Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * PATCH /api/queue/:itemId
 * Cambia el estado de una canción en la cola (playing, played, skipped)
 */
export async function updateQueueStatus(req, res) {
  try {
    const { itemId } = req.params
    const { status } = req.body // 'playing' | 'played' | 'skipped'

    const updateData = { status }
    if (status === 'playing') {
      updateData.played_at = new Date().toISOString()

      // Garantizar que ninguna otra canción quede en estado 'playing' simultáneamente
      const { data: targetItem } = await supabaseAdmin
        .from('playlist_queue')
        .select('business_id')
        .eq('id', itemId)
        .single()

      if (targetItem?.business_id) {
        await supabaseAdmin
          .from('playlist_queue')
          .update({ status: 'played' })
          .eq('business_id', targetItem.business_id)
          .eq('status', 'playing')
          .neq('id', itemId)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('playlist_queue')
      .update(updateData)
      .eq('id', itemId)
      .select(`
        id,
        status,
        position,
        requested_at,
        played_at,
        table_id,
        tables ( id, table_name ),
        songs ( id, provider, provider_song_id, title, artist, thumbnail_url, duration, stream_url )
      `)
      .single()

    if (error) throw error

    return res.json({ success: true, data })
  } catch (error) {
    console.error('[Update Queue Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * POST /api/queue/:businessSlug/heartbeat
 * Registra que el Reproductor Central del bar está abierto y reporta si está reproduciendo audio
 */
export async function playerHeartbeat(req, res) {
  try {
    const isPlaying = Boolean(req.body?.isPlaying)
    const rawTrack = req.body?.currentTrack || null
    const sanitizedTrack =
      rawTrack && rawTrack.songs && rawTrack.songs.title
        ? {
            id: rawTrack.id || 'ambient-live',
            isFallback: Boolean(rawTrack.isFallback),
            tables: {
              table_name:
                rawTrack.tables?.table_name ||
                (rawTrack.isFallback ? 'Música ambiental del bar' : 'El Bar'),
            },
            songs: {
              provider_song_id: rawTrack.songs.provider_song_id || '',
              title: String(rawTrack.songs.title),
              artist: String(rawTrack.songs.artist || 'Artista'),
              thumbnail_url: rawTrack.songs.thumbnail_url || null,
              duration: Number(rawTrack.songs.duration) || 0,
            },
          }
        : null

    const business = await resolveBusinessBySlug(req.params.businessSlug)
    const businessId = business?.id || 'a1b2c3d4-0000-0000-0000-000000000001'
    playerHeartbeatMap.set(businessId, {
      lastSeen: Date.now(),
      isPlaying,
      currentTrack: isPlaying ? sanitizedTrack : null,
    })

    return res.json({ success: true, playerActive: isPlaying })
  } catch (error) {
    console.error('[Player Heartbeat Error]', error)
    return res.status(500).json({ success: false, message: 'Error registrando heartbeat' })
  }
}

/**
 * PUT /api/queue/reorder
 * Reordena las posiciones de las canciones pendientes en la fila (drag & drop desde el reproductor)
 * Body: { orderedIds: string[] }
 */
export async function reorderQueue(req, res) {
  try {
    const { orderedIds } = req.body || {}
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere una lista de IDs ordenados' })
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        supabaseAdmin
          .from('playlist_queue')
          .update({ position: index })
          .eq('id', id)
          .eq('status', 'pending')
      )
    )

    return res.json({ success: true, message: 'Orden actualizado correctamente' })
  } catch (error) {
    console.error('[Reorder Queue Error]', error)
    return res.status(500).json({ success: false, message: 'Error al reordenar la fila' })
  }
}

/**
 * DELETE /api/queue/:itemId
 * Elimina una canción de la cola (moderación administrativa)
 */
export async function removeFromQueue(req, res) {
  try {
    const { itemId } = req.params

    const { error } = await supabaseAdmin
      .from('playlist_queue')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    return res.json({ success: true, message: 'Canción eliminada de la cola' })
  } catch (error) {
    console.error('[Remove Queue Error]', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}
