import React, { useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

/**
 * SearchBar - Barra de búsqueda con icono, botón de limpiar y spinner de carga
 * @param {object} props
 * @param {string} props.value - Término de búsqueda actual
 * @param {function} props.onChange - Handler de cambio de texto
 * @param {function} props.onClear - Handler para limpiar búsqueda
 * @param {boolean} props.isLoading - Estado de búsqueda activa
 * @param {string} props.placeholder - Texto placeholder
 */
export default function SearchBar({
  value,
  onChange,
  onClear,
  isLoading = false,
  placeholder = 'Buscar por canción, artista o grupo...',
}) {
  const inputRef = useRef(null)

  const handleClear = () => {
    if (onClear) onClear()
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full">
      {/* Icono de búsqueda */}
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
        <Search className="w-5 h-5 text-beer-500/80" />
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-11 py-3.5 bg-dark-50 border border-dark-border focus:border-beer-500/80 rounded-2xl text-white placeholder-gray-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-beer-500/30 transition-all shadow-inner"
        autoComplete="off"
        spellCheck="false"
      />

      {/* Icono derecho: Spinner o Botón de limpiar */}
      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-beer-500 animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Borrar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
