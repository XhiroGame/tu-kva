import React from 'react'
import { Music, Radio } from 'lucide-react'
import { formatDuration } from './SongCard'

/**
 * NowPlaying - Componente que destaca la canción sonando en el establecimiento
 * @param {object} props
 * @param {object} props.song - Canción activa ({ title, artist, thumbnail_url, duration, tableName })
 */
export default function NowPlaying({ song }) {
  if (!song) {
    return (
      <div className="card p-4 bg-gradient-to-r from-dark-50 via-dark-100 to-dark-50 border border-dark-border/80 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
            <Music className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              Sonando ahora
            </p>
            <p className="text-sm font-medium text-gray-400">
              Música ambiental del bar
            </p>
          </div>
        </div>
        <span className="badge-beer text-[11px] px-2.5 py-1">En espera</span>
      </div>
    )
  }

  const { title, artist, thumbnail_url, duration, tableName } = song

  return (
    <div className="relative overflow-hidden card bg-gradient-to-br from-beer-950/40 via-dark-50 to-dark-100 border border-beer-500/30 rounded-3xl p-4 shadow-beer/10 shadow-lg">
      {/* Luz ambiente de fondo */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-beer-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header con estado en vivo */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-beer-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-beer-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-beer-400">
            Sonando ahora en el bar
          </span>
        </div>

        {/* Ecualizador animado */}
        <div className="flex items-end gap-1 h-4">
          <span className="equalizer-bar h-4"></span>
          <span className="equalizer-bar h-3"></span>
          <span className="equalizer-bar h-5"></span>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex items-center gap-4">
        {/* Portada con brillo */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-2xl overflow-hidden shadow-md shadow-black/60 border border-beer-500/20">
          {thumbnail_url ? (
            <img
              src={thumbnail_url}
              alt={title}
              className="w-full h-full object-cover animate-pulse-slow"
            />
          ) : (
            <div className="w-full h-full bg-beer-900/30 flex items-center justify-center">
              <Radio className="w-8 h-8 text-beer-400" />
            </div>
          )}
        </div>

        {/* Título y detalles */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-snug font-display">
            {title}
          </h3>
          <p className="text-sm text-beer-200/90 truncate font-medium mt-0.5">
            {artist}
          </p>

          <div className="flex items-center gap-2 mt-2">
            {tableName && (
              <span className="inline-flex items-center text-[11px] font-semibold bg-white/10 text-gray-300 px-2.5 py-0.5 rounded-full border border-white/5">
                Pedida por {tableName}
              </span>
            )}
            {duration > 0 && (
              <span className="text-[11px] text-gray-400">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
