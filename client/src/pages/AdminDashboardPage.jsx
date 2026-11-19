import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  QrCode, Trash2, Plus, Download, ExternalLink, 
  LogOut, RefreshCw, Utensils, MonitorSpeaker,
  BarChart3, History, Trophy, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

import Logo from '@/components/ui/Logo'
import { useApp } from '@/context/AppContext'
import { getTables, createTable, deleteTable, getHistory, getAdminStats } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
  const { user, signOut } = useApp()
  const businessSlug = 'tu-kva'

  const [activeTab, setActiveTab] = useState('tables') // 'tables' | 'stats'

  // Estados de Mesas
  const [tables, setTables] = useState([])
  const [newTableName, setNewTableName] = useState('')
  const [isCreatingTable, setIsCreatingTable] = useState(false)

  // Estados de Estadísticas e Historial
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const fetchStatsAndHistory = async () => {
    setIsLoadingStats(true)
    try {
      const [statsRes, historyRes] = await Promise.all([
        getAdminStats(businessSlug),
        getHistory(businessSlug, { limit: 30 }),
      ])
      if (statsRes?.success) setStats(statsRes.data || null)
      if (historyRes?.success) setHistory(historyRes.data || [])
    } catch (error) {
      console.warn('Error fetching stats/history:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStatsAndHistory()
    }
  }, [activeTab])

  // Cargar lista de mesas y códigos QR
  const fetchTables = async () => {
    try {
      const res = await getTables(businessSlug)
      if (res?.success) {
        setTables(res.data || [])
      }
    } catch (error) {
      console.warn('Error fetching tables:', error)
    }
  }

  // Suscripción Realtime para sincronización de mesas
  useEffect(() => {
    fetchTables()

    const channel = supabase
      .channel('admin-tables-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          fetchTables()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
    link.download = `TU-KVA-${tableName.replace(/\s+/g, '-')}-QR.png`
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

            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estadísticas</span>
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
            onClick={() => setActiveTab('tables')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              activeTab === 'tables' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Mesas ({tables.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              activeTab === 'stats' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas</span>
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
        {/* PESTAÑA 1: GESTIÓN DE MESAS Y CÓDIGOS QR */}
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

        {/* PESTAÑA 3: ESTADÍSTICAS E HISTORIAL */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-white">
                  Estadísticas e Historial del Bar
                </h2>
                <p className="text-xs text-gray-400">
                  Resumen en tiempo real de actividad musical en Tu K-VA
                </p>
              </div>
              <button
                onClick={fetchStatsAndHistory}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="Actualizar estadísticas"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Reproducidas Hoy</p>
                <p className="text-3xl font-black text-beer-400 mt-1">{stats?.playedToday ?? 0}</p>
              </div>
              <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">En Espera Ahora</p>
                <p className="text-3xl font-black text-white mt-1">{stats?.pendingInQueue ?? 0}</p>
              </div>
              <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Mesas Activas</p>
                <p className="text-3xl font-black text-green-400 mt-1">{stats?.activeTables ?? tables.length}</p>
              </div>
            </div>

            {/* Top 5 Canciones Más Sonadas */}
            <div className="card p-6 bg-dark-50/90 rounded-3xl border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-beer-400" />
                <span>Top 5 Canciones Más Sonadas</span>
              </h3>
              {stats?.topSongs?.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.topSongs.map((song, idx) => (
                    <div
                      key={song.provider_song_id}
                      className="flex items-center justify-between p-3 gap-3 rounded-2xl bg-dark-100 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-full bg-beer-500/20 text-beer-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          #{idx + 1}
                        </span>
                        {song.thumbnail_url && (
                          <img
                            src={song.thumbnail_url}
                            alt={song.title}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-black"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                          <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                        </div>
                      </div>
                      <span className="badge-beer text-xs font-bold flex-shrink-0">
                        {song.playCount}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  Aún no hay suficientes reproducciones registradas.
                </p>
              )}
            </div>

            {/* Historial Reciente */}
            <div className="card p-6 bg-dark-50/90 rounded-3xl border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-beer-400" />
                <span>Historial Reciente</span>
              </h3>
              {history.length > 0 ? (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 gap-3 rounded-2xl bg-dark-100 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.songs?.thumbnail_url && (
                          <img
                            src={item.songs.thumbnail_url}
                            alt={item.songs.title}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-black"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {item.songs?.title || 'Canción'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {item.songs?.artist || 'Artista'} • {item.tables?.table_name || 'La Barra'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'skipped'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {item.status === 'skipped' ? 'Saltada' : 'Reproducida'}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.played_at || item.requested_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  No hay canciones en el historial todavía.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
