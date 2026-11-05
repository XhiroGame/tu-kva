/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BEER MUSIC Brand Colors
        beer: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Beer amber - primary
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        orange: {
          400: '#fb923c',
          500: '#f97316',  // Orange accent
          600: '#ea580c',
        },
        dark: {
          50:    '#1a1a1a',
          100:   '#141414',
          200:   '#111111',
          300:   '#0d0d0d',
          400:   '#0a0a0a',
          950:   '#080808',  // Deep background
          border: '#2a2a2a', // Used as border-dark-border
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'equalizer': 'equalizer 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        equalizer: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'beer-gradient': 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        'dark-gradient': 'linear-gradient(180deg, #141414 0%, #0d0d0d 100%)',
      },
      boxShadow: {
        'beer': '0 0 20px rgba(245, 158, 11, 0.3)',
        'beer-lg': '0 0 40px rgba(245, 158, 11, 0.4)',
        'orange': '0 0 20px rgba(249, 115, 22, 0.3)',
      },
    },
  },
  plugins: [],
}
