import { Link } from 'react-router-dom'
import Logo from '@/components/ui/Logo'
import { Home } from 'lucide-react'

/**
 * 404 Not Found Page
 */
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-200 flex flex-col items-center justify-center p-6 text-center">
      <Logo size="md" className="mb-8" />

      <div className="text-8xl font-display font-black text-gradient mb-4">404</div>
      <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
      <p className="text-gray-400 mb-8">
        Esta URL no existe o el código QR no es válido.
      </p>

      <Link to="/" className="btn-primary flex items-center gap-2 w-fit">
        <Home className="w-5 h-5" />
        Volver al inicio
      </Link>
    </div>
  )
}

export default NotFoundPage
