import React, { useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

/**
 * SearchBar - Barra de búsqueda responsiva, sin doble X y con indicador de carga visible
 */
export default function SearchBar({
  value,
  onChange,
  onClear,
  onSearch,
  isLoading = false,
  placeholder = 'Buscar canción, artista o género...',
  chips = [],
  onSelectChip,
}) {
  const inputRef = useRef(null)

  const handleClear = () => {
    if (onClear) onClear()
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
      if (onSearch) onSearch(value)
    }
  }

  return (
    <div className="w-full max-w-full space-y-2.5">
      {/* Campo de búsqueda principal */}
      <div className="relative w-full">
        {/* Icono de búsqueda izquierdo */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-beer-500/80" />
        </div>

        {/* Input tipo text para evitar la doble 'X' nativa de WebKit */}
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-dark-50/90 border border-dark-border focus:border-beer-500/80 rounded-2xl text-white placeholder-gray-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-beer-500/20 transition-all shadow-inner"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
        />

        {/* Icono derecho: Indicador de carga giratorio (Spinner) o botón único de limpiar */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
          {isLoading ? (
            <div className="p-1 flex items-center justify-center text-beer-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-full text-gray-400 hover:text-white active:bg-white/10 transition-colors touch-manipulation"
              title="Borrar búsqueda"
              aria-label="Borrar texto"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Chips Rápidos de Géneros / Filtros (Scroll horizontal sin desbordes de página) */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full touch-pan-x -mx-1 px-1">
          {chips.map((chip) => {
            const isSelected = value.toLowerCase() === chip.query.toLowerCase()
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => onSelectChip && onSelectChip(chip.query)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex-shrink-0 touch-manipulation ${
                  isSelected
                    ? 'bg-beer-500 text-dark-200 shadow-sm shadow-beer/30 font-bold'
                    : 'bg-dark-100/90 text-gray-300 hover:text-white border border-white/5 active:border-beer-500/40 hover:bg-dark-50'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
