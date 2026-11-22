import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  QrCode, Trash2, Plus, Download, ExternalLink, 
  LogOut, RefreshCw, Utensils, MonitorSpeaker,
  BarChart3, History, Trophy, Clock, ShieldCheck,
  Palette, Upload, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

import Logo from '@/components/ui/Logo'
import { useApp } from '@/context/AppContext'
import {
  getTables,
  createTable,
  deleteTable,
  getHistory,
  getAdminStats,
  getBusinessBranding,
  updateBusinessBranding,
} from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { BRAND_COLOR_PRESETS, applyBusinessTheme } from '@/lib/theme'

export default function AdminDashboardPage() {
  const { user, business, setBusiness, isSuperAdmin, signOut } = useApp()
  const businessSlug = business?.slug || 'tu-kva'
  const businessName = business?.name || 'Tu K-VA'
  const currentBranding = business?.branding || {}

  const [activeTab, setActiveTab] = useState('stats') // 'stats' | 'tables' | 'branding'

  // Estados de Mesas
  const [tables, setTables] = useState([])
  const [newTableName, setNewTableName] = useState('')
  const [isCreatingTable, setIsCreatingTable] = useState(false)

  // Estados de Estadísticas e Historial
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Estados de Personalización de Marca (Nombre, Logo, Subtítulo y Colores)
  const [brandingForm, setBrandingForm] = useState({
    name: businessName,
    subtitle: currentBranding.subtitle || 'Cervecería & Música',
    logoUrl: currentBranding.logoUrl || '',
    primaryColor: currentBranding.primaryColor || '#f59e0b',
    secondaryColor: currentBranding.secondaryColor || '#f97316',
  })
  const [isSavingBranding, setIsSavingBranding] = useState(false)

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

  const fetchBrandingConfig = async () => {
    try {
      const res = await getBusinessBranding(businessSlug)
      if (res?.success && res.business) {
        const b = res.business.branding || {}
        const updatedForm = {
          name: res.business.name || businessName,
          subtitle: b.subtitle || 'Cervecería & Música',
          logoUrl: b.logoUrl || '',
          primaryColor: b.primaryColor || '#f59e0b',
          secondaryColor: b.secondaryColor || '#f97316',
        }
        setBrandingForm(updatedForm)
        applyBusinessTheme(b)
      }
    } catch (err) {
      console.warn('Error fetching branding config:', err)
    }
  }

  useEffect(() => {
    fetchBrandingConfig()
  }, [businessSlug])

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStatsAndHistory()
    }
  }, [activeTab, businessSlug])

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
      .channel(`admin-tables-changes-${businessSlug}`)
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
  }, [businessSlug])

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

  // Descargar imagen de Código QR con el nombre dinámico del establecimiento
  const downloadQR = (dataUrl, tableName) => {
    const link = document.createElement('a')
    link.href = dataUrl
    const prefix = businessSlug.toUpperCase()
    link.download = `${prefix}-${tableName.replace(/\s+/g, '-')}-QR.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`QR de ${tableName} descargado`)
  }

  // Subir archivo de logo desde el computador/celular y redimensionarlo automáticamente a Base64 ligero
  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido (PNG, JPG, WEBP o SVG)')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 220
        let width = img.width
        let height = img.height
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/png', 0.9)
        setBrandingForm((prev) => ({ ...prev, logoUrl: compressedDataUrl }))
        toast.success('Logo cargado en vista previa')
      }
      img.src = event.target?.result
    }
    reader.readAsDataURL(file)
  }

  // Guardar la personalización de la Rockola (Nombre, Subtítulo, Logo y Colores)
  const handleSaveBranding = async (e) => {
    e.preventDefault()
    setIsSavingBranding(true)
    try {
      const res = await updateBusinessBranding(businessSlug, brandingForm)
      if (res?.success && res.business) {
        setBusiness((prev) => ({
          ...prev,
          name: res.business.name,
          branding: res.business.branding,
        }))
        applyBusinessTheme(res.business.branding)
        toast.success(res.message || '¡Rockola personalizada con éxito!')
      }
    } catch (error) {
      toast.error(error.message || 'Error al guardar la personalización')
    } finally {
      setIsSavingBranding(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-200 text-white font-sans selection:bg-beer-500 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-dark-100/80 sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <Logo
              size="sm"
              businessName={brandingForm.name || businessName}
              subtitle={brandingForm.subtitle}
              logoUrl={brandingForm.logoUrl}
            />
            <nav className="hidden md:flex items-center gap-2">
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
                onClick={() => setActiveTab('branding')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'branding'
                    ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Personalizar Marca</span>
              </button>

              {isSuperAdmin && (
                <Link
                  to="/superadmin"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-beer-500/30 bg-beer-500/10 text-beer-400 hover:bg-beer-500/20"
                  title="Volver a la Consola Maestra de CJ Systems"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Volver a SuperAdmin</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-3">
            {/* Botón para abrir el Reproductor Central en una pestaña nueva */}
            <Link
              to={`/player/${businessSlug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-beer-500/10 hover:bg-beer-500/20 text-beer-400 border border-beer-500/30 text-xs font-bold transition-all"
              title={`Abrir la pantalla de sonido de ${businessName}`}
            >
              <MonitorSpeaker className="w-4 h-4" />
              <span>Abrir Reproductor ({businessName})</span>
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
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                activeTab === 'stats' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                activeTab === 'tables' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mesas ({tables.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                activeTab === 'branding' ? 'bg-beer-500 text-dark-200' : 'text-gray-400'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Marca</span>
            </button>

            {isSuperAdmin && (
              <Link
                to="/superadmin"
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-beer-400 bg-beer-500/10 border border-beer-500/30"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SuperAdmin</span>
              </Link>
            )}
          </div>

          <Link
            to={`/player/${businessSlug}`}
            target="_blank"
            className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-beer-500/15 border border-beer-500/30 text-beer-400 active:scale-98 transition-all"
          >
            <MonitorSpeaker className="w-4 h-4" />
            <span>Abrir Reproductor ({businessName})</span>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-bold font-display text-white">
                      Crear Nueva Mesa en {businessName}
                    </h2>
                    <p className="text-xs text-gray-400">
                      Se generará automáticamente un código QR único para <span className="text-beer-400 font-mono">/{businessSlug}/table/...</span>
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <span className="badge-beer text-xs self-start sm:self-auto">
                      Negocio activo: {businessName}
                    </span>
                  )}
                </div>

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
                    Mesas de {businessName} ({tables.length})
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
                            <div className={`w-2.5 h-2.5 rounded-full ${table.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
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

          {/* PESTAÑA 2: ESTADÍSTICAS E HISTORIAL */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-display text-white">
                    Estadísticas e Historial — {businessName}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Resumen en tiempo real de actividad musical en {businessName}
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
                  <span>Top 5 Canciones Más Sonadas en {businessName}</span>
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

          {/* PESTAÑA: PERSONALIZACIÓN DE MARCA (NOMBRE, LOGO Y COLORES DE LA ROCKOLA) */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Columna Izquierda: Formulario de Identidad Visual */}
                <form
                  onSubmit={handleSaveBranding}
                  className="lg:col-span-7 card p-6 bg-dark-50/90 rounded-3xl border-white/10 space-y-5"
                >
                  <div>
                    <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-beer-400" />
                      <span>Personalizar Rockola de {businessName}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Configura el nombre comercial, eslogan, logo y paleta de colores que verán los clientes al escanear los códigos QR en las mesas y en la pantalla del Reproductor Central.
                    </p>
                  </div>

                  {/* Nombre y Eslogan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Nombre del Negocio *
                      </label>
                      <input
                        type="text"
                        value={brandingForm.name}
                        onChange={(e) =>
                          setBrandingForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Ej: Tu K-VA / La Cervecería"
                        className="input-field text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Eslogan / Subtítulo
                      </label>
                      <input
                        type="text"
                        value={brandingForm.subtitle}
                        onChange={(e) =>
                          setBrandingForm((prev) => ({ ...prev, subtitle: e.target.value }))
                        }
                        placeholder="Ej: Cervecería & Música / Gastrobar"
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  {/* Logo del Negocio (Subida de Archivo o URL) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300">
                      Logo del Negocio (Opcional — PNG, JPG, SVG o URL)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <input
                        type="text"
                        value={brandingForm.logoUrl}
                        onChange={(e) =>
                          setBrandingForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                        }
                        placeholder="Pega la URL de tu logo o sube una imagen →"
                        className="input-field text-xs flex-1"
                      />

                      <label className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap transition-all">
                        <Upload className="w-4 h-4 text-beer-400" />
                        <span>Subir Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>

                      {brandingForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setBrandingForm((prev) => ({ ...prev, logoUrl: '' }))}
                          className="px-3 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold"
                        >
                          Quitar Logo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Temas Rápidos Predefinidos */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      Paletas de Colores Recomendadas (1 clic para probar en vivo)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {BRAND_COLOR_PRESETS.map((preset) => {
                        const isSelected =
                          brandingForm.primaryColor.toLowerCase() === preset.primaryColor.toLowerCase()
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              const next = {
                                ...brandingForm,
                                primaryColor: preset.primaryColor,
                                secondaryColor: preset.secondaryColor,
                              }
                              setBrandingForm(next)
                              applyBusinessTheme(next)
                            }}
                            className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'border-white bg-white/10 shadow-md'
                                : 'border-white/10 bg-dark-100/80 hover:border-white/25'
                            }`}
                          >
                            <span
                              className="w-7 h-7 rounded-xl flex-shrink-0 border border-white/20 shadow-sm"
                              style={{ background: preset.preview }}
                            />
                            <span className="text-xs font-semibold text-gray-200 leading-tight">
                              {preset.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Selectores de Color Exactos (Color Picker) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="p-3.5 rounded-2xl bg-dark-100 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Color Principal</p>
                        <p className="text-[11px] text-gray-400 font-mono uppercase">
                          {brandingForm.primaryColor}
                        </p>
                      </div>
                      <input
                        type="color"
                        value={brandingForm.primaryColor}
                        onChange={(e) => {
                          const next = { ...brandingForm, primaryColor: e.target.value }
                          setBrandingForm(next)
                          applyBusinessTheme(next)
                        }}
                        className="w-11 h-11 rounded-xl cursor-pointer bg-transparent border-0"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-dark-100 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Color de Acento / Degradado</p>
                        <p className="text-[11px] text-gray-400 font-mono uppercase">
                          {brandingForm.secondaryColor}
                        </p>
                      </div>
                      <input
                        type="color"
                        value={brandingForm.secondaryColor}
                        onChange={(e) => {
                          const next = { ...brandingForm, secondaryColor: e.target.value }
                          setBrandingForm(next)
                          applyBusinessTheme(next)
                        }}
                        className="w-11 h-11 rounded-xl cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="btn-primary py-3.5 px-8 text-sm flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isSavingBranding ? 'Guardando Diseño...' : 'Guardar Personalización de la Rockola'}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Columna Derecha: Vista Previa en Vivo del Celular del Cliente */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-1">
                    Vista Previa en Vivo (Celular en la Mesa)
                  </span>

                  <div className="card p-5 rounded-3xl bg-dark-200 border-2 border-beer-500/40 shadow-beer space-y-4">
                    {/* Simulación del Header de Mesa */}
                    <div className="pb-3 border-b border-white/10 flex items-center justify-between">
                      <Logo
                        size="sm"
                        businessName={brandingForm.name || businessName}
                        subtitle={brandingForm.subtitle}
                        logoUrl={brandingForm.logoUrl}
                      />
                      <div className="px-3 py-1.5 rounded-2xl bg-dark-50 border border-beer-500/40 text-xs font-black text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Mesa 1</span>
                      </div>
                    </div>

                    {/* Simulación de Frase y Botón con los colores elegidos */}
                    <div>
                      <p className="text-base font-display font-extrabold text-white">
                        ¡Tú eliges la <span className="text-gradient">música!</span> 🍺
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Así verán tus clientes la rockola al escanear el QR.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-dark-50 border border-beer-500/30 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Canción de Ejemplo</p>
                        <p className="text-[11px] text-gray-400">Artista Favorito • 3:45</p>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-beer-gradient text-dark-200 font-bold text-xs shadow-sm shadow-beer">
                        + Pedir
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-center text-[10px] text-gray-500">
                      Tecnología por <strong className="text-beer-400">CJ Systems</strong> • Ing. Ciro José
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer Corporativo CJ Systems */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between max-w-6xl w-full mx-auto gap-2">
        <span>
          Panel de Gestión Musical • Establecimiento: <strong className="text-gray-300">{businessName}</strong>
        </span>
        <span>
          Desarrollado por <strong className="text-beer-400">CJ Systems</strong> — Ing. Ciro José
        </span>
      </footer>
    </div>
  )
}
