# AGENTS.md - Puro Llano Radio

## Critical Deployment Issues

**🚨 TOP5.HTML AND PROGRAMACION.HTML NOT LOADING ON HOSTING**
- These files work locally but fail on Cloudflare deployment
- Root cause: Firebase configuration issues with CORS and mixed content
- Both files rely on `firebase.js` which may not work on production due to:
  - Hardcoded Firebase paths that may have CORS restrictions
  - HTTP/HTTPS mixed content issues with radio stream URLs
  - Firebase Realtime Database public read/write rules

## Architecture Overview

**Technology Stack:**
- Static HTML/CSS/JavaScript site
- Firebase Realtime Database for chat, listeners, history
- Cloudflare Pages (main deployment) + Workers (cron jobs)
- Express.js server for backend API (server.js)

**Key Files & Directories:**
- `top5.html` - Top 5 songs ranking (experiencing deployment issues)
- `programacion.html` - Weekly schedule (experiencing deployment issues)
- `firebase.js` - Firebase configuration (may need review for production)
- `server.js` - Express API server for Render.com
- `worker/wrangler.toml` - Cloudflare Worker for cron jobs
- `DEPLOY_CLOUDFLARE.md` - Current deployment status and guide

## Development Commands

**Local Development:**
```bash
# Start development server
npm start

# Development with nodemon
npm run dev
```

**Firebase Configuration:**
- Firebase project: `puro-llano-radio-f7166`
- Database rules are publicly accessible (read: true, write: true)
- Check `firebase.js` for current configuration

## Deployment Notes

**Cloudflare Migration Complete (2026-04-06):**
- Project migrated from Vercel to Cloudflare Pages
- Worker at: `https://purollanoradio-cron.purollanoradio.workers.dev`
- Main site: `https://897df438.purollanoradio-com.pages.dev`
- Domain: `purollanoradio.com`

**Critical Fix Applied:**
✅ **SOLUCIONADO**: Problema de contenido mixto HTTP/HTTPS corregido en:
- `programacion.html`: Atributo `crossorigin="anonymous"` agregado al elemento audio
- `top5.html`: Actualizado a Firebase simplificado y manejo de errores
- Todas las URLs de streaming ya usan HTTPS (`https://radio.mipanel.stream:6816/stream`)

**Últimas Correcciones:**
- ✅ `firebase-simple.js`: Versión simplificada de Firebase con manejo de errores
- ✅ Manejo de timeouts en reproductor de audio (10 segundos)
- ✅ Manejo global de errores para evitar bloqueos de página
- ✅ Firebase mantiene configuración pública para Cloudflare

**Radio Stream URLs:**
- Main stream: `https://radio.mipanel.stream:6816/stream`
- Todas las URLs usan HTTPS para evitar problemas de contenido mixto
- Elementos `<audio>` ahora incluyen `crossorigin="anonymous"`