import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Building2,
  Plus,
  RefreshCw,
  LogOut,
  Power,
  Mail,
  Lock,
  Hash,
  QrCode,
  MonitorSpeaker,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Palette,
  Users,
  Music,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useApp } from '@/context/AppContext'
import {
  getSuperAdminBusinesses,
  createSuperAdminBusiness,
  toggleBusinessStatus,
} from '@/lib/api'
import { BRAND_COLOR_PRESETS, applyBusinessTheme } from '@/lib/theme'

/**
 * Panel Maestro Independiente de SuperAdmin — CJ Systems (Ing. Ciro José)
 * Route: /superadmin
 * Completamente separado del dashboard de cada bar cliente (/admin/dashboard).
 */
export default function SuperAdminDashboardPage() {
  const { user, setBusiness, signOut } = useApp()
  const navigate = useNavigate()

  const [allBusinesses, setAllBusinesses] = useState([])
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false)
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
  const [newBizForm, setNewBizForm] = useState({
    name: '',
    slug: '',
    subtitle: 'Cervecería & Música',
    logoUrl: '',
    primaryColor: '#f59e0b',
    secondaryColor: '#f97316',
    adminEmail: '',
    adminPassword: '',
    initialTablesCount: 5,
    maxSongsPerWindow: 2,
    windowMinutes: 10,
  })

  // Subir logotipo desde archivo y optimizarlo automáticamente a Base64 ligero
  const handleNewBizLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen válida (PNG, JPG, WEBP o SVG)')
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
        setNewBizForm((prev) => ({ ...prev, logoUrl: compressedDataUrl }))
        toast.success('Logotipo cargado en la vista previa')
      }
      img.src = event.target?.result
    }
    reader.readAsDataURL(file)
  }

  // Asegurar que la Consola Maestra de CJ Systems siempre luzca con el tema corporativo Ámbar/Dorado
  useEffect(() => {
    applyBusinessTheme({ primaryColor: '#f59e0b', secondaryColor: '#f97316' })
  }, [])

  const fetchAllBusinesses = async () => {
    setIsLoadingBusinesses(true)
    try {
      const res = await getSuperAdminBusinesses()
      if (res?.success) {
        setAllBusinesses(res.data || [])
      }
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar los negocios')
    } finally {
      setIsLoadingBusinesses(false)
    }
  }

  useEffect(() => {
    fetchAllBusinesses()
  }, [])

  const handleCreateClientBusiness = async (e) => {
    e.preventDefault()
    if (!newBizForm.name.trim()) {
      toast.error('Ingresa el nombre del bar o negocio')
      return
    }

    setIsCreatingBusiness(true)
    try {
      const res = await createSuperAdminBusiness(newBizForm)
      if (res?.success) {
        toast.success(res.message || '¡Negocio creado con éxito!')
        setNewBizForm({
          name: '',
          slug: '',
          subtitle: 'Cervecería & Música',
          logoUrl: '',
          primaryColor: '#f59e0b',
          secondaryColor: '#f97316',
          adminEmail: '',
          adminPassword: '',
          initialTablesCount: 5,
          maxSongsPerWindow: 2,
          windowMinutes: 10,
        })
        await fetchAllBusinesses()
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo crear el negocio')
    } finally {
      setIsCreatingBusiness(false)
    }
  }

  const handleToggleBusinessActive = async (biz) => {
    const nextState = !biz.isActive
    try {
      const res = await toggleBusinessStatus(biz.id, nextState)
      if (res?.success) {
        toast.success(res.message)
        fetchAllBusinesses()
      }
    } catch (error) {
      toast.error(error.message || 'Error al actualizar estado del negocio')
    }
  }

  // Entrar a soporte/gestión de un cliente específico en su panel
  const handleManageClientPanel = (biz) => {
    setBusiness({
      id: biz.id,
      name: biz.name,
      slug: biz.slug,
      branding: biz.branding,
    })
    if (biz.branding) {
      applyBusinessTheme(biz.branding)
    }
    toast.success(`Entrando al panel de soporte de ${biz.name}`)
    navigate('/admin/dashboard')
  }

  // Métricas globales de toda tu plataforma CJ Systems
  const totalClients = allBusinesses.length
  const activeClients = allBusinesses.filter((b) => b.isActive).length
  const totalTablesAll = allBusinesses.reduce((acc, b) => acc + (b.totalTables || 0), 0)
  const totalSongsPlayedAll = allBusinesses.reduce((acc, b) => acc + (b.totalPlayed || 0), 0)

  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans flex flex-col justify-between">
      <div>
        {/* Cabecera Exclusiva CJ Systems */}
        <header className="border-b border-white/10 px-4 sm:px-6 py-4 bg-dark-100/90 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-beer-gradient flex items-center justify-center text-dark-200 font-display font-black text-lg shadow-beer">
                CJ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-base sm:text-lg tracking-wide text-white leading-none">
                    CJ <span className="text-gradient">SYSTEMS</span>
                  </span>
                  <span className="badge-beer text-[10px] font-bold">SuperAdmin</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Consola Maestra SaaS • Ing. Ciro José
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 transition-all"
              >
                <span>Ver Landing</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <span className="text-gray-400 text-xs hidden md:block border-l border-white/10 pl-3">
                {user?.email}
              </span>

              <button
                onClick={async () => {
                  await signOut()
                  navigate('/superadmin/login', { replace: true })
                }}
                className="btn-ghost flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 py-2 px-3 rounded-xl"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* KPIs Globales de CJ Systems */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase font-bold">Negocios Clientes</p>
                <Building2 className="w-4 h-4 text-beer-400" />
              </div>
              <p className="text-3xl font-black text-white mt-2">{totalClients}</p>
            </div>

            <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase font-bold">Suscripciones Activas</p>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-3xl font-black text-green-400 mt-2">{activeClients}</p>
            </div>

            <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase font-bold">Mesas QR Totales</p>
                <QrCode className="w-4 h-4 text-beer-400" />
              </div>
              <p className="text-3xl font-black text-beer-400 mt-2">{totalTablesAll}</p>
            </div>

            <div className="card p-5 bg-dark-50/90 rounded-3xl border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase font-bold">Canciones Sonadas</p>
                <Music className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-3xl font-black text-orange-400 mt-2">{totalSongsPlayedAll}</p>
            </div>
          </div>

          {/* Formulario para Crear Nuevo Negocio Cliente */}
          <div className="card p-6 bg-dark-50/90 rounded-3xl border-beer-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-beer-400" />
                  <span>Dar de Alta Nuevo Negocio Cliente</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Crea un nuevo bar aislado con su propia marca, colores, mesas QR y credenciales de acceso para su dueño.
                </p>
              </div>
              <button
                onClick={fetchAllBusinesses}
                className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 flex items-center gap-2 border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBusinesses ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            <form
              onSubmit={handleCreateClientBusiness}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Nombre del Bar / Negocio *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={newBizForm.name}
                    onChange={(e) => {
                      const val = e.target.value
                      const makeSlug = (s) =>
                        s
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '')
                      const autoSlug = makeSlug(val)
                      setNewBizForm((prev) => ({
                        ...prev,
                        name: val,
                        slug: prev.slug === '' || prev.slug === makeSlug(prev.name) ? autoSlug : prev.slug,
                      }))
                    }}
                    placeholder="Ej: La Cervecería Real"
                    className="input-field pl-10 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Identificador URL (Slug) *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={newBizForm.slug}
                    onChange={(e) =>
                      setNewBizForm((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    placeholder="ej: cerveceria-real"
                    className="input-field pl-10 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Mesas QR Iniciales
                </label>
                <div className="relative">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newBizForm.initialTablesCount}
                    onChange={(e) =>
                      setNewBizForm((prev) => ({
                        ...prev,
                        initialTablesCount: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="input-field pl-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Correo del Dueño / Admin *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={newBizForm.adminEmail}
                    onChange={(e) =>
                      setNewBizForm((prev) => ({ ...prev, adminEmail: e.target.value }))
                    }
                    placeholder="admin@nuevo-bar.com"
                    className="input-field pl-10 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Contraseña del Dueño (mín. 6 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={newBizForm.adminPassword}
                    onChange={(e) =>
                      setNewBizForm((prev) => ({ ...prev, adminPassword: e.target.value }))
                    }
                    placeholder="Ej: BarMusical2026*"
                    className="input-field pl-10 text-sm"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Eslogan / Subtítulo
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={newBizForm.subtitle}
                    onChange={(e) =>
                      setNewBizForm((prev) => ({ ...prev, subtitle: e.target.value }))
                    }
                    placeholder="Ej: Gastrobar & Música"
                    className="input-field pl-10 text-sm"
                  />
                </div>
              </div>

              {/* Control Antimonopolio Configurable por Negocio (Canciones por Mesa y Tiempo) */}
              <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-dark-100/80 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-beer-400" />
                      <span>Regla Antimonopolio por Mesa (Ideal según cantidad de QRs)</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Define cuántas canciones puede pedir cada mesa y cada cuántos minutos (ej: 1 canción cada 15 min para locales grandes).
                    </p>
                  </div>
                  <span className="badge-beer text-xs font-bold self-start sm:self-center">
                    {newBizForm.maxSongsPerWindow === 1
                      ? '1 canción'
                      : `${newBizForm.maxSongsPerWindow} canciones`}{' '}
                    cada {newBizForm.windowMinutes} min
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Canciones permitidas por mesa
                    </label>
                    <div className="relative">
                      <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={newBizForm.maxSongsPerWindow}
                        onChange={(e) =>
                          setNewBizForm((prev) => ({
                            ...prev,
                            maxSongsPerWindow: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)),
                          }))
                        }
                        className="input-field pl-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Tiempo de espera (en minutos)
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={newBizForm.windowMinutes}
                        onChange={(e) =>
                          setNewBizForm((prev) => ({
                            ...prev,
                            windowMinutes: Math.max(1, Math.min(180, parseInt(e.target.value, 10) || 1)),
                          }))
                        }
                        className="input-field pl-10 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Estudio Interactivo de Logotipo y Colores + Vista Previa en Vivo */}
              <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-white/10">
                {/* Controles de Logo y Paleta Interactiva */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Logotipo */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      Logotipo del Negocio (PNG, JPG, SVG o URL)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={newBizForm.logoUrl}
                          onChange={(e) =>
                            setNewBizForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                          }
                          placeholder="Pega URL del logo o sube una imagen →"
                          className="input-field pl-10 text-xs"
                        />
                      </div>

                      <label className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap transition-all">
                        <Upload className="w-4 h-4 text-beer-400" />
                        <span>Subir Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleNewBizLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {newBizForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setNewBizForm((prev) => ({ ...prev, logoUrl: '' }))}
                          className="px-3 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Paletas Interactivas Visuales */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-beer-400" />
                      <span>Paleta de Colores de la Rockola (elige un estilo o personaliza)</span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BRAND_COLOR_PRESETS.map((preset) => {
                        const isSelected =
                          newBizForm.primaryColor.toLowerCase() === preset.primaryColor.toLowerCase()
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setNewBizForm((prev) => ({
                                ...prev,
                                primaryColor: preset.primaryColor,
                                secondaryColor: preset.secondaryColor,
                              }))
                            }
                            className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 active:scale-95 ${
                              isSelected
                                ? 'border-white bg-white/10 shadow-md ring-1 ring-white/40'
                                : 'border-white/10 bg-dark-100/80 hover:border-white/25'
                            }`}
                          >
                            <span
                              className="w-7 h-7 rounded-xl flex-shrink-0 border border-white/20 shadow-sm"
                              style={{ background: preset.preview }}
                            />
                            <span className="text-[11px] font-semibold text-gray-200 leading-tight">
                              {preset.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Selectores de Color Exacto (Color Pickers) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <label className="p-2.5 rounded-2xl bg-dark-100 border border-white/10 hover:border-white/25 flex items-center justify-between cursor-pointer transition-all">
                        <div>
                          <p className="text-[11px] font-bold text-white">Color Principal</p>
                          <p className="text-[10px] text-gray-400 font-mono uppercase">
                            {newBizForm.primaryColor}
                          </p>
                        </div>
                        <input
                          type="color"
                          value={newBizForm.primaryColor}
                          onChange={(e) =>
                            setNewBizForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                          }
                          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      </label>

                      <label className="p-2.5 rounded-2xl bg-dark-100 border border-white/10 hover:border-white/25 flex items-center justify-between cursor-pointer transition-all">
                        <div>
                          <p className="text-[11px] font-bold text-white">Color Acento</p>
                          <p className="text-[10px] text-gray-400 font-mono uppercase">
                            {newBizForm.secondaryColor}
                          </p>
                        </div>
                        <input
                          type="color"
                          value={newBizForm.secondaryColor}
                          onChange={(e) =>
                            setNewBizForm((prev) => ({ ...prev, secondaryColor: e.target.value }))
                          }
                          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Vista Previa en Vivo de la Rockola del Nuevo Cliente */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div
                    className="p-4 rounded-3xl bg-dark-200 border-2 space-y-3.5 transition-all"
                    style={{
                      borderColor: `${newBizForm.primaryColor}66`,
                      boxShadow: `0 0 28px ${newBizForm.primaryColor}22`,
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm text-dark-200 flex-shrink-0 overflow-hidden border border-white/15"
                          style={{
                            background: newBizForm.logoUrl
                              ? '#111111'
                              : `linear-gradient(135deg, ${newBizForm.primaryColor}, ${newBizForm.secondaryColor})`,
                          }}
                        >
                          {newBizForm.logoUrl ? (
                            <img
                              src={newBizForm.logoUrl}
                              alt="Preview Logo"
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            (newBizForm.name || 'NB').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-display font-black text-sm uppercase tracking-wider truncate bg-clip-text text-transparent"
                            style={{
                              backgroundImage: `linear-gradient(135deg, ${newBizForm.primaryColor}, ${newBizForm.secondaryColor})`,
                            }}
                          >
                            {newBizForm.name || 'NUEVO BAR'}
                          </p>
                          <p className="text-[10px] text-gray-300 uppercase tracking-widest truncate">
                            {newBizForm.subtitle || 'Cervecería & Música'}
                          </p>
                        </div>
                      </div>

                      <span
                        className="px-2.5 py-1 rounded-xl bg-dark-50 text-[10px] font-bold text-white border flex-shrink-0"
                        style={{ borderColor: `${newBizForm.primaryColor}66` }}
                      >
                        ● Mesa 1
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-dark-50 border border-white/10 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">Canción de Muestra</p>
                        <p className="text-[10px] text-gray-400 truncate">Vista previa en vivo</p>
                      </div>
                      <span
                        className="px-3 py-1.5 rounded-xl text-dark-200 font-black text-[11px] flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${newBizForm.primaryColor}, ${newBizForm.secondaryColor})`,
                        }}
                      >
                        + Pedir
                      </span>
                    </div>

                    <p className="text-[10px] text-center text-gray-500">
                      Vista previa en vivo • Tecnología por{' '}
                      <strong style={{ color: newBizForm.primaryColor }}>CJ Systems</strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingBusiness}
                    className="mt-4 w-full py-3.5 px-6 rounded-2xl text-dark-200 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${newBizForm.primaryColor}, ${newBizForm.secondaryColor})`,
                      boxShadow: `0 0 22px ${newBizForm.primaryColor}44`,
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingBusiness ? 'Creando Negocio...' : 'Crear Negocio Cliente'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Listado de Negocios Clientes */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-beer-400" />
                <span>Cartera de Negocios en CJ Systems ({allBusinesses.length})</span>
              </h3>
              <span className="text-xs text-gray-400">
                Cada cliente tiene su propio acceso en /admin/login totalmente independiente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allBusinesses.map((biz) => (
                <div
                  key={biz.id}
                  className="card p-5 rounded-3xl bg-dark-50/90 border border-white/10 hover:border-beer-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-display font-black text-sm text-dark-200 border border-white/10 flex-shrink-0 overflow-hidden"
                          style={{
                            background: biz.branding?.logoUrl
                              ? '#111111'
                              : `linear-gradient(135deg, ${biz.branding?.primaryColor || '#f59e0b'}, ${biz.branding?.secondaryColor || '#f97316'})`,
                          }}
                        >
                          {biz.branding?.logoUrl ? (
                            <img
                              src={biz.branding.logoUrl}
                              alt={biz.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            biz.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-lg text-white leading-tight">
                            {biz.name}
                          </h4>
                          <p className="text-xs text-gray-400 font-mono">
                            /{biz.slug} • {biz.branding?.subtitle || 'Cervecería & Música'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                          biz.isActive
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {biz.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Pausado
                          </>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-2xl bg-dark-100/80 border border-white/5 text-center">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Mesas QR</p>
                        <p className="text-base font-black text-white">
                          {biz.activeTables}/{biz.totalTables}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Reproducidas</p>
                        <p className="text-base font-black text-beer-400">{biz.totalPlayed}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">En Cola</p>
                        <p className="text-base font-black text-green-400">{biz.pendingInQueue}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-gray-400">
                      <p>
                        <strong className="text-gray-300">Regla por mesa:</strong>{' '}
                        <span className="text-beer-400 font-semibold">
                          {(biz.branding?.maxSongsPerWindow || 2) === 1
                            ? '1 canción'
                            : `${biz.branding?.maxSongsPerWindow || 2} canciones`}{' '}
                          cada {biz.branding?.windowMinutes || 10} min
                        </span>
                      </p>
                      <p>
                        <strong className="text-gray-300">Admin del cliente:</strong>{' '}
                        {biz.admins?.length > 0
                          ? biz.admins.map((a) => a.email).join(', ')
                          : 'Sin cuenta cliente asignada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleManageClientPanel(biz)}
                      className="flex-1 py-2 px-3 rounded-xl bg-beer-500 text-dark-200 font-bold text-xs hover:brightness-110 transition-all text-center"
                    >
                      Entrar a Soporte / QRs
                    </button>

                    <Link
                      to={`/player/${biz.slug}`}
                      target="_blank"
                      className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-semibold text-xs border border-white/10 flex items-center gap-1"
                    >
                      <MonitorSpeaker className="w-3.5 h-3.5 text-beer-400" />
                      <span>Player</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleToggleBusinessActive(biz)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all ${
                        biz.isActive
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{biz.isActive ? 'Pausar' : 'Activar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <footer className="border-t border-white/10 py-4 px-6 text-center text-xs text-gray-500">
        CJ Systems • Consola Maestra SaaS — Ing. Ciro José
      </footer>
    </div>
  )
}
