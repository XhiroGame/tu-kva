import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, ListMusic, Sparkles, AlertCircle, Clock, Disc3, Loader2 } from 'lucide-react'

// Componentes UI
import ClientHeader from '@/components/ui/ClientHeader'
import SearchBar from '@/components/ui/SearchBar'
import SongCard from '@/components/queue/SongCard'
import NowPlaying from '@/components/queue/NowPlaying'
import QueueList from '@/components/queue/QueueList'

// APIs y Supabase Realtime
import { searchSongs, addToQueue, getQueue, validateTable } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { applyBusinessTheme } from '@/lib/theme'

// Helpers para control antimonopolio (2 canciones cada 10 min por dispositivo)
function getDeviceId() {
  try {
    let id = localStorage.getItem('tukva_device_id')
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
      localStorage.setItem('tukva_device_id', id)
    }
    return id
  } catch {
    return 'dev-anon-' + Date.now()
  }
}

function getRecentRequests(windowMinutes = 10, businessSlug = 'tu-kva') {
  try {
    const storageKey = `tukva_order_history_${businessSlug}`
    const raw = localStorage.getItem(storageKey) || (businessSlug === 'tu-kva' ? localStorage.getItem('tukva_order_history') : null)
    if (!raw) return []
    const list = JSON.parse(raw)
    const windowAgo = Date.now() - windowMinutes * 60 * 1000
    return list.filter((ts) => ts > windowAgo)
  } catch {
    return []
  }
}

function recordLocalRequest(windowMinutes = 10, businessSlug = 'tu-kva') {
  try {
    const storageKey = `tukva_order_history_${businessSlug}`
    const valid = getRecentRequests(windowMinutes, businessSlug)
    valid.push(Date.now())
    localStorage.setItem(storageKey, JSON.stringify(valid))
    return valid
  } catch {
    return []
  }
}

// Búsqueda por texto libre (sin chips de géneros)

export default function ClientPage() {
  const { businessSlug = 'tu-kva', qrToken = 'test-qr-token-mesa-1' } = useParams()

  // Estados de navegación
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'queue'
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [addedSongIds, setAddedSongIds] = useState(new Set())
  const [addingSongId, setAddingSongId] = useState(null)

  // Referencias de optimización para búsquedas instantáneas
  const clientSearchCache = useRef(new Map())
  const activeAbortController = useRef(null)

  // Estados de mesa y establecimiento
  const [tableId, setTableId] = useState(null)
  const [tableName, setTableName] = useState('Cargando mesa...')
  const [tableStatus, setTableStatus] = useState('loading') // 'loading' | 'valid' | 'invalid'
  const [businessName, setBusinessName] = useState('Tu K-VA')
  const [businessBranding, setBusinessBranding] = useState({
    subtitle: 'Cervecería & Música',
    logoUrl: '',
    primaryColor: '#f59e0b',
    secondaryColor: '#f97316',
    maxSongsPerWindow: 2,
    windowMinutes: 10,
  })

  const maxSongsLimit = Math.max(1, parseInt(businessBranding?.maxSongsPerWindow, 10) || 2)
  const windowMinutesLimit = Math.max(1, parseInt(businessBranding?.windowMinutes, 10) || 10)

  // Playlist en tiempo real
  const [currentTrack, setCurrentTrack] = useState(null)
  const [queue, setQueue] = useState([])

  // Control de cuota antimonopolio configurable por negocio
  const [recentRequests, setRecentRequests] = useState(() =>
    getRecentRequests(10, businessSlug)
  )

  useEffect(() => {
    setRecentRequests(getRecentRequests(windowMinutesLimit, businessSlug))
    const timer = setInterval(() => {
      setRecentRequests(getRecentRequests(windowMinutesLimit, businessSlug))
    }, 10000)
    return () => clearInterval(timer)
  }, [windowMinutesLimit, businessSlug])

  // 0. Validar el token QR una sola vez (no en cada polling de 3s)
  useEffect(() => {
    let isMounted = true
    const checkTable = async () => {
      if (!qrToken) {
        if (isMounted) setTableStatus('invalid')
        return
      }
      setTableStatus('loading')
      try {
        const tableRes = await validateTable(qrToken)
        if (!isMounted) return
        if (tableRes?.success && tableRes.data?.active !== false && tableRes.data?.tableName) {
          setTableId(tableRes.data.tableId || null)
          setTableName(tableRes.data.tableName)
          if (tableRes.data.businessName) {
            setBusinessName(tableRes.data.businessName)
          }
          if (tableRes.data.branding) {
            setBusinessBranding((prev) => ({ ...prev, ...tableRes.data.branding }))
            applyBusinessTheme(tableRes.data.branding)
          }
          setTableStatus('valid')
        } else {
          setTableStatus('invalid')
        }
      } catch (tErr) {
        console.warn('Error validando mesa:', tErr)
        if (isMounted) setTableStatus('invalid')
      }
    }
    checkTable()
    return () => {
      isMounted = false
    }
  }, [qrToken])

  // 1. Cargar cola y estado inicial desde la base de datos
  const fetchQueueData = async () => {
    try {
      const response = await getQueue(businessSlug)
      if (response?.success) {
        if (response.business?.name) setBusinessName(response.business.name)
        if (response.business?.branding) {
          setBusinessBranding((prev) => ({ ...prev, ...response.business.branding }))
          applyBusinessTheme(response.business.branding)
        }

        // Canción sonando actualmente
        if (response.currentTrack) {
          const ct = response.currentTrack
          setCurrentTrack({
            title: ct.songs?.title || 'Canción en reproducción',
            artist: ct.songs?.artist || 'Artista',
            thumbnail_url: ct.songs?.thumbnail_url,
            duration: ct.songs?.duration || 0,
            tableName: ct.tables?.table_name || 'El Bar',
          })
        } else {
          setCurrentTrack(null)
        }

        // Cola de espera
        setQueue(response.queue || [])
      }
    } catch (error) {
      console.warn('Error al obtener la playlist:', error)
    }
  }

  // 2. Suscripción en Tiempo Real con Supabase Realtime + Intervalo de respaldo (8s)
  useEffect(() => {
    fetchQueueData()

    // Canal WebSocket en vivo
    const channel = supabase
      .channel('client-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'playlist_queue' },
        () => {
          fetchQueueData()
        }
      )
      .subscribe()

    const interval = setInterval(() => {
      fetchQueueData()
    }, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [businessSlug, qrToken])

  // 3. Catálogo sugerido inicial al cargar
  useEffect(() => {
    loadSuggestedSongs()
  }, [])

  const loadSuggestedSongs = async () => {
    const defaultKey = '__default_catalog__'
    if (clientSearchCache.current.has(defaultKey)) {
      setSearchResults(clientSearchCache.current.get(defaultKey))
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      // Consulta vacía devuelve al instante el catálogo popular guardado en Supabase del bar
      const response = await searchSongs('', { limit: 25 })
      if (response?.data) {
        const filtered = response.data.filter((s) => s.duration > 30 && s.duration < 600)
        clientSearchCache.current.set(defaultKey, filtered)
        setSearchResults(filtered)
      }
    } catch (error) {
      console.warn('Error cargando catálogo inicial:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 4. Función de búsqueda centralizada
  const performSearch = async (queryText) => {
    const q = (queryText || '').trim()
    if (!q) {
      loadSuggestedSongs()
      return
    }

    const cacheKey = q.toLowerCase()

    // Respuesta inmediata desde caché local en memoria
    if (clientSearchCache.current.has(cacheKey)) {
      setSearchResults(clientSearchCache.current.get(cacheKey))
      setIsSearching(false)
      return
    }

    // Cancelar consulta previa en curso
    if (activeAbortController.current) {
      activeAbortController.current.abort()
    }
    activeAbortController.current = new AbortController()

    setIsSearching(true)

    try {
      const response = await searchSongs(q, {
        limit: 30,
        signal: activeAbortController.current.signal,
      })
      if (response?.data) {
        const filtered = response.data.filter((s) => s.duration > 30 && s.duration < 600)
        clientSearchCache.current.set(cacheKey, filtered)
        setSearchResults(filtered)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('Error al buscar canciones:', error)
      }
    } finally {
      setIsSearching(false)
    }
  }

  // 5. Manejador de cambio en el input: activa de inmediato el estado de carga
  const handleQueryChange = (val) => {
    setSearchQuery(val)
    if (val.trim()) {
      setIsSearching(true)
    } else {
      setIsSearching(false)
      loadSuggestedSongs()
    }
  }

  // 6. Debounce para ejecutar la búsqueda tras 320ms de inactividad
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      return
    }

    const cacheKey = q.toLowerCase()
    if (clientSearchCache.current.has(cacheKey)) {
      setSearchResults(clientSearchCache.current.get(cacheKey))
      setIsSearching(false)
      return
    }

    const timer = setTimeout(() => {
      performSearch(q)
    }, 320)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Búsqueda inmediata al pulsar Enter o tocar un chip de género
  const handleImmediateSearch = (queryText) => {
    setSearchQuery(queryText)
    setIsSearching(true)
    performSearch(queryText)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
    loadSuggestedSongs()
  }

  // 7. Enviar pedido a la base de datos real con control antimonopolio configurable por negocio
  const handleAddSong = async (song) => {
    const currentRecent = getRecentRequests(windowMinutesLimit, businessSlug)
    if (currentRecent.length >= maxSongsLimit) {
      const oldest = Math.min(...currentRecent)
      const minutesRemaining = Math.max(1, Math.ceil((oldest + windowMinutesLimit * 60 * 1000 - Date.now()) / 60000))
      const songsText = maxSongsLimit === 1 ? '1 canción' : `${maxSongsLimit} canciones`
      toast.error(
        `Límite alcanzado: Máximo ${songsText} cada ${windowMinutesLimit} minutos. Podrás pedir otra en aprox. ${minutesRemaining} min.`,
        { id: 'rate-limit-toast', duration: 4500 }
      )
      return
    }

    setAddingSongId(song.provider_song_id)

    try {
      const result = await addToQueue({
        businessSlug,
        qrToken,
        deviceId: getDeviceId(),
        song,
      })

      if (result.success) {
        setAddedSongIds((prev) => new Set(prev).add(song.provider_song_id))
        recordLocalRequest(windowMinutesLimit, businessSlug)
        const updatedRequests = getRecentRequests(windowMinutesLimit, businessSlug)
        setRecentRequests(updatedRequests)

        // Refrescar de inmediato la cola local
        await fetchQueueData()

        const remaining = Math.max(0, maxSongsLimit - updatedRequests.length)
        toast.success(
          <div>
            <p className="font-bold">¡Canción agregada!</p>
            <p className="text-xs text-gray-300">"{song.title}" entró a los turnos</p>
            <p className="text-[11px] text-beer-400 font-semibold mt-1">
              {remaining > 0
                ? `Te ${remaining === 1 ? 'queda 1 pedido disponible' : `quedan ${remaining} pedidos disponibles`} en este turno de ${windowMinutesLimit} min`
                : `Has utilizado ${maxSongsLimit === 1 ? 'tu pedido' : `tus ${maxSongsLimit} pedidos`} de este turno de ${windowMinutesLimit} min`}
            </p>
          </div>,
          { duration: 4000 }
        )
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo agregar la canción')
      setRecentRequests(getRecentRequests(windowMinutesLimit, businessSlug))
    } finally {
      setAddingSongId(null)
    }
  }

  const isTypingSearch = activeTab === 'search' && searchQuery.trim().length > 0

  if (tableStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-dark-200 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full card p-6 rounded-3xl border border-red-500/30 bg-dark-50/90 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-display font-bold text-white">
            Código QR no válido
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Esta mesa no existe o fue desactivada. Por favor escanea nuevamente el código QR ubicado en tu mesa en <span className="text-beer-400 font-semibold">{businessName}</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-200 text-white flex flex-col justify-between selection:bg-beer-500 selection:text-black w-full overflow-x-hidden">
      <div className="w-full max-w-lg mx-auto px-3.5 py-2.5 pb-24 sm:py-5 sm:px-4">
        {/* Cabecera compacta de la mesa con marca personalizada del negocio */}
        <ClientHeader
          businessName={businessName}
          subtitle={businessBranding.subtitle}
          logoUrl={businessBranding.logoUrl}
          tableName={tableName}
        />

        {/* Indicador visual de cuota antimonopolio configurable por negocio */}
        <div className="mt-2.5 px-3 py-1.5 rounded-2xl bg-dark-50/80 border border-beer-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Clock className="w-3.5 h-3.5 text-beer-400 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs text-gray-300">Turno de pedidos:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                recentRequests.length >= maxSongsLimit
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-beer-500/20 text-beer-400 border-beer-500/30'
              }`}
            >
              {recentRequests.length >= maxSongsLimit
                ? `Límite alcanzado (${maxSongsLimit}/${maxSongsLimit})`
                : `${Math.max(0, maxSongsLimit - recentRequests.length)} de ${maxSongsLimit} ${
                    maxSongsLimit === 1 ? 'disponible' : 'disponibles'
                  }`}
            </span>
            <span className="text-[10px] text-gray-500 hidden xs:inline">(c/ {windowMinutesLimit} min)</span>
          </div>
        </div>

        {/* Canción en reproducción (Mini en búsqueda activa para liberar espacio de pantalla) */}
        <div className="mt-3 mb-4">
          <NowPlaying song={currentTrack} compact={isTypingSearch} />
        </div>

        {/* Selector de Pestañas (Tabs) */}
        <div className="grid grid-cols-2 p-1 bg-dark-100 rounded-2xl border border-dark-border/60 mb-3.5">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all touch-manipulation ${
              activeTab === 'search'
                ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar Canciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all relative touch-manipulation ${
              activeTab === 'queue'
                ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Playlist del Bar</span>
            {queue.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'queue'
                    ? 'bg-dark-200 text-beer-400'
                    : 'bg-beer-500/20 text-beer-400'
                }`}
              >
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* PESTAÑA 1: BUSCADOR DE CANCIONES */}
        {activeTab === 'search' && (
          <div className="space-y-3 animate-fade-in w-full max-w-full">
            {/* Barra de Búsqueda con Chips Rápidos */}
            <SearchBar
              value={searchQuery}
              onChange={handleQueryChange}
              onSearch={handleImmediateSearch}
              onClear={handleClearSearch}
              isLoading={isSearching}
            />

            {/* Subtítulo de estado de resultados */}
            <div className="flex items-center justify-between pt-0.5 px-0.5">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                <Sparkles className="w-3.5 h-3.5 text-beer-400" />
                <span>
                  {searchQuery ? 'Resultados' : 'Canciones Recomendadas'}
                </span>
              </div>
              <span className="text-[11px] text-gray-500">
                {isSearching ? 'Buscando...' : `${searchResults.length} canciones`}
              </span>
            </div>

            {/* Pantalla de Espera Visual Dinámica mientras busca */}
            {isSearching ? (
              <div className="space-y-3 animate-fade-in my-1 w-full max-w-full">
                {/* Símbolo e Icono de Espera Destacado */}
                <div className="card p-6 text-center rounded-3xl bg-dark-50/95 border border-beer-500/40 shadow-xl shadow-beer/10">
                  <div className="relative w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                    <Disc3 className="w-14 h-14 text-beer-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <h4 className="font-extrabold text-white text-base sm:text-lg flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-beer-400 animate-spin" />
                    <span>Buscando canciones...</span>
                  </h4>
                  <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
                    Consultando canciones en el catálogo oficial para:
                  </p>
                  <div className="inline-block mt-2 px-3.5 py-1 bg-beer-500/15 border border-beer-500/30 rounded-full text-xs font-bold text-beer-400">
                    "{searchQuery || 'éxitos'}"
                  </div>
                </div>

                {/* Skeletons animados de carga proporcionales para no desbordar */}
                <div className="space-y-2 opacity-60">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="flex items-center p-2.5 sm:p-3 gap-2.5 sm:gap-3 bg-dark-50/60 border border-white/5 rounded-2xl animate-pulse w-full max-w-full"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-3.5 bg-white/10 rounded-md w-3/4" />
                        <div className="h-2.5 bg-white/5 rounded-md w-1/2" />
                      </div>
                      <div className="w-16 sm:w-20 h-9 sm:h-10 bg-white/10 rounded-xl flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((song) => (
                  <SongCard
                    key={song.provider_song_id}
                    song={song}
                    onAdd={handleAddSong}
                    isAdding={addingSongId === song.provider_song_id}
                    isAdded={addedSongIds.has(song.provider_song_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center border-dashed border-dark-border/80 rounded-2xl bg-dark-50/40">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="font-bold text-white text-sm">Sin coincidencias para "{searchQuery}"</p>
                <p className="text-xs text-gray-400 mt-1">
                  Prueba buscando por otro título o nombre del artista.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: PLAYLIST ACTUAL / COLA */}
        {activeTab === 'queue' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400">
                Turnos en espera
              </h3>
              <span className="text-xs text-beer-400 bg-beer-500/10 border border-beer-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                Sincronizado en vivo
              </span>
            </div>

            {/* Lista de reproducción */}
            <QueueList queue={queue} currentTableId={tableId} />
          </div>
        )}

        {/* Firma CJ Systems — Ing. Ciro José (Generador orgánico de prospectos B2B en cada mesa) */}
        <footer className="mt-10 pt-5 border-t border-white/10 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-beer-500 animate-pulse" />
            <span>
              Tecnología por <strong className="text-beer-400 font-bold">CJ Systems</strong> • Ing. Ciro José
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            ¿Tienes un bar, restaurante o negocio?{' '}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-beer-400 hover:text-beer-300 underline font-semibold transition-colors"
            >
              Conoce CJ Systems
            </a>
            {' • '}
            <a
              href={`https://wa.me/573118715006?text=${encodeURIComponent(
                `¡Hola Ing. Ciro José! Estoy usando el sistema musical QR en ${businessName} y me gustaría implementarlo en mi negocio.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 underline font-semibold transition-colors"
            >
              WhatsApp: 311 871 5006
            </a>
          </p>
        </footer>
      </div>

      {/* Barra flotante para ver la playlist si agregó canciones */}
      {addedSongIds.size > 0 && activeTab === 'search' && (
        <div className="fixed bottom-3 inset-x-3.5 max-w-lg mx-auto z-50">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className="w-full btn-primary flex items-center justify-between py-3 px-4 sm:py-3.5 sm:px-5 shadow-beer-lg touch-manipulation"
          >
            <div className="flex items-center gap-2 text-dark-200">
              <ListMusic className="w-5 h-5" />
              <span className="font-black text-xs sm:text-sm">Ver la playlist en vivo</span>
            </div>
            <span className="bg-dark-200 text-beer-400 text-xs font-black px-2 py-0.5 rounded-full">
              {queue.length} en espera
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
