# 🍺🎵 BEER MUSIC – PROYECTO COMPLETADO AL 100%

Plataforma web profesional de playlist musical por código QR para bares, cervecerías y locales de ocio.

---

## 🚀 Estado de las 10 Etapas

- [x] **ETAPA 1:** Crear el proyecto, monorepo (`client/` + `server/`) y configuración de entornos.
- [x] **ETAPA 2:** Diseño UI/UX Mobile First (Buscador, NowPlaying con ecualizador animado, SongCards y QueueList).
- [x] **ETAPA 3:** Base de datos PostgreSQL en Supabase con RLS, aislamiento multi-negocio e índices optimizados.
- [x] **ETAPA 4:** Búsqueda musical conectada en tiempo real al catálogo global de canciones y videos.
- [x] **ETAPA 5:** Gestión de playlist sincronizada en tiempo real mediante Supabase Realtime (WebSockets).
- [x] **ETAPA 6:** Reproductor central con video y audio sincronizado, avance automático al terminar la canción (`onStateChange: ENDED`) y controles de moderación.
- [x] **ETAPA 7:** Panel administrativo protegido con Supabase Auth, moderación de canciones en vivo y monitoreo.
- [x] **ETAPA 8:** Generador de códigos QR dinámicos por mesa listos para descargar e imprimir en alta resolución.
- [x] **ETAPA 9:** Reglas de negocio y seguridad:
  - 🛡️ Prevención de canciones duplicadas en la lista activa.
  - ⏱️ Límite antimonopolio (máximo 3 pedidos por mesa cada 5 minutos).
  - ⏳ Restricción de duración máxima (10 minutos por tema).
- [x] **ETAPA 10:** Modo de música de ambiente por defecto (fallback) para que el bar nunca quede en silencio y build verificado sin errores.

---

## 📱 URLs y Accesos del Sistema

| Módulo | URL | Descripción |
|---|---|---|
| **Interfaz Clientes (Mesa 1)** | `http://localhost:5173/mi-cerveceria/table/test-qr-token-mesa-1` | Pantalla que abre el cliente al escanear el QR en su mesa |
| **Reproductor Central del Bar** | `http://localhost:5173/player/mi-cerveceria` | Pantalla para la laptop/PC conectada al equipo de sonido |
| **Login Administrador** | `http://localhost:5173/admin/login` | Acceso con credenciales de personal del bar |
| **Panel Administrativo** | `http://localhost:5173/admin/dashboard` | Moderación de canciones, creación de mesas y descarga de QR |
| **Backend Health Check** | `http://localhost:3001/api/health` | Estado del servidor Express |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18, Vite, Tailwind CSS v3, Lucide React, React Hot Toast, React Router v6.
- **Backend:** Node.js, Express, Helmet, CORS, Rate Limit, QR Code Generator, UUID.
- **Base de Datos & Auth:** Supabase (PostgreSQL 15), Supabase Auth (JWT), Supabase Realtime (WebSockets).
- **Catálogo & Audio:** Motor desacoplado con arquitectura abstracta `MusicProvider`.
