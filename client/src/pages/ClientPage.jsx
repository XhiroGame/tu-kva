import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, ListMusic, Sparkles, AlertCircle } from 'lucide-react'

// Componentes UI
import ClientHeader from '@/components/ui/ClientHeader'
import SearchBar from '@/components/ui/SearchBar'
import SongCard from '@/components/queue/SongCard'
import NowPlaying from '@/components/queue/NowPlaying'
import QueueList from '@/components/queue/QueueList'

// APIs y Supabase Realtime
import { searchSongs, addToQueue, getQueue, validateTable } from '@/lib/api'
import { supabase } from '@/lib/supabase'

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
      const response = await searchSongs('rock clasico éxitos', { limit: 12 })
      if (response?.data) {
        clientSearchCache.current.set(defaultKey, response.data)
        setSearchResults(response.data)
      }
    } catch (error) {
      console.warn('Error cargando catálogo inicial:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 4. Búsqueda en vivo optimizada con Debounce + Caché + AbortController
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      loadSuggestedSongs()
      return
    }

    const cacheKey = q.toLowerCase()

    // Respuesta instantánea en 0ms si ya está en caché local
    if (clientSearchCache.current.has(cacheKey)) {
      setSearchResults(clientSearchCache.current.get(cacheKey))
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    // Debounce rápido de 260ms (suficiente para que no sature y responde de inmediato)
    const timeout = setTimeout(async () => {
      // Cancelar request previo si aún estaba en curso
      if (activeAbortController.current) {
        activeAbortController.current.abort()
      }
      activeAbortController.current = new AbortController()

      try {
        const response = await searchSongs(q, {
          limit: 15,
          signal: activeAbortController.current.signal,
        })
        if (response?.data) {
          clientSearchCache.current.set(cacheKey, response.data)
          setSearchResults(response.data)
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Error al consultar canciones')
        }
      } finally {
        setIsSearching(false)
      }
    }, 260)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Seleccionar chip rápido de género
  const handleSelectGenreChip = (genreQuery) => {
    setSearchQuery(genreQuery)
  }

  // 5. Enviar pedido a la base de datos real
  const handleAddSong = async (song) => {
    setAddingSongId(song.provider_song_id)

    try {
      const result = await addToQueue({
        businessSlug,
        qrToken,
        song,
      })

      if (result.success) {
        setAddedSongIds((prev) => new Set(prev).add(song.provider_song_id))

        // Refrescar de inmediato la cola local
        await fetchQueueData()

        toast.success(
          <div>
            <p className="font-bold">¡Canción agregada!</p>
            <p className="text-xs text-gray-300">"{song.title}" entró a los turnos</p>
          </div>,
          { duration: 3500 }
        )
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo agregar la canción')
    } finally {
      setAddingSongId(null)
    }
  }

  const isTypingSearch = activeTab === 'search' && searchQuery.trim().length > 0

  return (
    <div className="min-h-screen bg-dark-200 text-white flex flex-col justify-between selection:bg-beer-500 selection:text-black">
      <div className="w-full max-w-lg mx-auto px-3.5 py-2.5 pb-24 sm:py-5 sm:px-4">
        {/* Cabecera compacta de la mesa */}
        <ClientHeader businessName={businessName} tableName={tableName} />

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
          <div className="space-y-3 animate-fade-in">
            {/* Barra de Búsqueda con Chips Rápidos */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              isLoading={isSearching}
              chips={QUICK_GENRES}
              onSelectChip={handleSelectGenreChip}
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

            {/* Listado de Canciones o Skeletons mientras busca */}
            {isSearching && searchResults.length === 0 ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className="flex items-center p-2.5 gap-2.5 bg-dark-50/60 border border-white/5 rounded-2xl animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-3.5 bg-white/10 rounded-md w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded-md w-1/2" />
                    </div>
                    <div className="w-14 h-9 bg-white/10 rounded-xl flex-shrink-0" />
                  </div>
                ))}
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
