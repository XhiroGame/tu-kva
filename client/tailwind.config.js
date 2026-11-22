/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BEER MUSIC / CJ SYSTEMS Dynamic Brand Colors (controlled via CSS variables)
        beer: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',  // Primary brand color
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        orange: {
          400: 'rgb(var(--brand-accent-400) / <alpha-value>)',
          500: 'rgb(var(--brand-accent-500) / <alpha-value>)',  // Accent color
          600: 'rgb(var(--brand-accent-600) / <alpha-value>)',
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
        'beer-gradient': 'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-accent-500)) 100%)',
        'dark-gradient': 'linear-gradient(180deg, #141414 0%, #0d0d0d 100%)',
      },
      boxShadow: {
        'beer': '0 0 20px rgb(var(--brand-500) / 0.3)',
        'beer-lg': '0 0 40px rgb(var(--brand-500) / 0.4)',
        'orange': '0 0 20px rgb(var(--brand-accent-500) / 0.3)',
      },
    },
  },
  plugins: [],
}
