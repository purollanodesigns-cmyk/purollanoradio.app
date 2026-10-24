# Preparación local: chat público con validación en Cloudflare Worker

Esta carpeta contiene cambios PREPARADOS, no desplegados. No publicar aún.

## Cambios incluidos
- `worker/worker.js`: agrega `POST /chat-message` separado del endpoint de cron. Valida origen permitido, método, tamaño, nombre (2–20), ID de usuario y texto (1–500); escribe solo un mensaje normal en `chat/messages` mediante credenciales de servidor. No acepta rutas arbitrarias ni `type=system`.
- `chat-script.js`: los mensajes se envían al Worker, y se quita el botón de borrar porque el ID en localStorage no acredita propiedad real.
- `firebase.js`: elimina las reglas inseguras de ejemplo para evitar pegarlas accidentalmente.
- Cron sigue desactivado en `worker/wrangler.toml`.

## PASOS OBLIGATORIOS ANTES DE PUBLICAR
1. Configurar en la web `window.CHAT_MESSAGE_ENDPOINT = 'https://URL-REAL-DEL-WORKER'` antes de cargar `chat-script.js`. Sustituir por el hostname real del Worker; no se inventa aquí.
2. En Cloudflare, configurar rate limiting para `POST /chat-message` (por ejemplo, un límite por IP acorde al tráfico) antes de habilitarlo. El código valida datos pero por sí solo no impide spam distribuido.
3. Revisar y publicar reglas RTDB específicas: lectura pública de `chat/messages`, escritura directa denegada en `chat/messages`; las escrituras actuales de `chat/presence` y `chat/typing` deben rediseñarse/restringirse antes de cerrar permisos generales. No reemplazar las reglas completas sin auditar otras rutas del sitio.
4. Confirmar que la cuenta de servicio en Cloudflare tiene solo los permisos necesarios y que `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` y `CRON_SECRET` son secretos de Worker; nunca ponerlos en el navegador.
5. Probar en Preview/staging: OPTIONS/CORS desde ambos dominios oficiales, nombre inválido, texto vacío y >500, POST correcto, escritura/lectura en RTDB, límites, móvil/escritorio y consola.
6. El flujo actual aún escribe presencia y typing directamente desde el navegador. No afirmar que el chat está completamente protegido hasta migrar esos dos flujos y probar las reglas.
7. No activar cron ni modificar rutas de notificaciones como parte de esta fase.

## Nota de compatibilidad
El usuario actual se identifica con `localStorage`, no con Firebase Auth; el ID no es una identidad fuerte. Por eso este endpoint solo lo usa como etiqueta visible y no confía en él para autorización. La presencia/typing no se solucionan con este endpoint.
