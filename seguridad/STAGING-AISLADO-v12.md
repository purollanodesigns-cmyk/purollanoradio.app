# v12 — Preparación de staging aislado (sin desplegar)

## Cambio importante

El Worker ya no lleva una URL de Firebase de producción incrustada en el código. Todas las rutas usan `FIREBASE_DATABASE_URL` configurada por entorno y fallan cerradas si falta o no es una URL HTTPS de Realtime Database reconocida. Esto permite preparar un Worker de staging conectado a una base de pruebas sin riesgo de que el código recurra silenciosamente a producción.

`CRON_SECRET` dejó de ser un requisito global para las rutas públicas de chat y visitas. La ruta manual de cron sigue exigiendo `Authorization: Bearer <CRON_SECRET>`.

## Archivos

- CORS puede configurarse por entorno mediante `CHAT_ALLOWED_ORIGINS`; los orígenes se separan por comas y no se aceptan comodines especiales. El valor predeterminado sigue siendo el origen de producción ya existente para evitar alterar el Worker actual.

- `worker/wrangler.staging.toml`: configuración de staging separada, sin cron/triggers.
- `tests/worker-visits.test.js`: pruebas adicionales de configuración de Firebase ausente o inválida.
- `worker/worker.js`: URL de RTDB recibida desde entorno y validada.

## Cómo ejecutar pruebas locales

Desde la raíz del proyecto:

```bash
npm run test:visits
node --check worker/worker.js
node --check script-visits.js
```

Estas pruebas son locales. No hacen solicitudes a Firebase, Google OAuth ni Cloudflare.

## Preparar el entorno real de staging (manual; no ejecutar en producción)

1. Crear una base Realtime Database separada para pruebas en un proyecto Firebase de staging. No reutilizar la base `puro-llano-radio-f7166`.
2. Crear un Worker separado `purollanoradio-staging` usando `worker/wrangler.staging.toml`. No añadir cron triggers.
3. Configurar `FIREBASE_DATABASE_URL` como variable de entorno con la URL exacta de la base de staging.
4. Configurar los secretos de una cuenta de servicio con permisos mínimos para esa base de pruebas; no copiar credenciales de producción si puede evitarse.
5. Configurar `VISIT_HASH_SECRET` con un valor aleatorio de al menos 32 caracteres. Mantenerlo fuera del repositorio y del chat.
6. Configurar `CHAT_ALLOWED_ORIGINS` en el Worker de staging con el origen HTTPS exacto del frontend de pruebas (sin `*`). Esta variable permite separar CORS de staging y producción. Si no se configura, el Worker conserva el origen de producción existente; por eso hay que configurarla antes de publicar staging.
7. Configurar rate limiting para `POST /visits`, `POST /chat-message`, `POST /chat-presence` y `POST /chat-typing`.
8. Ejecutar pruebas de repetición, concurrencia, fallo de Firebase y cambio de fecha. Verificar total y diario en la base de pruebas.
9. No cerrar aún los permisos de producción en RTDB ni desplegar la configuración de staging en el Worker de producción.

## Pendientes antes de producción

- La deduplicación de visitas y el incremento de contadores son dos escrituras condicionales distintas; verificar los escenarios de fallo en staging.
- Definir y probar retención/limpieza de `visit_dedupe` antes de producción.
- Verificar el dominio real de frontend y configurar rate limiting.
- Revisar conjuntamente las reglas RTDB completas y las rutas de notificaciones antes de restringir escrituras.
- El cron permanece desactivado.
