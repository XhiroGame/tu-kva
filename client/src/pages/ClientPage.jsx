import React, { useState, useEffect } from 'react'
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
import { searchSongs, addToQueue, getQueue } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function ClientPage() {
  const { businessSlug = 'tu-kva', qrToken = 'test-qr-token-mesa-1' } = useParams()

  // Estados de navegación
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'queue'
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [addedSongIds, setAddedSongIds] = useState(new Set())
  const [addingSongId, setAddingSongId] = useState(null)

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

      // Obtener el nombre real de la mesa según el token del QR
      if (qrToken) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('table_name')
          .eq('qr_token', qrToken)
          .single()

        if (tableData?.table_name) {
          setTableName(tableData.table_name)
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
    setIsSearching(true)
    try {
      const response = await searchSongs('rock clasico éxitos', { limit: 10 })
      if (response?.data) {
        setSearchResults(response.data)
      }
    } catch (error) {
      console.warn('Error cargando catálogo inicial:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 4. Búsqueda en vivo (YouTube)
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadSuggestedSongs()
      return
    }

    setIsSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const response = await searchSongs(searchQuery.trim(), { limit: 20 })
        if (response?.data) {
          setSearchResults(response.data)
        }
      } catch (error) {
        toast.error('Error al consultar el catálogo musical')
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [searchQuery])

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
            <p className="font-bold">¡Canción en la lista!</p>
            <p className="text-xs text-gray-300">"{song.title}" se agregó a los turnos</p>
          </div>,
          { duration: 4000 }
        )
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo agregar la canción')
    } finally {
      setAddingSongId(null)
    }
  }

  return (
    <div className="min-h-screen bg-dark-200 text-white flex flex-col justify-between selection:bg-beer-500 selection:text-black">
      <div className="w-full max-w-lg mx-auto px-4 py-3 pb-24 sm:py-6">
        {/* Cabecera de la mesa */}
        <ClientHeader businessName={businessName} tableName={tableName} />

        {/* Canción en reproducción */}
        <div className="mt-4 mb-5">
          <NowPlaying song={currentTrack} />
        </div>

        {/* Selector de Pestañas (Tabs) */}
        <div className="grid grid-cols-2 p-1 bg-dark-100 rounded-2xl border border-dark-border/60 mb-5">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
              activeTab === 'search'
                ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar Canciones</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all relative ${
              activeTab === 'queue'
                ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Playlist del Bar</span>
            {queue.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
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
          <div className="space-y-4 animate-fade-in">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              isLoading={isSearching}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Sparkles className="w-3.5 h-3.5 text-beer-400" />
                <span>
                  {searchQuery ? 'Resultados de YouTube' : 'Canciones Populares'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {searchResults.length} canciones
              </span>
            </div>

            {/* Listado de Canciones */}
            {searchResults.length > 0 ? (
              <div className="space-y-2.5">
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
              <div className="card p-8 text-center border-dashed border-dark-border/80 rounded-3xl bg-dark-50/40">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-500" />
                <p className="font-semibold text-white text-sm">Sin coincidencias</p>
                <p className="text-xs text-gray-400 mt-1">
                  Prueba buscando otro título o artista.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: PLAYLIST ACTUAL / COLA */}
        {activeTab === 'queue' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
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

      {/* Barra flotante para ver la playlist */}
      {addedSongIds.size > 0 && activeTab === 'search' && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-50">
          <button
            onClick={() => setActiveTab('queue')}
            className="w-full btn-primary flex items-center justify-between py-3.5 px-5 shadow-beer-lg"
          >
            <div className="flex items-center gap-2 text-dark-200">
              <ListMusic className="w-5 h-5" />
              <span className="font-bold text-sm">Ver la playlist en vivo</span>
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
