import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Play, Pause, SkipForward, Volume2, VolumeX, 
  MonitorSpeaker, Users, Disc3, Radio, RefreshCw,
  Search, Plus, Zap, X, Loader2, LayoutDashboard
} from 'lucide-react'
import toast from 'react-hot-toast'

import Logo from '@/components/ui/Logo'
import { formatDuration } from '@/components/queue/SongCard'
import { getQueue, updateQueueItem, getSmartFallback, searchSongs, addToQueue } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function PlayerPage() {
  const { businessSlug = 'tu-kva' } = useParams()

  const [currentTrack, setCurrentTrack] = useState(null)
  const [queue, setQueue] = useState([])
  const [businessName, setBusinessName] = useState('Tu K-VA')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [ambientGenre, setAmbientGenre] = useState('')

  // Estados del Buscador integrado para el personal del Bar
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const playerRef = useRef(null)
  const currentTrackRef = useRef(null)
  const queueRef = useRef([])
  const isTransitioningRef = useRef(false)
  const loadedVideoIdRef = useRef(null)
  const lastEndedVideoIdRef = useRef(null)
  const recentPlayedIdsRef = useRef([])
  const handleTrackEndedRef = useRef(null)
  const playerSearchCache = useRef(new Map())
  const searchAbortController = useRef(null)

  // Mantener referencias sincronizadas con el estado actual
  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  // Registrar ID de canción reproducida para no repetirla inmediatamente en modo aleatorio
  const recordPlayedSongId = (videoId) => {
    if (!videoId) return
    const idStr = String(videoId)
    const filtered = recentPlayedIdsRef.current.filter((id) => id !== idStr)
    recentPlayedIdsRef.current = [idStr, ...filtered].slice(0, 15)
  }

  // Cargar y reproducir un video de forma segura en el reproductor de YouTube
  const loadVideoInPlayer = (videoId) => {
    if (!videoId) return
    const idStr = String(videoId)
    loadedVideoIdRef.current = idStr
    lastEndedVideoIdRef.current = null // Permitir que este video dispare su propio fin
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(idStr)
      playerRef.current.playVideo()
      setIsPlaying(true)
    }
  }

  // Asegurar que cuando el reproductor esté listo se cargue el video actual
  useEffect(() => {
    const videoId = currentTrack?.songs?.provider_song_id
    if (playerReady && videoId && loadedVideoIdRef.current !== String(videoId)) {
      loadVideoInPlayer(videoId)
    }
  }, [playerReady, currentTrack?.songs?.provider_song_id])

  // Reproducir una canción aleatoria de las MÁS SONADAS del bar cuando la lista está vacía
  const playSmartAmbientTrack = async () => {
    try {
      let songs = []
      let style = ''
      try {
        const fallbackRes = await getSmartFallback(businessSlug, recentPlayedIdsRef.current)
        songs = fallbackRes?.data || []
        style = fallbackRes?.detectedStyle || ''
      } catch (err) {
        console.warn('Smart fallback falló, usando búsqueda de respaldo:', err)
      }

      // Respaldo: si no hay resultados, buscar éxitos populares directamente
      if (songs.length === 0) {
        const searchRes = await searchSongs('exitos populares canciones', { limit: 20 })
        songs = (searchRes?.data || []).filter(
          (s) => !recentPlayedIdsRef.current.includes(String(s.provider_song_id))
        )
        if (songs.length === 0) songs = searchRes?.data || []
      }

      if (songs.length > 0) {
        const randomSong = songs[Math.floor(Math.random() * songs.length)]

        if (style) {
          setAmbientGenre(style)
        }

        recordPlayedSongId(randomSong.provider_song_id)

        const ambientTrack = {
          id: `ambient-${Date.now()}`,
          isFallback: true,
          playCount: randomSong.play_count || null,
          songs: {
            provider_song_id: randomSong.provider_song_id,
            title: randomSong.title,
            artist: randomSong.artist,
            thumbnail_url: randomSong.thumbnail_url,
            duration: randomSong.duration,
          },
          tables: {
            table_name: randomSong.play_count
              ? `Más sonadas (${randomSong.play_count}x)`
              : 'Canciones más sonadas',
          },
        }

        currentTrackRef.current = ambientTrack
        setCurrentTrack(ambientTrack)
        setIsPlaying(true)
        loadVideoInPlayer(randomSong.provider_song_id)
      }
    } catch (error) {
      console.warn('Error cargando canción aleatoria de las más sonadas:', error)
    }
  }

  // 2. Iniciar la siguiente canción de la lista
  const playNextTrack = async (nextItem) => {
    if (!nextItem) {
      await playSmartAmbientTrack()
      return
    }

    try {
      await updateQueueItem(nextItem.id, { status: 'playing' })
      recordPlayedSongId(nextItem.songs?.provider_song_id)

      currentTrackRef.current = nextItem
      setCurrentTrack(nextItem)
      setQueue((prev) => prev.filter((item) => item.id !== nextItem.id))
      setIsPlaying(true)

      const videoId = nextItem.songs?.provider_song_id
      if (videoId) {
        loadVideoInPlayer(videoId)
      }
    } catch (error) {
      console.error('Error starting track:', error)
    }
  }

  // 3. Avanzar automáticamente al terminar la canción (o al saltar)
  const advanceToNextOrRandom = async (isManualSkip = false) => {
    if (isTransitioningRef.current) return

    const activeTrack = currentTrackRef.current
    const activeVideoId = activeTrack?.songs?.provider_song_id

    // Prevenir saltos en bucle para el mismo video
    if (!isManualSkip && activeVideoId && lastEndedVideoIdRef.current === activeVideoId) {
      return
    }

    isTransitioningRef.current = true
    if (activeVideoId) {
      lastEndedVideoIdRef.current = activeVideoId
    }

    let advanced = false
    try {
      if (activeVideoId) {
        recordPlayedSongId(activeVideoId)
      }

      // Si la canción terminada provenía de la cola de pedidos, marcarla como played
      // (si falla, igual se continúa para no quedar atascado)
      if (activeTrack && !activeTrack.isFallback && activeTrack.id) {
        try {
          await updateQueueItem(activeTrack.id, { status: 'played' })
        } catch (err) {
          console.warn('No se pudo marcar como reproducida:', err)
        }
        if (isManualSkip) toast.success('Pasando a la siguiente canción')
      }

      // Consultar la lista actualizada en base de datos
      let freshQueue = []
      try {
        const res = await getQueue(businessSlug)
        freshQueue = (res?.queue || []).filter((i) => i.id !== activeTrack?.id)
        setQueue(freshQueue)
      } catch (err) {
        console.warn('No se pudo consultar la cola:', err)
      }

      if (freshQueue.length > 0) {
        await playNextTrack(freshQueue[0])
      } else {
        await playSmartAmbientTrack()
      }

      // Verificar que realmente cambió la canción
      advanced = currentTrackRef.current?.id !== activeTrack?.id
    } catch (error) {
      console.error('Error al avanzar de canción:', error)
      if (isManualSkip) toast.error('Error al cambiar de canción')
    } finally {
      if (!advanced) {
        // Falló: permitir reintento pronto en lugar de quedarse atascado
        lastEndedVideoIdRef.current = null
        setTimeout(() => {
          isTransitioningRef.current = false
        }, 3000)
      } else {
        setTimeout(() => {
          isTransitioningRef.current = false
        }, 2500)
      }
    }
  }

  // Actualizar siempre la referencia para los callbacks
  useEffect(() => {
    handleTrackEndedRef.current = () => {
      advanceToNextOrRandom(false)
    }
  })

  const handleSkip = () => {
    advanceToNextOrRandom(true)
  }

  // 1. Sincronizar cola desde la base de datos SIN interrumpir la canción que ya está sonando
  const fetchQueue = async () => {
    if (isTransitioningRef.current) return

    try {
      const res = await getQueue(businessSlug)
      if (res?.success) {
        if (res.business?.name) setBusinessName(res.business.name)
        const pendingList = res.queue || []
        setQueue(pendingList)

        const activeTrack = currentTrackRef.current

        // Caso 1: Hay una canción marcada explícitamente como 'playing' en la BD por DJ o Mesa
        if (res.currentTrack) {
          if (activeTrack?.id !== res.currentTrack.id) {
            currentTrackRef.current = res.currentTrack
            setCurrentTrack(res.currentTrack)
            loadVideoInPlayer(res.currentTrack.songs?.provider_song_id)
          }
          return
        }

        // Caso 2: El reproductor está completamente vacío (recién abierto, nada sonando)
        if (!activeTrack) {
          isTransitioningRef.current = true
          try {
            if (pendingList.length > 0) {
              await playNextTrack(pendingList[0])
            } else {
              await playSmartAmbientTrack()
            }
          } finally {
            setTimeout(() => {
              isTransitioningRef.current = false
            }, 2500)
          }
        }

        // Si ya hay una canción sonando (sea de ambiente o de cola), NO SE TOCA: se deja terminar tranquila
      }
    } catch (error) {
      console.warn('Error fetching queue:', error)
    }
  }

  // 4. Búsqueda ultra-rápida para el personal del bar (Caché local 0ms + AbortController)
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const key = q.toLowerCase()
    if (playerSearchCache.current.has(key)) {
      setSearchResults(playerSearchCache.current.get(key))
      setIsSearching(false)
      return
    }

    const timeout = setTimeout(async () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort()
      }
      searchAbortController.current = new AbortController()

      setIsSearching(true)
      try {
        const res = await searchSongs(q, {
          limit: 30,
          signal: searchAbortController.current.signal,
        })
        if (res?.data) {
          const filtered = res.data.filter((s) => s.duration > 30 && s.duration < 600)
          playerSearchCache.current.set(key, filtered)
          setSearchResults(filtered)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Search error:', err)
        }
      } finally {
        setIsSearching(false)
      }
    }, 220)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Poner una canción a sonar inmediatamente (Acción DJ / Bar)
  const handlePlayNow = async (song) => {
    try {
      const activeTrack = currentTrackRef.current
      // 1. Guardar la canción actual si había una de la cola
      if (activeTrack && !activeTrack.isFallback && activeTrack.id) {
        await updateQueueItem(activeTrack.id, { status: 'played' })
      }

      // 2. Crear y forzar como sonando
      const queueRes = await addToQueue({
        businessSlug,
        song,
      })

      if (queueRes?.data) {
        await updateQueueItem(queueRes.data.id, { status: 'playing' })
        const directTrack = {
          ...queueRes.data,
          tables: { table_name: 'La Barra / DJ' },
        }
        recordPlayedSongId(song.provider_song_id)
        currentTrackRef.current = directTrack
        setCurrentTrack(directTrack)
        setIsPlaying(true)
        loadVideoInPlayer(song.provider_song_id)
      }

      toast.success(`Sonando ahora: ${song.title}`)
      setIsSearchOpen(false)
      setSearchQuery('')
    } catch (error) {
      toast.error(error.message || 'Error al poner la canción')
    }
  }

  // Agregar canción a la cola desde la barra
  const handleAddToQueue = async (song) => {
    try {
      await addToQueue({
        businessSlug,
        song,
      })
      toast.success(`Agregada a los turnos: ${song.title}`)
      fetchQueue()
      setIsSearchOpen(false)
      setSearchQuery('')
    } catch (error) {
      toast.error(error.message || 'Error al agregar a la cola')
    }
  }

  // 5. Suscripción Realtime + Heartbeat continuo
  useEffect(() => {
    fetchQueue()

    const channel = supabase
      .channel('player-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_queue' }, () => {
        fetchQueue()
      })
      .subscribe()

    const interval = setInterval(() => {
      fetchQueue()
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [businessSlug])

  // 6. Cargar API de YouTube
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = initPlayer
    } else if (window.YT && window.YT.Player) {
      initPlayer()
    }

    function initPlayer() {
      if (playerRef.current) return

      const initialVideoId = currentTrackRef.current?.songs?.provider_song_id || ''

      playerRef.current = new window.YT.Player('yt-player-container', {
        height: '100%',
        width: '100%',
        videoId: initialVideoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setPlayerReady(true)
            const activeVideoId = currentTrackRef.current?.songs?.provider_song_id
            if (activeVideoId) {
              loadVideoInPlayer(activeVideoId)
            }
          },
          onStateChange: (event) => {
            // 0 = YT.PlayerState.ENDED -> La canción terminó por completo
            if (event.data === 0) {
              handleTrackEndedRef.current?.()
            } else if (event.data === 1) {
              setIsPlaying(true)
            } else if (event.data === 2) {
              setIsPlaying(false)
            }
          },
          onError: (event) => {
            // Códigos 101/150: Propietario del video no permite reproducción externa (LatinAutor/UMPG/etc.)
            // Códigos 100/2: Video no encontrado, borrado o parámetros inválidos
            console.warn('Video de YouTube no disponible o bloqueado para embed:', event.data)
            const badId = currentTrackRef.current?.songs?.provider_song_id
            if (badId) {
              recordPlayedSongId(badId)
            }
            toast.error(
              'La canción tiene restricción de reproducción externa (LatinAutor/UMPG). Saltando a la siguiente...',
              { id: 'yt-error-skip', duration: 3000 }
            )
            setTimeout(() => {
              handleTrackEndedRef.current?.()
            }, 600)
          },
        },
      })
    }
  }, [])

  // 7. Watchdog de progreso: Como respaldo si el evento de YouTube se pierde,
  // solo verifica si la canción estuvo sonando y llegó al último segundo de reproducción
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      if (!playerRef.current || isTransitioningRef.current) return

      try {
        if (typeof playerRef.current.getPlayerState === 'function') {
          const state = playerRef.current.getPlayerState()

          // Estado 1 = PLAYING
          if (
            state === 1 &&
            typeof playerRef.current.getCurrentTime === 'function' &&
            typeof playerRef.current.getDuration === 'function'
          ) {
            const currentTime = playerRef.current.getCurrentTime()
            const duration = playerRef.current.getDuration()

            // Solo avanzar si la canción ya se escuchó por más de 10 segundos y llegó al final
            if (duration > 30 && currentTime >= 10 && currentTime >= duration - 1.2) {
              handleTrackEndedRef.current?.()
            }
          }
        }
      } catch (err) {
        // Ignorar posibles advertencias de comunicación Iframe antes de iniciar
      }
    }, 1000)

    return () => clearInterval(watchdogInterval)
  }, [])

  const togglePlay = () => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    } else {
      playerRef.current.playVideo()
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    if (!playerRef.current) return
    if (isMuted) {
      playerRef.current.unMute()
      setIsMuted(false)
    } else {
      playerRef.current.mute()
      setIsMuted(true)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col justify-between p-4 lg:p-8 font-sans selection:bg-beer-500">
      {/* Barra Superior */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <Logo size="md" />
          <div className="hidden sm:block pl-4 border-l border-white/10">
            <h1 className="text-lg font-bold text-white font-display">Tu K-VA</h1>
            <p className="text-xs text-beer-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Reproductor Central del Bar Activo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón para volver al Dashboard Administrativo */}
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all border border-white/10"
            title="Ir al Dashboard de Administración"
          >
            <LayoutDashboard className="w-4 h-4 text-beer-400" />
            <span className="hidden sm:inline">Panel Admin</span>
          </Link>

          {/* Botón para abrir el Buscador del Bar / DJ */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-beer-gradient text-dark-200 font-bold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-beer/20"
          >
            <Search className="w-4 h-4" />
            <span>Buscar Música (Bar / DJ)</span>
          </button>

          <div className="glass px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs text-gray-300">
            <Users className="w-4 h-4 text-beer-400" />
            <span>{queue.length} en espera</span>
          </div>

          <button 
            onClick={fetchQueue}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Contenido Principal: Dos Columnas */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-start">
        {/* Columna Izquierda: Video YouTube + Controles */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-beer-500/30 shadow-2xl shadow-beer/10">
            <div id="yt-player-container" className="w-full h-full"></div>

            {!currentTrack && (
              <div className="absolute inset-0 bg-dark-100 flex flex-col items-center justify-center p-6 text-center">
                <Disc3 className="w-16 h-16 text-beer-500/40 animate-spin-slow mb-4" />
                <h3 className="text-xl font-bold text-white font-display">
                  Esperando solicitudes de las mesas
                </h3>
                <p className="text-sm text-gray-400 mt-2 max-w-md">
                  Los clientes pueden escanear el código QR de su mesa o puedes buscar canciones arriba.
                </p>
              </div>
            )}
          </div>

          {/* Tarjeta de controles y tema sonando */}
          {currentTrack && (
            <div className="card p-5 bg-dark-50/90 border-white/10 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-black border border-white/10">
                  <img 
                    src={currentTrack.songs?.thumbnail_url} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full mb-1 font-bold inline-block ${
                    currentTrack.isFallback 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'badge-beer'
                  }`}>
                    {currentTrack.isFallback 
                      ? '🎲 Aleatoria de las Más Sonadas en Tu K-VA' 
                      : '🔥 Pedido de Cliente en Vivo'}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-white line-clamp-1 leading-snug">
                    {currentTrack.songs?.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5">
                    {currentTrack.songs?.artist} •{' '}
                    <span className="text-beer-400 font-semibold">
                      {currentTrack.isFallback 
                        ? (currentTrack.playCount
                            ? `Top más sonadas (${currentTrack.playCount} reproducciones)`
                            : (ambientGenre || 'Las más sonadas del bar'))
                        : `Pedida por ${currentTrack.tables?.table_name || 'La Mesa'}`
                      }
                    </span>
                  </p>
                </div>
              </div>

              {/* Botones de control */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-2xl bg-beer-gradient text-dark-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-beer/30"
                  title={isPlaying ? 'Pausar' : 'Reanudar'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleSkip}
                  className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95 transition-all"
                  title="Saltar a la siguiente canción"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleMute}
                  className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Próximos Turnos */}
        <div className="lg:col-span-5 xl:col-span-4 card p-5 bg-dark-50/80 border-white/10 rounded-3xl h-full flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-beer-500" />
              <span>Próximos Turnos</span>
            </h2>
            <span className="badge-beer text-xs font-bold">
              {queue.length} en fila
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
            {queue.length > 0 ? (
              queue.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center p-3 gap-3 rounded-2xl bg-dark-100/70 border border-white/5 hover:border-beer-500/30 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-beer-500/20 text-beer-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-black flex-shrink-0">
                    <img
                      src={item.songs?.thumbnail_url}
                      alt="Mini"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-white line-clamp-1">
                      {item.songs?.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {item.songs?.artist}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-medium">
                      {item.tables?.table_name || 'La Barra'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm font-semibold">No hay canciones pedidas por mesas</p>
                <p className="text-xs text-gray-600 mt-1">
                  Sonando música de ambiente inteligente automáticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DEL BUSCADOR PARA EL PERSONAL DEL BAR / DJ */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-100 border border-beer-500/40 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-beer/20 animate-scale-up">
            {/* Cabecera del Modal */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-beer-400 font-bold">
                <Search className="w-5 h-5" />
                <span className="text-base font-display">Buscador Oficial del Bar (Tu K-VA)</span>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input de Búsqueda */}
            <div className="p-4 border-b border-white/10 bg-dark-50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-beer-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cualquier canción, artista o género para el bar..."
                  className="input-field pl-11 py-3.5 text-base"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-beer-500 animate-spin" />
                )}
              </div>
            </div>

            {/* Resultados de Búsqueda */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {searchResults.length > 0 ? (
                searchResults.map((song) => (
                  <div
                    key={song.provider_song_id}
                    className="flex items-center justify-between p-3 gap-3 bg-dark-50 border border-white/5 hover:border-beer-500/30 rounded-2xl transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0">
                      <img
                        src={song.thumbnail_url}
                        alt="Mini"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-white line-clamp-1">
                        {song.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">
                        {song.artist} • {formatDuration(song.duration)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePlayNow(song)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-beer-gradient text-dark-200 text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-beer/30"
                        title="Interrumpir y sonar de inmediato"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Sonar Ya</span>
                      </button>

                      <button
                        onClick={() => handleAddToQueue(song)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold active:scale-95 transition-all"
                        title="Agregar al final de la fila"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>A la Fila</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <p className="text-center py-10 text-gray-400 text-sm">
                  {isSearching ? 'Buscando canciones...' : 'No se encontraron resultados.'}
                </p>
              ) : (
                <p className="text-center py-10 text-gray-500 text-sm">
                  Escribe el nombre de una canción o artista para buscar en YouTube.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 pt-2 border-t border-white/5">
        Tu K-VA Cervecería & Música • Computador Central de Sonido
      </footer>
    </div>
  )
}
