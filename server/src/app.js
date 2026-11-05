import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'

// Routes (implemented in later stages)
import songsRouter  from './routes/songs.routes.js'
import queueRouter  from './routes/queue.routes.js'
import tablesRouter from './routes/tables.routes.js'
import adminRouter  from './routes/admin.routes.js'

const app = express()

// ---- Security Middleware ----
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for audio streaming
}))

// ---- CORS ----
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (teléfonos que escanean directo, curl, apps móviles)
    if (!origin) return callback(null, true)
    
    // Permitir orígenes configurados o cualquier dispositivo en red local (192.168.x.x, 10.x.x.x, localhost)
    if (
      allowedOrigins.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true)
    }

    // En desarrollo local permitimos la conexión para que ningún teléfono sea bloqueado
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true)
    }

    callback(new Error(`CORS: Origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ---- Body Parsing ----
app.use(express.json({ limit: '10kb' })) // Limit body size
app.use(express.urlencoded({ extended: false }))

// ---- Logging ----
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ---- Global Rate Limiter ----
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
})
app.use('/api', globalLimiter)

// ---- Health Check ----
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'BEER MUSIC API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})

// ---- API Routes ----
app.use('/api/songs',  songsRouter)
app.use('/api/queue',  queueRouter)
app.use('/api/tables', tablesRouter)
app.use('/api/admin',  adminRouter)

// ---- 404 Handler ----
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

// ---- Global Error Handler ----
app.use((err, _req, res, _next) => {
  console.error('[BEER MUSIC ERROR]', err)

  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message })
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  })
})

export default app
