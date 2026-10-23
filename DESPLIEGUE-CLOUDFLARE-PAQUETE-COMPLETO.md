# PurollanoRadio — paquete completo para Cloudflare

## Arquitectura (dos despliegues separados)

Este repositorio contiene el frontend estático y el Worker de notificaciones. Con la arquitectura actual no se despliegan ambos como una sola aplicación: el frontend va a **Cloudflare Pages** y el procesador de notificaciones a **Cloudflare Workers**. Este paquete no realiza despliegues ni activa cron.

## 1. Antes de desplegar

- La clave privada Firebase antigua expuesta en GitHub debe estar revocada. La nueva clave solo debe existir como secreto de Cloudflare.
- Nunca subas `.env`, `.dev.vars`, `wrangler-account.json` ni claves privadas al repositorio. Este ZIP excluye esos archivos y la caché de Wrangler.
- El host de Realtime Database configurado en `worker/worker.js` es `https://puro-llano-radio-f7166-default-rtdb.firebaseio.com`, confirmado por el operador.
- Antes de producción, validar permisos mínimos de la cuenta de servicio, reglas e índice `.indexOn: ["scheduledTime"]` en `scheduledNotifications`.
- El Worker aún requiere pruebas de integración y una solución de idempotencia para evitar duplicados en reintentos. No activar cron hasta resolverlas.

## 2. Frontend — Cloudflare Pages

En Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git, elige el repositorio y rama `main`. Configura:

- Root directory: `/`
- Build command: **vacío** (sitio estático)
- Build output directory: `/` (raíz del repositorio)

Revisa las variables públicas que usa el frontend en `firebase.js` antes de desplegar. No coloques una clave privada de cuenta de servicio ni `FIREBASE_PRIVATE_KEY` en variables del frontend.

## 3. Worker — configuración sin cron

Para el Worker de notificaciones, configura el proyecto conectado al mismo repositorio:

- Root directory: `/`
- Build command: **vacío**
- Deploy command: `npx wrangler deploy --config worker/wrangler.toml`
- Version command: dejar vacío (si el panel lo permite).

La configuración `worker/wrangler.toml` mantiene comentado el bloque `[triggers]`; no se programa una ejecución automática. No descomentes `crons` todavía.

## 4. Secretos en Cloudflare Worker

En Settings → Variables and Secrets del Worker `purollanoradio-cron`, crea o verifica estos secretos/variables de servidor, sin ponerlos en archivos del repo:

- `CRON_SECRET`
- `FIREBASE_PROJECT_ID` (el ID real del proyecto Firebase, no la URL de la base de datos)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (clave nueva, con saltos de línea válidos)

No compartas los valores en chats ni capturas. Si ya existen, no hace falta volver a pegarlos.

## 5. Estado de seguridad y pruebas

- Endpoint manual: solo `POST` con `Authorization: Bearer ...`; no usar el secreto en query string.
- El cron permanece desactivado.
- No ejecutar pruebas manuales de procesamiento contra datos reales hasta aprobarlas; podrían enviar notificaciones push reales.
- Confirmar primero permisos RTDB/FCM, reglas e índice; luego probar en datos de prueba y diseñar idempotencia.

## 6. Qué significa “desplegar”

Subir este ZIP a GitHub no cambia por sí solo Cloudflare. Los despliegues suceden cuando el pipeline conectado a cada proyecto se ejecuta. Nada se ha desplegado desde la creación de este paquete.
