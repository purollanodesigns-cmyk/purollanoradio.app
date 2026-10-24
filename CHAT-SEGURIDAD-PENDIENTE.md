# Preparación local: chat público con validación en Cloudflare Worker

Esta carpeta contiene cambios preparados, no desplegados. No publicar aún.

## Cambios incluidos
- `worker/worker.js`: agrega `POST /chat-message`, `POST /chat-presence` y `POST /chat-typing`, independientes del endpoint de cron. Validan origen, método, tamaño, nombre e identificador; cada ruta solo modifica su nodo fijo y no funciona como proxy genérico de Firebase.
- `chat-script.js`: envía mensajes al Worker y no expone una acción de borrado de mensajes desde el cliente.
- `firebase.js`: elimina las reglas inseguras de ejemplo.
- `seguridad/database.rules.chat-patch.json`: fragmento para negar escrituras directas en `chat/messages`; no es un archivo de reglas completo.
- Cron permanece desactivado en `worker/wrangler.toml`.

## Bloqueos previos a producción
1. Configurar `window.CHAT_MESSAGE_ENDPOINT` con el origen HTTPS real del Worker antes de cargar `chat-script.js`. No se ha inventado ni configurado el hostname.
2. Crear y probar límites de solicitudes en Cloudflare para `POST /chat-message`, `POST /chat-presence` y `POST /chat-typing`. El código del Worker no implementa un limitador persistente; sin esta configuración existe riesgo de spam/abuso.
3. Exportar las reglas RTDB actuales, integrar el fragmento con todas las demás rutas y comprobar que ningún `.write: true` superior permita escritura en `chat/messages`.
4. Probar presencia y typing en staging; después integrar reglas RTDB completas que nieguen escritura directa en `chat/messages`, `chat/presence` y `chat/typing`. Confirmar si `chat/users` lo utiliza otra parte del sitio antes de cambiar sus permisos.
5. Confirmar que los secretos `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` y `CRON_SECRET` están en Cloudflare y nunca en el cliente. Revisar permisos mínimos de la cuenta de servicio.
6. Ejecutar el checklist `seguridad/PRUEBAS-CHAT-ANTES-DE-PUBLICAR.md` en staging.
7. No activar el cron ni cambiar las rutas de notificaciones en esta fase.

## Límite importante de identidad
La identidad del chat se basa en `localStorage`, no en Firebase Authentication. El `userId` es una etiqueta declarada por el navegador, no una identidad verificada. El Worker no debe usarla para autorizar borrados, moderación ni operaciones privilegiadas.
