# Configuración Pendiente - Puro Llano Radio

Este documento contiene los pasos necesarios para completar las mejoras implementadas.

---

## 1. Google Analytics 4

### Pasos para activar:

1. Ve a [Google Analytics](https://analytics.google.com/)
2. Crea una cuenta o selecciona la existente
3. Crea una propiedad GA4 si no tienes una
4. Copia el **Measurement ID** (formato: `G-XXXXXXXXXX`)
5. Reemplaza `G-XXXXXXXXXX` en `index.html` línea ~99

### Verificar configuración:

```bash
# El código ya está en index.html:
# <script async src="https://www.googletagmanager.com/gtag/js?id=TU_ID"></script>
```

---

## 2. Firebase App Check (Recomendado para producción)

### Para habilitar App Check:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `puro-llano-radio-f7166`
3. Ve a **Build** → **App Check**
4. Registra tu sitio web con reCAPTCHA v3
5. Obtén la clave del sitio
6. Agrega el código en `firebase.js` o `index.html`:

```javascript
// En firebase.js, después de inicializar Firebase:
if (typeof firebase !== 'undefined' && firebase.app()) {
    // Inicializar App Check
    firebase.app().registerVersion('puro-llano-radio', '1.0.0');
}
```

### Alternativa: Restringir dominios en Firebase

En Firebase Console → **Authentication** → **Settings** → **Authorized domains**:
- Agrega `purollanoradio.com`
- Agrega `purollanoradio.pages.dev`

---

## 3. Optimización de Imágenes

### Imágenes recomendadas para WebP:

Las siguientes imágenes deberían convertirse a WebP:

1. `PORTADA-APP-1024X500-2.jpg` → `PORTADA-APP.webp`
2. `PUROLLANORADIO-COM-ICONO.png` → `PUROLLANORADIO-COM-ICONO.webp`

### Herramientas para convertir:
- [Squoosh.app](https://squoosh.app/) - Online y gratis
- [TinyPNG](https://tinypng.com/) - Compresión PNG/JPG
- [Cloudflare Polish](https://developers.cloudflare.com/images/polish/) - Automático en CDN

---

## 4. Variables de Entorno para API

### En Render.com:

Asegúrate de que estas variables estén configuradas:

| Variable | Valor |
|----------|-------|
| `FIREBASE_PROJECT_ID` | `puro-llano-radio-f7166` |
| `FIREBASE_CLIENT_EMAIL` | (del JSON de service account) |
| `FIREBASE_PRIVATE_KEY` | (del JSON de service account) |
| `ADMIN_PIN` | `PuroLlano2024` (cámbialo) |

---

## 5. Cloudflare Pages

### Configuración de build:
- **Build command**: (vacío, es estático)
- **Build output directory**: `/`

### Variables de entorno:
No se requieren para el frontend estático.

---

## Checklist Post-Deploy

- [ ] Configurar Google Analytics ID
- [ ] Verificar reglas de Firebase
- [ ] Testear modo offline
- [ ] Probar notificaciones push
- [ ] Verificar Service Worker en producción
- [ ] Testear reconexión de audio

---

Última actualización: Abril 2026
