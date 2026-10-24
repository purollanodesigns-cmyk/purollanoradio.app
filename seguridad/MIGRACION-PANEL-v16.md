# Migración del panel de notificaciones — v16 candidato

## Cambios
- El panel ya no lee ni escribe directamente `notifications_history`, `scheduledNotifications` o `push_tokens` desde el navegador.
- Todas las operaciones del panel pasan por `POST/GET /admin-notifications` en el Worker, con Firebase Authentication y rol activo comprobado en `admin_users/{uid}`.
- Las cuentas nuevas creadas por un administrador tienen rol `operator`; los operadores pueden enviar, agendar y cancelar notificaciones, pero no crear cuentas ni borrar historial.
- Envíos inmediatos e informes de agenda usan los nombres canónicos `push_tokens`, `notifications_history`, `scheduledNotifications`.
- Las credenciales se validan en servidor; contraseña mínima 12 caracteres y nunca se persiste en RTDB.

## Variables/secretos Cloudflare
Configurar sin pegar valores en el repositorio: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_WEB_API_KEY`, `CHAT_ALLOWED_ORIGINS` con el origen HTTPS exacto.
Mantener `CRON_SECRET` para la ruta manual; el cron programado requiere que el trigger esté configurado en `worker/wrangler.toml`.

## Bootstrap del primer administrador
1. Habilitar Email/Password en Firebase Authentication.
2. Crear la primera cuenta manualmente en Firebase Console > Authentication > Users.
3. Crear por vía administrativa `admin_users/{UID}` con `{"name":"Administrador principal","email":"correo-real","role":"admin","active":true}`.
4. No activar registro público. Después del bootstrap, los administradores pueden crear operadores desde el panel.

## Reglas de RTDB
Usar `seguridad/database.rules.production-candidate.json` solo después de confirmar que las demás funciones del sitio (chat, comentarios, talento, visitas, perfiles y radio history) ya fueron migradas o tienen permisos adecuados. Estas reglas bloquean escrituras directas públicas de notificaciones y tokens. Firebase Admin/REST con OAuth de cuenta de servicio no está sujeto a las reglas de cliente de RTDB.

## Limitaciones pendientes de producción
- No se pudo ejecutar una prueba real contra Firebase Authentication, RTDB, FCM ni Cloudflare desde este entorno.
- El envío parcial puede haber llegado a algunos dispositivos; el endpoint devuelve error y no registra el envío como completo. No reintentar automáticamente sin revisar, para evitar duplicados.
- El cron se deja configurado en `wrangler.toml` a intervalos de 10 minutos; no se ha desplegado ni activado en Cloudflare por este paquete.
- Configurar rate limiting/WAF para las rutas públicas y administrativas antes de exponer el Worker.
