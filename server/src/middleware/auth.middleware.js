import supabaseAdmin from '../config/supabase.js'

/**
 * Extrae el token Bearer del header Authorization
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || typeof authHeader !== 'string') return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

/**
 * Middleware estricto: requiere una sesión válida de Supabase Auth (Admin / DJ)
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req)
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. Inicia sesión como administrador.',
      })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada. Vuelve a iniciar sesión.',
      })
    }

    req.user = data.user
    next()
  } catch (err) {
    console.error('[Auth Middleware Error]', err)
    return res.status(401).json({
      success: false,
      message: 'No se pudo verificar la autenticación.',
    })
  }
}

/**
 * Middleware opcional: adjunta req.user si viene un token válido, sin bloquear clientes públicos
 */
export async function optionalAuth(req, _res, next) {
  try {
    const token = extractBearerToken(req)
    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && data?.user) {
        req.user = data.user
      }
    }
  } catch {
    // Ignorar error en auth opcional
  }
  next()
}
