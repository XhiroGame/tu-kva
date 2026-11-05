import { Beer, Music } from 'lucide-react'

/**
 * BEER MUSIC Logo component
 * Sizes: 'sm' | 'md' | 'lg' | 'xl'
 */
function Logo({ size = 'md', businessName = 'Tu K-VA', showTagline = false, className = '' }) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-xl',   tagline: 'text-xs'  },
    md: { icon: 'w-8 h-8', text: 'text-2xl',   tagline: 'text-xs'  },
    lg: { icon: 'w-10 h-10', text: 'text-3xl', tagline: 'text-sm'  },
    xl: { icon: 'w-14 h-14', text: 'text-5xl', tagline: 'text-base' },
  }

  const s = sizes[size] || sizes.md

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Icons */}
      <div className="flex items-center gap-2">
        <Beer className={`${s.icon} text-beer-500 animate-bounce-slow`} />
        <Music className={`${s.icon} text-orange-500`} />
      </div>

      {/* Brand name del negocio del cliente */}
      <span className={`${s.text} font-display font-black tracking-wider text-center`}>
        <span className="text-gradient">TU K-VA</span>
        <span className="text-white text-xs block font-sans tracking-widest uppercase opacity-80 mt-0.5">
          Cervecería & Música
        </span>
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
