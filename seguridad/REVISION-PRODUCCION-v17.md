# Revisión de producción — candidato v17

## Cambios respecto a v16
- El alta de operadores solicita temporalmente un ID token de Firebase Auth para poder compensar el alta si falla la escritura de `admin_users/{uid}`.
- Si falla esa escritura, el Worker intenta eliminar la cuenta recién creada. La respuesta diferencia entre reversión confirmada y reversión no confirmada; no registra ni devuelve el token.
- Se reforzó el comentario operativo del cron para dejar explícito que un envío programado parcial puede duplicar notificaciones en los dispositivos que ya tuvieron éxito.

## Validación local ejecutada
- `node --check worker/worker.js`: correcto.
- `node --test tests/worker-visits.test.js`: 11 pruebas aprobadas.
- Estas pruebas son locales; no equivalen a integración real con Firebase Authentication, Realtime Database, FCM o Cloudflare.

## Bloqueos antes de producción
1. Resolver y probar la idempotencia/reintento por destinatario de notificaciones programadas. Mientras siga el riesgo de duplicados, no habilitar el cron de producción.
2. Probar el flujo completo de crear operador y simular fallo de escritura y fallo de reversión.
3. Confirmar el dominio HTTPS exacto en `CHAT_ALLOWED_ORIGINS` y que el frontend apunte al Worker publicado.
4. Configurar y comprobar secretos/variables en Cloudflare sin incluirlos en archivos del repositorio.
5. Configurar rate limiting/WAF para endpoints públicos y administrativos.
6. Revisar impacto de las reglas RTDB candidatas sobre chat, comentarios, talento, visitas, perfiles e historial de radio antes de aplicarlas.
7. Crear y verificar el primer `admin_users/{UID}` con `role: "admin"` y `active: true`.

## Estado
**Candidato de revisión; no desplegado y no validado contra servicios reales.** No aplicar reglas ni activar el cron basándose únicamente en la aprobación de las pruebas locales.
