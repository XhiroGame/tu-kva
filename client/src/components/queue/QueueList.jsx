import React from 'react'
import { Music, Clock, User, Disc3 } from 'lucide-react'
import { formatDuration } from './SongCard'

/**
 * QueueList - Lista de canciones pendientes en la playlist
 * @param {object} props
 * @param {Array} props.queue - Lista de canciones en la cola
 * @param {string} props.currentTableId - ID de la mesa actual para resaltar sus pedidos
 */
export default function QueueList({ queue = [], currentTableId = null }) {
  if (queue.length === 0) {
    return (
      <div className="card p-8 text-center border-dashed border-dark-border/80 rounded-3xl bg-dark-50/40">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-beer-500/10 flex items-center justify-center text-beer-400">
          <Disc3 className="w-7 h-7" />
        </div>
        <h3 className="font-semibold text-white text-base">La playlist está vacía</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
          ¡Sé el primero en pedir una canción para ambientar el bar!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {queue.map((item, index) => {
        const isMyTable = currentTableId && item.table_id === currentTableId
        const song = item.songs || item.song || {}

        return (
          <div
            key={item.id || index}
            className={`flex items-center p-3 gap-3 rounded-2xl border transition-all ${
              isMyTable
                ? 'bg-beer-950/20 border-beer-500/40 shadow-sm shadow-beer/10'
                : 'bg-dark-50/70 border-dark-border/60'
            }`}
          >
            {/* Número de posición / Turno */}
            <div className="w-7 h-7 flex-shrink-0 rounded-full bg-dark-100 flex items-center justify-center font-display font-bold text-xs text-beer-400 border border-white/5">
              {index + 1}
            </div>

            {/* Mini portada */}
            <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-dark-100 border border-white/5">
              {song.thumbnail_url ? (
                <img
                  src={song.thumbnail_url}
                  alt={song.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <Music className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>

            {/* Título & Artista */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-white truncate">
                  {song.title || 'Canción sin título'}
                </h4>
                {isMyTable && (
                  <span className="badge-beer text-[10px] py-0 px-2 flex-shrink-0 font-bold">
                    Tu pedido
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {song.artist || 'Artista desconocido'}
              </p>
            </div>

            {/* Info lateral: mesa / duración */}
            <div className="flex-shrink-0 text-right">
              {item.tables?.table_name && (
                <p className="text-[11px] font-medium text-gray-300">
                  {item.tables.table_name}
                </p>
              )}
              {song.duration > 0 && (
                <p className="text-[10px] text-gray-500 flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDuration(song.duration)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
