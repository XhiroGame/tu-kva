import React from 'react'
import Logo from '@/components/ui/Logo'
import { Utensils, Wifi } from 'lucide-react'

/**
 * ClientHeader - Encabezado de la interfaz de clientes con identificación de mesa
 * @param {object} props
 * @param {string} props.businessName - Nombre del bar
 * @param {string} props.tableName - Nombre de la mesa escaneada (ej: "Mesa 5")
 */
export default function ClientHeader({ businessName = 'Tu K-VA', tableName = 'Cargando mesa...' }) {
  return (
    <header className="pt-2 pb-4 border-b border-dark-border/40">
      <div className="flex items-center justify-between">
        {/* Logo compacto */}
        <Logo size="sm" />

        {/* Badge de la Mesa */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-beer-950/60 to-dark-50 border border-beer-500/30 px-3 py-1.5 rounded-2xl shadow-sm shadow-beer/10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Conectado en vivo" />
          <div className="flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-beer-400" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {tableName}
            </span>
          </div>
        </div>
      </div>

      {/* Frase gancho */}
      <div className="mt-3 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-white">
          ¡Tú eliges la <span className="text-gradient">música!</span> 🍺
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
          Pide tus canciones favoritas sin moverte de la mesa
        </p>
      </div>
    </header>
  )
}
