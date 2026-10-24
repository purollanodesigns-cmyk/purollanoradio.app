# v10 — Endpoint de visitas preparado (sin desplegar)

## Cambios de esta versión

- Se añadió `POST /visits` al Worker.
- `script-visits.js` ya no incrementa `visits/.../total` ni `daily/...` desde el navegador; envía una solicitud al Worker y mantiene las suscripciones de lectura.
- El Worker calcula el día en `America/Caracas` para que coincida con el contador de la radio.
- La deduplicación del lado servidor usa HMAC de IP de conexión + User-Agent y guarda el hash en `visit_dedupe/YYYY-MM-DD/<hash>`, no la IP en claro.
- El Worker usa ETag/If-Match para crear el marcador una sola vez y actualizar `total` + `daily/<fecha>` en un único PUT condicional del nodo padre. Hay reintentos acotados para conflictos concurrentes.
- No se modificaron reglas activas de Firebase, no se desplegó el Worker y no se activó cron.

## Configuración pendiente obligatoria

1. Añadir el secreto `VISIT_HASH_SECRET` en Cloudflare Worker con al menos 32 caracteres aleatorios. No escribir el valor en el repositorio ni compartirlo por chat.
2. Configurar reglas de rate limiting en Cloudflare para `POST /visits` antes de publicar.
3. Configurar `window.CHAT_MESSAGE_ENDPOINT` en la web con la URL HTTPS base real del Worker (sin sufijo `/chat-message`). El código de visitas reutiliza esa URL base. No inventar ni colocar una URL hasta que exista el Worker desplegado.
4. En staging, probar `POST /visits` con solicitudes repetidas, solicitudes concurrentes, cambio de día, falta del secreto, error de Firebase y distintos orígenes.
5. Revisar el crecimiento de `visit_dedupe`: este código crea una clave por combinación IP/UA y día. Diseñar limpieza periódica de datos antiguos antes de producción; no activar cron para ello en esta fase.

## Limitaciones conocidas

- La deduplicación por IP + User-Agent no identifica personas: redes compartidas pueden contar como una visita, y usuarios maliciosos pueden variar el User-Agent o cambiar de IP. Rate limiting y monitorización siguen siendo necesarios.
- Los orígenes CORS no son autenticación; las solicitudes pueden falsificarse fuera de un navegador.
- La operación de contador es condicional y actualiza total/diario conjuntamente, pero el marcador de deduplicación y los contadores son dos operaciones distintas. Ante un fallo excepcional entre ambas, el endpoint intenta retirar el marcador para permitir reintento; hay que verificar ese caso en staging.
- `validateEnv` todavía exige los secretos de Firebase y `CRON_SECRET` existentes en el Worker; no se ha cambiado la configuración de cron.
- Las reglas de RTDB actuales siguen permitiendo escrituras directas en `visits`. No cerrar ese permiso hasta que el endpoint se haya probado en staging y las reglas candidatas se hayan revisado en conjunto con el resto del sitio.

## Comprobaciones locales ejecutadas

- `node --check worker/worker.js`
- `node --check script-visits.js`
- Búsqueda estática: `script-visits.js` ya no contiene `transaction()` ni escribe contadores directamente.

Estas comprobaciones no equivalen a una prueba real contra Firebase o Cloudflare.
