# TU K-VA

> 🍺🎵 Plataforma de playlist musical por código QR para bares y cervecerías

## ¿Qué es TU K-VA?

Los clientes escanean un código QR en su mesa → buscan canciones → las agregan a la playlist compartida → el computador central reproduce la música en el equipo de sonido del establecimiento.

## Estructura del Proyecto

```
tu-kva/
├── client/        # Frontend React + Vite + Tailwind
├── server/        # Backend Node.js + Express
├── supabase/      # Migraciones SQL y políticas RLS
└── docs/          # Documentación técnica
```

## Inicio Rápido

### 1. Backend (Servidor)

```bash
cd server
copy .env.example .env     # Windows
# Edita .env con tus credenciales
npm install
npm run dev
```

### 2. Frontend (Cliente)

```bash
cd client
copy .env.example .env     # Windows
# Edita .env con tus credenciales
npm install
npm run dev
```

### 3. Base de Datos (Supabase)

Ejecuta las migraciones en orden en el SQL Editor de Supabase:
1. `supabase/migrations/001_create_tables.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_indexes.sql`
4. `supabase/seed.sql` (solo desarrollo)

## URLs de la Aplicación (Desarrollo)

| URL | Descripción |
|-----|-------------|
| `http://localhost:5173/mi-cerveceria/table/[qr-token]` | Interfaz para clientes |
| `http://localhost:5173/player/mi-cerveceria` | Reproductor central |
| `http://localhost:5173/admin/login` | Panel administrativo |
| `http://localhost:3001/api/health` | Health check del backend |

## Etapas de Desarrollo

- [x] **Etapa 1** — Configuración del entorno y arquitectura
- [ ] **Etapa 2** — Diseño de interfaces y componentes visuales
- [ ] **Etapa 3** — Configuración de Supabase
- [ ] **Etapa 4** — Búsqueda musical (Jamendo API)
- [ ] **Etapa 5** — Gestión de playlist en tiempo real
- [ ] **Etapa 6** — Reproductor central
- [ ] **Etapa 7** — Panel administrativo
- [ ] **Etapa 8** — Códigos QR
- [ ] **Etapa 9** — Seguridad y validaciones
- [ ] **Etapa 10** — Pruebas y despliegue

## Proveedor Musical

**Jamendo** — música con licencia Creative Commons, legalmente permitida en establecimientos comerciales con el plan adecuado.

- Registro: https://devportal.jamendo.com
- Licencias comerciales: https://www.jamendo.com/start-licensing

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v3 |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL (via Supabase) |
| Tiempo real | Supabase Realtime |
| Música | Jamendo API |
| Auth | Supabase Auth |
| QR | qrcode npm |
