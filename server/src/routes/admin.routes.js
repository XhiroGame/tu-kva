import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import supabaseAdmin from '../config/supabase.js'

const router = Router()

router.use(requireAuth)

async function resolveBusiness(businessSlug) {
  const safeSlug = String(businessSlug || 'tu-kva').replace(/[^a-zA-Z0-9_-]/g, '') || 'tu-kva'
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, name, slug')
    .or(`slug.eq.${safeSlug},slug.eq.tu-kva,id.eq.a1b2c3d4-0000-0000-0000-000000000001`)
    .limit(1)
    .maybeSingle()

  return business || { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Tu K-VA', slug: 'tu-kva' }
}

/**
 * GET /api/admin/:businessSlug/history
 * Devuelve el historial real de canciones reproducidas o saltadas
 */
router.get('/:businessSlug/history', async (req, res) => {
  try {
    const business = await resolveBusiness(req.params.businessSlug)
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
