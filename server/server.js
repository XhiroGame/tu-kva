import app from './src/app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║          🍺🎵  BEER MUSIC API           ║
╠══════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}        ║
║  Network:  http://0.0.0.0:${PORT}          ║
║  Mode:     ${(process.env.NODE_ENV || 'development').padEnd(30)}║
║  Health:   GET /api/health               ║
╚══════════════════════════════════════════╝
  `)
})
