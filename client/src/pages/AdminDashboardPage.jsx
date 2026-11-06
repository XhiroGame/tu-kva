import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Music, QrCode, Trash2, Plus, Download, ExternalLink, 
  Play, Pause, SkipForward, LogOut, RefreshCw, Radio, 
  CheckCircle, Utensils, AlertTriangle, MonitorSpeaker 
} from 'lucide-react'
import toast from 'react-hot-toast'

import Logo from '@/components/ui/Logo'
import { useApp } from '@/context/AppContext'
import { getQueue, updateQueueItem, removeFromQueue, getTables, createTable, deleteTable } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
  const { user, signOut } = useApp()
  const businessSlug = 'tu-kva'

  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'tables'
  
  // Estados de Playlist
  const [currentTrack, setCurrentTrack] = useState(null)
  const [queue, setQueue] = useState([])
  const [isLoadingQueue, setIsLoadingQueue] = useState(false)

  // Estados de Mesas
  const [tables, setTables] = useState([])
  const [newTableName, setNewTableName] = useState('')
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [isLoadingTables, setIsLoadingTables] = useState(false)

  // 1. Cargar datos de la cola
  const fetchQueue = async () => {
    setIsLoadingQueue(true)
    try {
      const res = await getQueue(businessSlug)
      if (res?.success) {
        setCurrentTrack(res.currentTrack || null)
        setQueue(res.queue || [])
      }
    } catch (error) {
      console.warn('Error fetching queue in admin:', error)
    } finally {
      setIsLoadingQueue(false)
    }
  }

  // 2. Cargar lista de mesas y códigos QR
  const fetchTables = async () => {
    setIsLoadingTables(true)
    try {
      const res = await getTables(businessSlug)
      if (res?.success) {
        setTables(res.data || [])
      }
    } catch (error) {
      console.warn('Error fetching tables:', error)
    } finally {
      setIsLoadingTables(false)
    }
  }

  // Suscripción Realtime + Intervalo de respaldo para garantizar sincronización 100% en vivo
  useEffect(() => {
    fetchQueue()
    fetchTables()

    // 1. Canal Realtime con Supabase
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'playlist_queue' },
        () => {
          fetchQueue()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          fetchTables()
        }
      )
      .subscribe()

    // 2. Intervalo de respaldo cada 3 segundos (garantiza sincronización continua)
    const interval = setInterval(() => {
      fetchQueue()
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  // Moderación: Eliminar canción de la cola
  const handleRemoveSong = async (itemId) => {
    try {
      await removeFromQueue(itemId)
      setQueue((prev) => prev.filter((item) => item.id !== itemId))
      toast.success('Canción eliminada de la fila')
    } catch (error) {
      toast.error('No se pudo eliminar la canción')
    }
  }

  // Moderación: Saltar canción actual
  const handleSkipCurrent = async () => {
    if (!currentTrack) return
    try {
      await updateQueueItem(currentTrack.id, { status: 'played' })
      toast.success('Canción saltada')
      fetchQueue()
    } catch (error) {
      toast.error('Error al saltar canción')
    }
  }

  // Crear Mesa y generar QR
  const handleCreateTable = async (e) => {
    e.preventDefault()
    if (!newTableName.trim()) return

    setIsCreatingTable(true)
    try {
      const res = await createTable({
        businessSlug,
        tableName: newTableName.trim(),
      })

      if (res?.success) {
        toast.success(`¡${newTableName} creada con su código QR!`)
        setNewTableName('')
        fetchTables()
      }
    } catch (error) {
      toast.error(error.message || 'Error al crear la mesa')
    } finally {
      setIsCreatingTable(false)
    }
  }

  // Eliminar Mesa
  const handleDeleteTable = async (tableId, tableName) => {
    if (!confirm(`¿Estás seguro de eliminar la "${tableName}"?`)) return

    try {
      await deleteTable(tableId)
      setTables((prev) => prev.filter((t) => t.id !== tableId))
      toast.success(`Mesa "${tableName}" eliminada`)
    } catch (error) {
      toast.error('Error al eliminar la mesa')
    }
  }

  // Descargar imagen de Código QR
  const downloadQR = (dataUrl, tableName) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `BEER-MUSIC-${tableName.replace(/\s+/g, '-')}-QR.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`QR de ${tableName} descargado`)
  }

  return (
    <div className="min-h-screen bg-dark-200 text-white font-sans selection:bg-beer-500">
      {/* Top Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-dark-100/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Playlist en Vivo</span>
              {queue.length > 0 && (
                <span className="bg-dark-200 text-beer-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'tables'
                  ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Mesas y Códigos QR</span>
              <span className="bg-white/10 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {tables.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-3">
          {/* Botón para abrir el Reproductor Central en una pestaña nueva */}
          <Link
            to={`/player/${businessSlug}`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-beer-500/10 hover:bg-beer-500/20 text-beer-400 border border-beer-500/30 text-xs font-bold transition-all"
            title="Abrir la pantalla de sonido"
          >
            <MonitorSpeaker className="w-4 h-4" />
            <span>Abrir Reproductor Central</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </Link>

          <span className="text-gray-400 text-xs hidden lg:block border-l border-white/10 pl-3">
            {user?.email}
          </span>

          <button
            onClick={signOut}
            className="btn-ghost flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 py-2 px-3 rounded-xl"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Tabs Móviles */}
      <div className="md:hidden flex flex-col border-b border-white/10 bg-dark-100 p-2 gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              activeTab === 'queue' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Playlist ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              activeTab === 'tables' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Mesas QR ({tables.length})</span>
          </button>
        </div>

        <Link
          to={`/player/${businessSlug}`}
          target="_blank"
          className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-beer-500/15 border border-beer-500/30 text-beer-400 active:scale-98 transition-all"
        >
          <MonitorSpeaker className="w-4 h-4" />
          <span>Abrir Reproductor Central</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </Link>
      </div>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* PESTAÑA 1: PLAYLIST EN VIVO Y MODERACIÓN */}
        {activeTab === 'queue' && (
          <div className="space-y-6 animate-fade-in">
            {/* Canción en Reproducción */}
            <div className="card p-5 bg-gradient-to-br from-beer-950/40 via-dark-50 to-dark-100 border-beer-500/30 rounded-3xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-beer-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  Sonando Ahora en el Bar
                </span>
                {currentTrack && (
                  <button
                    onClick={handleSkipCurrent}
                    className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition-all"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Saltar Canción</span>
                  </button>
                )}
              </div>

              {currentTrack ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                    <img
                      src={currentTrack.songs?.thumbnail_url}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white truncate">
                      {currentTrack.songs?.title}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {currentTrack.songs?.artist} • Solicitada por{' '}
                      <span className="text-beer-400 font-semibold">
                        {currentTrack.tables?.table_name || 'Mesa del Bar'}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-3 text-center">
                  No hay ninguna canción reproduciéndose actualmente.
                </p>
              )}
            </div>

            {/* Lista de Turnos Pendientes */}
            <div className="card p-6 bg-dark-50/90 rounded-3xl border-white/10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <h2 className="text-lg font-bold font-display text-white">
                    Fila de Reproducción Activa
                  </h2>
                  <p className="text-xs text-gray-400">
                    Puedes eliminar cualquier canción que no sea adecuada para el bar
                  </p>
                </div>
                <button
                  onClick={fetchQueue}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Refrescar"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 gap-3 rounded-2xl bg-dark-100 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-full bg-beer-500/20 text-beer-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0">
                          <img
                            src={item.songs?.thumbnail_url}
                            alt="Mini"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-white truncate">
                            {item.songs?.title}
                          </h4>
                          <p className="text-xs text-gray-400 truncate">
                            {item.songs?.artist} •{' '}
                            <span className="text-beer-300 font-medium">
                              {item.tables?.table_name || 'Mesa'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Botón de Moderación: Eliminar de la fila */}
                      <button
                        onClick={() => handleRemoveSong(item.id)}
                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95 flex-shrink-0"
                        title="Eliminar de la playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Music className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-semibold">No hay canciones en espera</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Cuando los clientes pidan canciones desde sus mesas aparecerán aquí.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: GESTIÓN DE MESAS Y CÓDIGOS QR */}
        {activeTab === 'tables' && (
          <div className="space-y-6 animate-fade-in">
            {/* Formulario de Crear Mesa */}
            <div className="card p-6 bg-dark-50/90 rounded-3xl border-white/10">
              <h2 className="text-lg font-bold font-display text-white mb-1">
                Crear Nueva Mesa
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Se generará automáticamente un código QR único listo para descargar e imprimir en esa mesa.
              </p>

              <form onSubmit={handleCreateTable} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Utensils className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Ejemplo: Mesa 2, Barra VIP, Terraza 5..."
                    className="input-field pl-10"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingTable || !newTableName.trim()}
                  className="btn-primary flex items-center justify-center gap-2 py-3 px-6 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingTable ? 'Creando...' : 'Crear Mesa & QR'}</span>
                </button>
              </form>
            </div>

            {/* Listado de Mesas con sus QR */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">
                  Mesas del Establecimiento ({tables.length})
                </h3>
                <span className="text-xs text-gray-400">
                  Haz clic en "Descargar QR" para imprimirlo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="card p-5 bg-dark-50/80 rounded-3xl border-white/10 flex flex-col justify-between hover:border-beer-500/30 transition-all"
                  >
                    <div>
                      {/* Cabecera de la mesa */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                          <h4 className="font-bold text-base text-white">
                            {table.table_name}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleDeleteTable(table.id, table.table_name)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar mesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Imagen del Código QR */}
                      <div className="bg-white p-3 rounded-2xl mx-auto w-fit shadow-md my-3">
                        <img
                          src={table.qr_code_url}
                          alt={`QR ${table.table_name}`}
                          className="w-40 h-40 object-contain"
                        />
                      </div>

                      <p className="text-[11px] text-gray-500 text-center font-mono truncate px-2">
                        Token: {table.qr_token}
                      </p>
                    </div>

                    {/* Botones de Acción */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
                      <button
                        onClick={() => downloadQR(table.qr_code_url, table.table_name)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-beer-500/20 hover:bg-beer-500/30 text-beer-400 text-xs font-bold border border-beer-500/30 transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar QR</span>
                      </button>

                      <Link
                        to={`/${businessSlug}/table/${table.qr_token}`}
                        target="_blank"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/5 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Probar Mesa</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
