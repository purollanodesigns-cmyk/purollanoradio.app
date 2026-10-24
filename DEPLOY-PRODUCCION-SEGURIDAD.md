# Producción — Puro Llano Radio (paquete preparado, despliegue manual requerido)

## Cambios incluidos
- Worker configurado con cron cada 10 minutos.
- Worker procesa los tokens de `push_tokens` y guarda el historial en `notifications_history`, alineado con el frontend.
- `api/send-push.js` ya no tiene PIN predeterminado; exige `ADMIN_PIN` configurado y falla cerrado si falta.
- Reglas candidatas con escrituras directas bloqueadas en chat, visitas, tokens e historial de notificaciones.

## IMPORTANTE: no publicar las reglas todavía
`admin-notify.js` aún realiza escrituras directas desde el navegador a `scheduledNotifications` y `notifications_history`, y lee `push_tokens`. La regla candidata bloquea esas operaciones por seguridad; el panel de administración dejará de poder programar/ver notificaciones hasta migrarlo a un endpoint servidor autenticado. El endpoint `/api/send-push` usa `ADMIN_PIN`; antes de producción debe configurarse como secreto en el hosting donde se ejecute esa API y verificarse que el PIN no se exponga en el cliente.

La regla candidata no cambia las reglas activas automáticamente. Revisar también los flujos de comentarios, talento, contrataciones, perfiles, y el proveedor de hosting real antes de aplicar.

## Secretos / variables Cloudflare Worker
Añadir mediante `npx wrangler secret put NOMBRE` (nunca incluir valores en archivos ni chat):
- `CRON_SECRET` (secreto aleatorio largo para endpoint manual)
- `FIREBASE_PROJECT_ID` = `puro-llano-radio-f7166`
- `FIREBASE_CLIENT_EMAIL` = email de la cuenta de servicio
- `FIREBASE_PRIVATE_KEY` = clave privada actual de esa cuenta, con saltos de línea válidos
- `VISIT_HASH_SECRET` = aleatorio de al menos 32 caracteres

Configurar como variables (no secretos):
- `FIREBASE_DATABASE_URL` = `https://puro-llano-radio-f7166-default-rtdb.firebaseio.com`
- `CHAT_ALLOWED_ORIGINS` = origen HTTPS exacto que realmente sirve la web, sin ruta y separado por comas si hay más de uno. Confirmar dominio real; no asumir que el dominio Vercel es el único.

## Antes de publicar
1. Verificar que la cuenta de servicio y sus permisos sean correctos; no compartir claves privadas.
2. Añadir rate limiting en Cloudflare a `/chat-message`, `/chat-presence`, `/chat-typing`, `/visits` y `/` (cron manual), con límites separados por ruta y sin bloquear oyentes legítimos.
3. Confirmar que existe el índice de `scheduledNotifications` (incluido en las reglas candidatas) y que hay documentos con `scheduledTime` numérico.
4. Corregir la idempotencia de push antes de activar el cron si no se acepta el riesgo de duplicados parciales: el Worker conserva la notificación cuando falla un envío, pero puede reenviar a los tokens que sí recibieron el push en el intento previo.
5. Migrar el panel admin a endpoint autenticado antes de aplicar las reglas candidatas.
6. Desplegar Worker manualmente solo después de configurar variables y secretos; el cron se activará con el archivo `wrangler.toml` incluido.

## Comandos (desde la carpeta del proyecto)
```bash
cd worker
npx wrangler secret put CRON_SECRET
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put VISIT_HASH_SECRET
npx wrangler deploy --config wrangler.toml
```
`FIREBASE_PROJECT_ID` se puede configurar como variable o secreto en Cloudflare. `FIREBASE_DATABASE_URL` y `CHAT_ALLOWED_ORIGINS` se configuran como variables. No ejecutar `wrangler deploy` hasta completar la lista anterior.

## Estado real
Este paquete contiene cambios de código y una propuesta de reglas. No se ha desplegado, no se han aplicado reglas a Firebase, no se han configurado secretos ni se ha probado contra la base de datos real. El cron queda configurado en el archivo, pero solo empezará a ejecutarse después de un despliegue exitoso.
