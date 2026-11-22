import React from 'react'
import { Link } from 'react-router-dom'
import {
  QrCode,
  Music,
  MonitorSpeaker,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Clock,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Smartphone,
  Zap,
  Building2,
  MessageCircle,
  Lock,
} from 'lucide-react'
import Logo from '@/components/ui/Logo'

export default function LandingPage() {
  const whatsappMessage = encodeURIComponent(
    '¡Hola Ing. Ciro José! Vi el sistema musical interactivo por QR de CJ Systems y me gustaría solicitar una demo para mi negocio.'
  )
  const whatsappUrl = `https://wa.me/573118715006?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans selection:bg-beer-500 selection:text-dark-200 overflow-x-hidden">
      {/* Navegación Superior */}
      <header className="sticky top-0 z-50 bg-dark-950/85 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-beer-gradient flex items-center justify-center text-dark-200 font-display font-black text-lg shadow-beer">
              CJ
            </div>
            <div>
              <span className="font-display font-black text-base sm:text-lg tracking-wide text-white block leading-none">
                CJ <span className="text-gradient">SYSTEMS</span>
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                Ing. Ciro José • Ingeniería & Software
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/admin/login"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-gray-200 flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-beer-400" />
              <span>Acceso Clientes</span>
            </Link>

            <a
              href="#contacto"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-beer-gradient text-dark-200 font-bold text-xs sm:text-sm shadow-beer hover:brightness-110 transition-all"
            >
              <span>Solicitar Demo</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-beer-500/15 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-beer-500/15 border border-beer-500/30 text-beer-400 text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rockola Digital Interactiva por Código QR para Bares y Negocios</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white leading-tight">
            Convierte cada mesa de tu bar en una{' '}
            <span className="text-gradient">experiencia musical en vivo</span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Tus clientes escanean el QR en su mesa, piden sus canciones favoritas desde el celular sin instalar aplicaciones, y el computador central de tu negocio las reproduce automáticamente sin interrupciones.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-4 px-8 text-sm sm:text-base"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Llevar el Sistema a mi Negocio</span>
            </a>

            <a
              href="#como-funciona"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-dark-50 hover:bg-white/10 border border-white/15 text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-5 h-5 text-beer-400" />
              <span>Ver Cómo Funciona</span>
            </a>
          </div>

          {/* Métricas / Confianza */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            <div className="card p-4 bg-dark-50/70 border-white/10">
              <p className="text-2xl sm:text-3xl font-display font-black text-beer-400">100%</p>
              <p className="text-xs text-gray-400 mt-1">Web sin instalar Apps</p>
            </div>
            <div className="card p-4 bg-dark-50/70 border-white/10">
              <p className="text-2xl sm:text-3xl font-display font-black text-white">2 / 10m</p>
              <p className="text-xs text-gray-400 mt-1">Control Antimonopolio</p>
            </div>
            <div className="card p-4 bg-dark-50/70 border-white/10">
              <p className="text-2xl sm:text-3xl font-display font-black text-green-400">24/7</p>
              <p className="text-xs text-gray-400 mt-1">Auto-DJ Inteligente</p>
            </div>
            <div className="card p-4 bg-dark-50/70 border-white/10">
              <p className="text-2xl sm:text-3xl font-display font-black text-orange-400">En Vivo</p>
              <p className="text-xs text-gray-400 mt-1">Sincronización Realtime</p>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA EN 3 PASOS */}
      <section id="como-funciona" className="py-14 sm:py-20 px-4 sm:px-6 bg-dark-200/70 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-beer-400">
              Flujo Automatizado
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-black text-white mt-2">
              ¿Cómo funciona en tu establecimiento?
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Diseñado para que tus clientes permanezcan más tiempo consumiendo mientras disfrutan su música favorita.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 rounded-3xl bg-dark-50/90 border-white/10 relative">
              <div className="w-12 h-12 rounded-2xl bg-beer-500/15 border border-beer-500/30 flex items-center justify-center text-beer-400 mb-4">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-beer-400 uppercase">Paso 1</span>
              <h3 className="text-lg font-display font-bold text-white mt-1">
                Escanean el QR en su Mesa
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                Cada mesa tiene su propio código QR único generado desde tu panel. Al escanearlo, el cliente entra directamente con el nombre y marca de tu bar.
              </p>
            </div>

            <div className="card p-6 rounded-3xl bg-dark-50/90 border-white/10 relative">
              <div className="w-12 h-12 rounded-2xl bg-beer-500/15 border border-beer-500/30 flex items-center justify-center text-beer-400 mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-beer-400 uppercase">Paso 2</span>
              <h3 className="text-lg font-display font-bold text-white mt-1">
                Piden Canciones con Reglas Justas
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                Nuestro algoritmo antimonopolio permite máximo 2 canciones cada 10 minutos por mesa/dispositivo, bloquea canciones repetidas y evita pistas de más de 10 minutos.
              </p>
            </div>

            <div className="card p-6 rounded-3xl bg-dark-50/90 border-white/10 relative">
              <div className="w-12 h-12 rounded-2xl bg-beer-500/15 border border-beer-500/30 flex items-center justify-center text-beer-400 mb-4">
                <MonitorSpeaker className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-beer-400 uppercase">Paso 3</span>
              <h3 className="text-lg font-display font-bold text-white mt-1">
                Suena en el Reproductor Central
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                El computador del bar reproduce la fila automáticamente. Si nadie pide canciones, el sistema activa el Auto-DJ con las canciones más sonadas de tu local.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VENTAJAS DE INGENIERÍA + CASO DE ÉXITO TU K-VA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className="badge-beer text-xs font-bold">
              Ingeniería pensada para la vida nocturna real
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-black text-white leading-tight">
              Todo el control musical de tu negocio en una sola plataforma
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              A diferencia de soluciones improvisadas, la plataforma de <strong className="text-beer-400">CJ Systems</strong> incluye recuperación automática ante videos con restricción de derechos, reordenamiento Drag & Drop para el DJ/Administrador y estadísticas en vivo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {[
                'Marca propia con el nombre de tu bar en QRs y pantallas',
                'Salto inteligente si un video tiene bloqueo de autor',
                'Modo DJ / Barra para sonar canciones al instante',
                'Estadísticas en tiempo real y Top 5 más sonadas',
                'Control de mesas activas y descarga de QR en 1 clic',
                'Soporte técnico directo y actualizaciones en la nube',
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-beer-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-gray-200">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta Caso de Éxito Real: Tu K-VA */}
          <div className="lg:col-span-5">
            <div className="card p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-beer-950/50 via-dark-50 to-dark-100 border border-beer-500/40 shadow-beer space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Caso de Éxito en Producción
                </span>
                <Building2 className="w-5 h-5 text-beer-400" />
              </div>

              <div className="py-2">
                <Logo size="md" businessName="Tu K-VA" subtitle="Cliente Pionero • Cervecería & Música" />
              </div>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-center">
                “El sistema transformó el ambiente de las mesas en <strong className="text-white">Tu K-VA</strong>. Los clientes participan toda la noche pidiendo música desde su celular sin congestionar al personal de la barra.”
              </p>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>Implementado por CJ Systems</span>
                <span className="text-beer-400 font-bold">100% Operativo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN MARCA PERSONAL: ING. CIRO JOSÉ — CJ SYSTEMS */}
      <section id="contacto" className="py-16 sm:py-20 px-4 sm:px-6 bg-dark-100/90 border-t border-white/10">
        <div className="max-w-4xl mx-auto card p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-dark-50 via-dark-100 to-beer-950/30 border border-beer-500/40 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-beer-gradient flex flex-col items-center justify-center text-dark-200 font-display font-black shadow-beer-lg flex-shrink-0">
              <Cpu className="w-8 h-8 mb-0.5" />
              <span className="text-xs tracking-tighter">CJ SYSTEMS</span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-beer-500/15 border border-beer-500/30 text-beer-400 text-xs font-bold">
                <span>Respaldo Profesional directo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
                Ing. Ciro José — CJ Systems
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Ingeniero de Sistemas especializado en soluciones de software en tiempo real y automatización para negocios. Te entrego la plataforma configurada con la identidad de tu local, códigos QR listos para tus mesas y capacitación para tu equipo.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto btn-primary py-3.5 px-6 text-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp: +57 311 871 5006</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 sm:px-6 border-t border-white/10 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-white">CJ SYSTEMS</span>
            <span>•</span>
            <span>Ing. Ciro José — Ingeniería de Sistemas</span>
          </div>
          <div>
            © {new Date().getFullYear()} CJ Systems. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
