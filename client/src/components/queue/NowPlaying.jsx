import React from 'react'
import { Music, Radio, Disc3 } from 'lucide-react'
import { formatDuration } from './SongCard'

/**
 * NowPlaying - Componente que destaca la canción sonando en el establecimiento
 * Soporta modo normal y modo 'compact' para ahorrar espacio al buscar en móviles
 */
export default function NowPlaying({ song, compact = false }) {
  if (!song) {
    if (compact) {
      return (
        <div className="p-2.5 bg-dark-50/80 border border-dark-border/60 rounded-xl flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2 truncate">
            <Disc3 className="w-4 h-4 text-beer-500/70 animate-spin-slow flex-shrink-0" />
            <span className="truncate">Música de ambiente del bar</span>
          </div>
          <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
            En vivo
          </span>
        </div>
      )
    }

    return (
      <div className="card p-3.5 sm:p-4 bg-gradient-to-r from-dark-50 via-dark-100 to-dark-50 border border-dark-border/80 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
              Sonando ahora
            </p>
            <p className="text-xs sm:text-sm font-medium text-gray-400">
              Música ambiental del bar
            </p>
          </div>
        </div>
        <span className="badge-beer text-[10px] px-2 py-0.5 font-bold">En vivo</span>
      </div>
    )
  }

  const { title, artist, thumbnail_url, duration, tableName } = song

  // Modo Compacto (Mini bar) para búsqueda en móviles
  if (compact) {
    return (
      <div className="p-2 sm:p-2.5 bg-gradient-to-r from-beer-950/40 via-dark-50 to-dark-100 border border-beer-500/30 rounded-xl flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-beer-500/30">
            {thumbnail_url ? (
              <img src={thumbnail_url} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-dark-100 flex items-center justify-center">
                <Music className="w-4 h-4 text-beer-500" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {title}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {artist} {tableName ? `• ${tableName}` : ''}
            </p>
          </div>
        </div>

        {/* Ecualizador animado mini */}
        <div className="flex items-end gap-0.5 h-3.5 flex-shrink-0 pr-1">
          <span className="equalizer-bar h-3.5"></span>
          <span className="equalizer-bar h-2.5"></span>
          <span className="equalizer-bar h-3"></span>
        </div>
      </div>
    )
  }

  // Modo Completo con brillo y ecualizador
  return (
    <div className="relative overflow-hidden card bg-gradient-to-br from-beer-950/40 via-dark-50 to-dark-100 border border-beer-500/30 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-beer/10 shadow-lg">
      {/* Luz ambiente de fondo */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-beer-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header con estado en vivo */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-beer-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-beer-500"></span>
          </span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-beer-400">
            Sonando ahora en el bar
          </span>
        </div>

        {/* Ecualizador animado */}
        <div className="flex items-end gap-1 h-3.5 sm:h-4">
          <span className="equalizer-bar h-3.5 sm:h-4"></span>
          <span className="equalizer-bar h-2.5 sm:h-3"></span>
          <span className="equalizer-bar h-3.5 sm:h-5"></span>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Portada con brillo */}
        <div className="relative w-14 h-14 sm:w-18 sm:h-18 flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden shadow-md shadow-black/60 border border-beer-500/20">
          {thumbnail_url ? (
            <img
              src={thumbnail_url}
              alt={title}
              className="w-full h-full object-cover animate-pulse-slow"
            />
          ) : (
            <div className="w-full h-full bg-beer-900/30 flex items-center justify-center">
              <Radio className="w-6 h-6 text-beer-400" />
            </div>
          )}
        </div>

        {/* Título y detalles */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 sm:line-clamp-2 leading-tight font-display">
            {title}
          </h3>
          <p className="text-xs text-beer-200/90 truncate font-medium mt-0.5">
            {artist}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {tableName && (
              <span className="inline-flex items-center text-[10px] font-semibold bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/5">
                Pedida por {tableName}
              </span>
            )}
            {duration > 0 && (
              <span className="text-[10px] text-gray-400">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
