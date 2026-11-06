import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, Clock, ArrowUpRight, Sparkles } from 'lucide-react'
import { getSongSuggestions } from '@/lib/api'

/**
 * SearchBar - Buscador estilo YouTube con Autocompletado en tiempo real e Historial
 */
export default function SearchBar({
  value,
  onChange,
  onClear,
  onSearch,
  isLoading = false,
  placeholder = 'Buscar en YouTube...',
  chips = [],
  onSelectChip,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Cargar historial de búsquedas recientes de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tukva_recent_searches')
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch {
      // Ignorar
    }
  }, [])

  // Guardar búsqueda en el historial
  const saveRecentSearch = (searchTerm) => {
    const term = (searchTerm || '').trim()
    if (!term) return
    try {
      const filtered = recentSearches.filter((item) => item.toLowerCase() !== term.toLowerCase())
      const updated = [term, ...filtered].slice(0, 6)
      setRecentSearches(updated)
      localStorage.setItem('tukva_recent_searches', JSON.stringify(updated))
    } catch {
      // Ignorar
    }
  }

  // Eliminar elemento del historial
  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation()
    try {
      const updated = recentSearches.filter((item) => item !== termToRemove)
      setRecentSearches(updated)
      localStorage.setItem('tukva_recent_searches', JSON.stringify(updated))
    } catch {
      // Ignorar
    }
  }

  // Consultar autocompletado oficial de YouTube cuando el usuario escribe
  useEffect(() => {
    const q = (value || '').trim()

    if (!q) {
      setSuggestions([])
      return
    }

    // Cancelar consulta de sugerencias previa
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const res = await getSongSuggestions(q, {
          signal: abortControllerRef.current?.signal,
        })
        if (res?.data && Array.isArray(res.data)) {
          setSuggestions(res.data)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSuggestions([])
        }
      }
    }, 120) // 120ms debounce ultra-ágil para autocompletado

    return () => clearTimeout(timer)
  }, [value])

  // Cerrar sugerencias al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const handleSelectSuggestion = (term) => {
    onChange(term)
    saveRecentSearch(term)
    setIsOpen(false)
    setSelectedIndex(-1)
    if (onSearch) {
      onSearch(term)
    }
  }

  const handleKeyDown = (e) => {
    if (!isOpen) return

    const items = value.trim() ? suggestions : recentSearches

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault()
        handleSelectSuggestion(items[selectedIndex])
      } else {
        saveRecentSearch(value)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSelectedIndex(-1)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim()) {
      saveRecentSearch(value)
      setIsOpen(false)
      if (onSearch) {
        onSearch(value)
      }
    }
  }

  const handleClear = () => {
    if (onClear) onClear()
    inputRef.current?.focus()
    setSuggestions([])
  }

  const hasSuggestions = value.trim() && suggestions.length > 0
  const hasRecents = !value.trim() && recentSearches.length > 0
  const showDropdown = isOpen && (hasSuggestions || hasRecents)

  return (
    <div ref={containerRef} className="w-full max-w-full space-y-2.5 relative">
      {/* Formulario de Búsqueda estilo YouTube - Sin desbordes */}
      <form onSubmit={handleSubmit} className="relative w-full max-w-full">
        <div
          className={`relative flex items-center w-full max-w-full bg-[#121212] border transition-all duration-200 rounded-full shadow-lg ${
            isOpen
              ? 'border-beer-500 ring-2 ring-beer-500/20 shadow-beer/10'
              : 'border-white/15 hover:border-white/25'
          }`}
        >
          {/* Icono de búsqueda izquierdo */}
          <div className="pl-3.5 sm:pl-4 pr-1 flex items-center pointer-events-none text-gray-400 flex-shrink-0">
            <Search className="w-4 h-4 text-beer-400/90" />
          </div>

          {/* Campo de texto tipo YouTube con flex-1 min-w-0 para evitar desbordes */}
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-0 py-2.5 sm:py-3 px-2 bg-transparent text-white placeholder-gray-400 text-xs sm:text-sm focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />

          {/* Acciones derechas: Símbolo de espera destacado + Botón limpiar + Botón buscar */}
          <div className="pr-1.5 flex items-center gap-1 flex-shrink-0">
            {isLoading && (
              <div
                className="flex items-center gap-1 bg-beer-500/15 border border-beer-500/30 px-2 py-0.5 rounded-full animate-pulse"
                title="Buscando en YouTube..."
              >
                <Loader2 className="w-3.5 h-3.5 text-beer-400 animate-spin" />
                <span className="text-[10px] text-beer-300 font-bold hidden sm:inline">Buscando</span>
              </div>
            )}

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all touch-manipulation flex-shrink-0"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Botón de lupa derecho compacto estilo YouTube siempre proporcional */}
            <button
              type="submit"
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-beer-500/15 hover:bg-beer-500/25 text-beer-400 active:scale-95 transition-all flex-shrink-0"
              title="Buscar en YouTube"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MENÚ DESPLEGABLE FLOTANTE DE AUTOCOMPLETADO ESTILO YOUTUBE */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[#212121]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-scale-up max-w-full">
            {/* Cabecera si son búsquedas recientes */}
            {hasRecents && (
              <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-beer-400" />
                  Búsquedas recientes
                </span>
                <span className="text-[10px] text-gray-500 normal-case">Toca para buscar</span>
              </div>
            )}

            {/* Lista de sugerencias */}
            <ul className="py-1 divide-y divide-white/5 max-h-72 overflow-y-auto">
              {(value.trim() ? suggestions : recentSearches).map((item, idx) => {
                const isItemActive = idx === selectedIndex

                return (
                  <li
                    key={`${item}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectSuggestion(item)
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors touch-manipulation ${
                      isItemActive
                        ? 'bg-beer-500/20 text-beer-300'
                        : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {value.trim() ? (
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-beer-400 flex-shrink-0" />
                      )}
                      <span className="truncate font-medium">{item}</span>
                    </div>

                    {/* Botón de acción rápido a la derecha */}
                    {!value.trim() ? (
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(e, item)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        title="Eliminar del historial"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-gray-500 opacity-60 flex-shrink-0 ml-2" />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </form>

      {/* Chips Rápidos de Categorías / Géneros estilo YouTube (Barra de Filtros sin desbordes) */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full touch-pan-x">
          {chips.map((chip) => {
            const isSelected = value.toLowerCase() === chip.query.toLowerCase()
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  if (onSelectChip) onSelectChip(chip.query)
                  saveRecentSearch(chip.query)
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex-shrink-0 touch-manipulation border ${
                  isSelected
                    ? 'bg-beer-500 text-dark-200 border-beer-400 shadow-sm shadow-beer/30 font-bold'
                    : 'bg-[#212121] text-gray-300 hover:text-white border-white/10 hover:bg-white/10 active:border-beer-500/40'
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
