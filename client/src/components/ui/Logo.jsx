import { Beer, Music } from 'lucide-react'

/**
 * Logo component — Dinámico para cada negocio en la plataforma CJ Systems
 * Soporta logo personalizado (imagen/URL/DataURL), nombre del bar y subtítulo.
 * Sizes: 'sm' | 'md' | 'lg' | 'xl'
 */
function Logo({
  size = 'md',
  businessName = 'Tu K-VA',
  subtitle = 'Cervecería & Música',
  logoUrl = '',
  showTagline = false,
  className = '',
}) {
  const sizes = {
    sm: { icon: 'w-6 h-6', img: 'w-9 h-9',   text: 'text-xl',   tagline: 'text-xs'  },
    md: { icon: 'w-8 h-8', img: 'w-12 h-12', text: 'text-2xl',  tagline: 'text-xs'  },
    lg: { icon: 'w-10 h-10', img: 'w-16 h-16', text: 'text-3xl', tagline: 'text-sm'  },
    xl: { icon: 'w-14 h-14', img: 'w-20 h-20', text: 'text-5xl', tagline: 'text-base' },
  }

  const s = sizes[size] || sizes.md
  const displayTitle = (businessName || 'Tu K-VA').toUpperCase()

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Custom Logo Image or Default Icons */}
      {logoUrl ? (
        <div className={`${s.img} rounded-2xl overflow-hidden bg-dark-100 border border-beer-500/40 shadow-sm shadow-beer/20 flex items-center justify-center p-0.5`}>
          <img
            src={logoUrl}
            alt={businessName}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Beer className={`${s.icon} text-beer-500 animate-bounce-slow`} />
          <Music className={`${s.icon} text-orange-500`} />
        </div>
      )}

      {/* Brand name dinámico del negocio del cliente */}
      <span className={`${s.text} font-display font-black tracking-wider text-center`}>
        <span className="text-gradient">{displayTitle}</span>
        {subtitle && (
          <span className="text-white text-xs block font-sans tracking-widest uppercase opacity-80 mt-0.5">
            {subtitle}
          </span>
        )}
      </span>

      {/* Optional tagline */}
      {showTagline && (
        <p className={`${s.tagline} text-beer-300 tracking-wider uppercase font-semibold mt-1`}>
          🍺 ¡Tú eliges la música en tu mesa!
        </p>
      )}
    </div>
  )
}

export default Logo
