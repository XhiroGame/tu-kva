import React from 'react'
import Logo from '@/components/ui/Logo'
import { Utensils } from 'lucide-react'

/**
 * ClientHeader - Encabezado optimizado y responsivo para pantallas móviles
 */
export default function ClientHeader({ businessName = 'Tu K-VA', tableName = 'Cargando mesa...' }) {
  return (
    <header className="pt-1 pb-3 border-b border-dark-border/40">
      <div className="flex items-center justify-between gap-3">
        {/* Logo */}
        <Logo size="sm" />

        {/* Badge de la Mesa destacado */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-beer-950/80 to-dark-50 border border-beer-500/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-sm shadow-beer/10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Conectado en vivo" />
          <div className="flex items-center gap-1">
            <Utensils className="w-3 h-3 text-beer-400" />
            <span className="text-xs sm:text-sm font-black text-white tracking-wide">
              {tableName}
            </span>
          </div>
        </div>
      </div>

      {/* Frase gancho compacta */}
      <div className="mt-2 flex items-baseline justify-between">
        <h2 className="text-base sm:text-xl font-extrabold font-display tracking-tight text-white">
          ¡Tú eliges la <span className="text-gradient">música!</span> 🍺
        </h2>
        <span className="text-[11px] text-gray-400 font-medium hidden xs:inline">
          Pide tu canción a la playlist
        </span>
      </div>
    </header>
  )
}
