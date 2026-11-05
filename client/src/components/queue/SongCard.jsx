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
 * SongCard - Componente para mostrar canciones en resultados de búsqueda
 * @param {object} props
 * @param {object} props.song - Datos de la canción ({ title, artist, thumbnail_url, duration })
 * @param {function} props.onAdd - Callback al hacer clic en agregar
 * @param {boolean} props.isAdding - Estado de carga individual
 * @param {boolean} props.isAdded - Si la canción ya fue agregada
 */
export default function SongCard({ song, onAdd, isAdding = false, isAdded = false }) {
  const { title, artist, thumbnail_url, duration } = song

  return (
    <div className="card-hover flex items-center p-3 gap-3 bg-dark-50/90 border border-dark-border/60 hover:border-beer-500/40 rounded-2xl group transition-all">
      {/* Portada */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl overflow-hidden bg-dark-100 border border-white/5">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 bg-dark-100">
            <Music className="w-6 h-6 text-beer-500/50" />
          </div>
        )}
      </div>

      {/* Info de la Canción con texto visible completo */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="font-semibold text-sm sm:text-base text-white line-clamp-2 leading-snug group-hover:text-beer-400 transition-colors">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-gray-400 line-clamp-1 mt-1 font-medium">
          {artist}
        </p>
        {duration > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
            <Clock className="w-3 h-3 text-beer-500/70" />
            <span>{formatDuration(duration)}</span>
          </div>
        )}
      </div>

      {/* Botón de Agregar */}
      <button
        onClick={() => onAdd(song)}
        disabled={isAdding || isAdded}
        className={`flex-shrink-0 flex items-center justify-center h-10 px-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 ${
          isAdded
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isAdding
            ? 'bg-beer-500/20 text-beer-400 border border-beer-500/30 animate-pulse'
            : 'bg-beer-gradient text-dark-200 hover:brightness-110 active:scale-95 shadow-sm shadow-beer/30'
        }`}
        title={isAdded ? 'Agregada a la cola' : 'Pedir esta canción'}
      >
        {isAdded ? (
          <span className="flex items-center gap-1 font-semibold">
            <Check className="w-4 h-4" />
            <span className="hidden xs:inline">Pedida</span>
          </span>
        ) : isAdding ? (
          <span className="text-xs">Agregando...</span>
        ) : (
          <span className="flex items-center gap-1 font-bold">
            <Plus className="w-4 h-4" />
            <span>Pedir</span>
          </span>
        )}
      </button>
    </div>
  )
}
