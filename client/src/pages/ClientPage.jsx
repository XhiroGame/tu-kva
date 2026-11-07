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

function getRecentRequests() {
  try {
    const raw = localStorage.getItem('tukva_order_history')
    if (!raw) return []
    const list = JSON.parse(raw)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    return list.filter((ts) => ts > tenMinutesAgo)
  } catch {
    return []
  }
}

function recordLocalRequest() {
  try {
    const valid = getRecentRequests()
    valid.push(Date.now())
    localStorage.setItem('tukva_order_history', JSON.stringify(valid))
    return valid
  } catch {
    return []
  }
}

// Géneros rápidos recomendados para pedir con un solo toque en el bar
const QUICK_GENRES = [
  { label: '🔥 Éxitos Populares', query: 'exitos populares canciones' },
  { label: '🌴 Reggaetón', query: 'reggaeton exitos' },
  { label: '🎸 Rock', query: 'rock clasico exitos' },
  { label: '💃 Salsa', query: 'salsa clasica exitos' },
  { label: '🤠 Vallenato', query: 'vallenato clasicos' },
  { label: '🎺 Bachata', query: 'bachata exitos' },
  { label: '⚡ Pop Latino', query: 'pop latino exitos' },
  { label: '🎧 Electrónica', query: 'dance electronic music' },
]

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
  const [tableName, setTableName] = useState('Mesa 1')
  const [businessName, setBusinessName] = useState('Tu K-VA')

  // Playlist en tiempo real
  const [currentTrack, setCurrentTrack] = useState(null)
  const [queue, setQueue] = useState([])

  // Control de cuota antimonopolio (máximo 2 pedidos cada 10 min)
  const [recentRequests, setRecentRequests] = useState(getRecentRequests)

  useEffect(() => {
    const timer = setInterval(() => {
      setRecentRequests(getRecentRequests())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // 1. Cargar cola y estado inicial desde la base de datos
  const fetchQueueData = async () => {
    try {
      const response = await getQueue(businessSlug)
      if (response?.success) {
        if (response.business?.name) setBusinessName(response.business.name)

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

      // Obtener el nombre real de la mesa validando el token contra el servidor
      if (qrToken) {
        try {
          const tableRes = await validateTable(qrToken)
          if (tableRes?.success && tableRes.data?.tableName) {
            setTableName(tableRes.data.tableName)
            if (tableRes.data.businessName) {
              setBusinessName(tableRes.data.businessName)
            }
          }
        } catch (tErr) {
          console.warn('Error validando mesa:', tErr)
        }
      }
    } catch (error) {
      console.warn('Error al obtener la playlist:', error)
    }
  }

  // 2. Suscripción en Tiempo Real con Supabase Realtime + Intervalo
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
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [businessSlug])

  // 3. Catálogo sugerido al cargar
  useEffect(() => {
    loadSuggestedSongs()
  }, [])

  const loadSuggestedSongs = async () => {
    const defaultKey = '__default_catalog__'
    if (clientSearchCache.current.has(defaultKey)) {
      setSearchResults(clientSearchCache.current.get(defaultKey))
      return
    }

    setIsSearching(true)
    try {
      const response = await searchSongs('rock clasico éxitos', { limit: 25 })
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

  // 5. Búsqueda en vivo optimizada con Debounce (NO bloquea el teclado al escribir)
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      loadSuggestedSongs()
      return
    }

    const cacheKey = q.toLowerCase()
    if (clientSearchCache.current.has(cacheKey)) {
      setSearchResults(clientSearchCache.current.get(cacheKey))
      setIsSearching(false)
      return
    }

    // Esperar 320ms sin escribir antes de activar el indicador de búsqueda y consultar
    const timer = setTimeout(() => {
      performSearch(q)
    }, 320)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Búsqueda inmediata al pulsar Enter o tocar un chip de género
  const handleImmediateSearch = (queryText) => {
    setSearchQuery(queryText)
    performSearch(queryText)
  }

  // 6. Enviar pedido a la base de datos real con control antimonopolio (2 canciones cada 10 min)
  const handleAddSong = async (song) => {
    const currentRecent = getRecentRequests()
    if (currentRecent.length >= 2) {
      const oldest = Math.min(...currentRecent)
      const minutesRemaining = Math.max(1, Math.ceil((oldest + 10 * 60 * 1000 - Date.now()) / 60000))
      toast.error(
        `Límite alcanzado: Máximo 2 canciones cada 10 minutos. Podrás pedir otra en aprox. ${minutesRemaining} min.`,
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
        recordLocalRequest()
        const updatedRequests = getRecentRequests()
        setRecentRequests(updatedRequests)

        // Refrescar de inmediato la cola local
        await fetchQueueData()

        const remaining = Math.max(0, 2 - updatedRequests.length)
        toast.success(
          <div>
            <p className="font-bold">¡Canción agregada!</p>
            <p className="text-xs text-gray-300">"{song.title}" entró a los turnos</p>
            <p className="text-[11px] text-beer-400 font-semibold mt-1">
              {remaining > 0
                ? `Te queda ${remaining} pedido disponible en este turno de 10 min`
                : 'Has utilizado tus 2 pedidos de este turno de 10 min'}
            </p>
          </div>,
          { duration: 4000 }
        )
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo agregar la canción')
      setRecentRequests(getRecentRequests())
    } finally {
      setAddingSongId(null)
    }
  }

  const isTypingSearch = activeTab === 'search' && searchQuery.trim().length > 0

  return (
    <div className="min-h-screen bg-dark-200 text-white flex flex-col justify-between selection:bg-beer-500 selection:text-black w-full overflow-x-hidden">
      <div className="w-full max-w-lg mx-auto px-3.5 py-2.5 pb-24 sm:py-5 sm:px-4">
        {/* Cabecera compacta de la mesa */}
        <ClientHeader businessName={businessName} tableName={tableName} />

        {/* Indicador visual de cuota antimonopolio (2 canciones cada 10 min) */}
        <div className="mt-2.5 px-3 py-1.5 rounded-2xl bg-dark-50/80 border border-beer-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Clock className="w-3.5 h-3.5 text-beer-400 flex-shrink-0" />
            <span className="text-[11px] sm:text-xs text-gray-300">Turno de pedidos:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                recentRequests.length >= 2
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-beer-500/20 text-beer-400 border-beer-500/30'
              }`}
            >
              {recentRequests.length >= 2
                ? 'Límite alcanzado (2/2)'
                : `${2 - recentRequests.length} de 2 disponibles`}
            </span>
            <span className="text-[10px] text-gray-500 hidden xs:inline">(c/ 10 min)</span>
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
              onChange={setSearchQuery}
              onSearch={handleImmediateSearch}
              onClear={() => setSearchQuery('')}
              isLoading={isSearching}
              chips={QUICK_GENRES}
              onSelectChip={handleImmediateSearch}
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

            {/* Pantalla de Espera Visual mientras busca */}
            {isSearching ? (
              <div className="space-y-3 animate-fade-in my-1 w-full max-w-full">
                {/* Símbolo e Icono de Espera Destacado */}
                <div className="card p-5 text-center rounded-2xl bg-dark-50/95 border border-beer-500/40 shadow-xl shadow-beer/10">
                  <div className="relative w-12 h-12 mx-auto mb-2.5 flex items-center justify-center">
                    <Disc3 className="w-12 h-12 text-beer-500 animate-spin" />
                    <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <h4 className="font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-beer-400 animate-spin" />
                    <span>Buscando canciones...</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Buscando: <span className="text-beer-400 font-semibold font-mono">"{searchQuery || 'éxitos'}"</span>
                  </p>
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
                <p className="font-bold text-white text-sm">Sin coincidencias</p>
                <p className="text-xs text-gray-400 mt-1">
                  Prueba tocando uno de los géneros arriba o busca por otro título.
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
            <QueueList queue={queue} />
          </div>
        )}
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
