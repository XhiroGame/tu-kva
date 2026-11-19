import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * ErrorBoundary global para evitar pantallas en blanco.
 * En el Reproductor Central (/player/*), se auto-recupera recargando en 5 segundos.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, countdown: 5 }
    this.timer = null
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[Tu K-VA ErrorBoundary]', error, info)

    const isPlayerRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/player')

    if (isPlayerRoute) {
      this.timer = setInterval(() => {
        this.setState((prev) => {
          if (prev.countdown <= 1) {
            clearInterval(this.timer)
            window.location.reload()
            return { countdown: 0 }
          }
          return { countdown: prev.countdown - 1 }
        })
      }, 1000)
    }
  }

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer)
  }

  render() {
    if (this.state.hasError) {
      const isPlayerRoute =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/player')

      return (
        <div className="min-h-screen bg-dark-200 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full card p-6 rounded-3xl border border-beer-500/30 bg-dark-50 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-beer-500/15 border border-beer-500/30 flex items-center justify-center text-beer-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-display font-bold text-white">
              Ocurrió un inconveniente inesperado
            </h1>
            <p className="text-sm text-gray-400">
              {isPlayerRoute
                ? `El reproductor se recuperará automáticamente en ${this.state.countdown} segundos...`
                : 'No te preocupes, puedes recargar la página para continuar normalmente.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar ahora</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
