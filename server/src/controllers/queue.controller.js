import supabaseAdmin from '../config/supabase.js'

// Memoria para rastrear solicitudes por dispositivo e IP (ventana de 10 minutos)
const deviceRequestsMap = new Map()

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
 * GET /api/queue/:businessSlug
 * Obtiene la lista actual de canciones en cola y la canción en reproducción
 */
export async function getQueue(req, res) {
  try {
    const { businessSlug } = req.params

    // 1. Obtener el business_id por el slug o id por defecto
    let { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name, slug')
      .or(`slug.eq.${businessSlug},slug.eq.tu-kva,id.eq.a1b2c3d4-0000-0000-0000-000000000001`)
      .limit(1)
      .single()

    if (!business) {
      // Si por alguna razón no lo encuentra, crear/obtener Tu K-VA por defecto
      const { data: fallbackBiz } = await supabaseAdmin
        .from('businesses')
        .upsert(
          { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Tu K-VA', slug: 'tu-kva' },
          { onConflict: 'id' }
        )
        .select('id, name, slug')
        .single()
      business = fallbackBiz
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

    const currentTrack = queue.find((item) => item.status === 'playing') || null
    const pendingQueue = queue.filter((item) => item.status === 'pending')

    return res.json({
      success: true,
      business,
      currentTrack,
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

    // 1. Validar establecimiento con fallback automático
    let { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .or(`slug.eq.${businessSlug},slug.eq.tu-kva,id.eq.a1b2c3d4-0000-0000-0000-000000000001`)
      .limit(1)
      .single()

    if (!business) {
      business = { id: 'a1b2c3d4-0000-0000-0000-000000000001' }
    }

    // 2. Validar mesa por qr_token (o asignar la mesa por defecto si es test)
    let tableId = null
    if (qrToken) {
      const { data: table } = await supabaseAdmin
        .from('tables')
        .select('id, active')
        .eq('qr_token', qrToken)
        .eq('business_id', business.id)
        .single()

      if (table && table.active) {
        tableId = table.id
      }
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

    // 5. Regla Antimonopolio: Límite estricto de 2 canciones por dispositivo o mesa cada 10 minutos
    const isClientOrder = Boolean(qrToken || deviceId)
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip'
    const deviceKey = deviceId ? `dev:${deviceId}` : `ip:${clientIp}`
    const tenMinutesMs = 10 * 60 * 1000
    const now = Date.now()

    if (isClientOrder) {
      // 5.a Por Código QR / Mesa en Base de Datos (máx 2 canciones en 10 min por mesa)
      if (tableId) {
        const tenMinutesAgo = new Date(now - tenMinutesMs).toISOString()
        const { data: recentRequests } = await supabaseAdmin
          .from('playlist_queue')
          .select('id, requested_at')
          .eq('business_id', business.id)
          .eq('table_id', tableId)
          .gte('requested_at', tenMinutesAgo)
          .order('requested_at', { ascending: true })

        if (recentRequests && recentRequests.length >= 2) {
          const oldestTime = new Date(recentRequests[0].requested_at).getTime()
          const minutesRemaining = Math.max(1, Math.ceil((oldestTime + tenMinutesMs - now) / 60000))
          return res.status(429).json({
            success: false,
            message: `Límite alcanzado: Máximo 2 canciones cada 10 minutos por mesa. Podrán pedir otra en aprox. ${minutesRemaining} min.`,
            minutesRemaining,
          })
        }
      }

      // 5.b Por Dispositivo Móvil en Memoria (máx 2 canciones en 10 min por teléfono/dispositivo)
      const currentTimestamps = (deviceRequestsMap.get(deviceKey) || []).filter((t) => t > now - tenMinutesMs)
      if (currentTimestamps.length >= 2) {
        const oldestTime = currentTimestamps[0]
        const minutesRemaining = Math.max(1, Math.ceil((oldestTime + tenMinutesMs - now) / 60000))
        return res.status(429).json({
          success: false,
          message: `Has alcanzado el límite de 2 canciones cada 10 minutos desde este dispositivo. Podrás pedir otra en aprox. ${minutesRemaining} min.`,
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
      const valid = (deviceRequestsMap.get(deviceKey) || []).filter((t) => t > now - tenMinutesMs)
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
