import React from 'react'
import { Plus, Check, Clock, Music } from 'lucide-react'

/**
 * Formatea duración en segundos a MM:SS
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

/**
 * SongCard - Componente responsivo y optimizado para móviles y pantallas táctiles
 */
export default function SongCard({ song, onAdd, isAdding = false, isAdded = false }) {
  const { title, artist, thumbnail_url, duration } = song

  return (
    <div className="flex items-center p-2.5 sm:p-3 gap-2.5 sm:gap-3 bg-dark-50/95 border border-white/5 hover:border-beer-500/40 rounded-2xl group transition-all duration-150 active:bg-dark-100">
      {/* Portada compacta con duración integrada */}
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl overflow-hidden bg-dark-100 border border-white/10 shadow-sm">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 bg-dark-100">
            <Music className="w-5 h-5 text-beer-500/50" />
          </div>
        )}

        {/* Micro badge de duración sobre la imagen */}
        {duration > 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-[2px] py-0.5 text-center">
            <span className="text-[9px] font-semibold text-gray-200 font-mono tracking-tight leading-none block">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {/* Info de la Canción optimizada para móvil */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="font-semibold text-xs sm:text-sm text-white truncate leading-tight group-hover:text-beer-400 transition-colors">
          {title}
        </h4>
        <p className="text-[11px] sm:text-xs text-gray-400 truncate mt-0.5 font-medium">
          {artist}
        </p>
      </div>

      {/* Botón de Agregar táctil y responsivo */}
      <button
        type="button"
        onClick={() => onAdd(song)}
        disabled={isAdding || isAdded}
        className={`flex-shrink-0 flex items-center justify-center h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 touch-manipulation ${
          isAdded
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isAdding
            ? 'bg-beer-500/20 text-beer-400 border border-beer-500/30 animate-pulse'
            : 'bg-beer-gradient text-dark-200 hover:brightness-110 active:brightness-95 shadow-sm shadow-beer/20'
        }`}
        title={isAdded ? 'Agregada a la playlist' : 'Pedir esta canción'}
      >
        {isAdded ? (
          <span className="flex items-center gap-1 font-semibold">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] sm:text-xs">Lista</span>
          </span>
        ) : isAdding ? (
          <span className="text-[11px]">...</span>
        ) : (
          <span className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Pedir</span>
          </span>
        )}
      </button>
    </div>
  )
}
