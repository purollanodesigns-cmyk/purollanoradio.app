# Fase v9 — Historial y visitas: migración segura pendiente de pruebas

## Cambio aplicado en esta preparación

- Se ajustó la lista CORS del Worker al dominio de producción confirmado en la revisión del proyecto: `https://purollanoradioapp.vercel.app`.
- No se desplegó el Worker y no se cambiaron reglas activas de Firebase.
- No se cerraron permisos de `radio_history`, `radio_listeners` ni `visits`.

## Hallazgos de código

### Historial de canciones

`script-history.js` escribe directamente en `radio_history/puro_llano_radio` y mantiene una elección de líder enteramente en el navegador. La ruta `leader` también se escribe directamente. No es seguro cerrar esas escrituras y dejar el código actual: el historial dejaría de actualizarse.

La migración debe separar lectura y escritura. Un endpoint de escritura tiene que validar y normalizar título, artista, timestamps y longitud de historial, y no aceptar un objeto RTDB arbitrario. Antes de darlo por seguro hay que definir qué fuente de datos se considera confiable y limitar las solicitudes en Cloudflare. No debe confiarse en `leader` ni en un ID generado en localStorage como autorización.

### Contador de visitas

`script-visits.js` usa dos transacciones directas del cliente: una para `total` y otra para `daily/YYYY-MM-DD`. Un endpoint que solo haga dos incrementos no reproduce necesariamente la atomicidad ni impide el abuso público. La migración debe incluir deduplicación del lado servidor y límites de solicitudes, y mantener coherentes el total y el total diario.

## Secuencia segura propuesta

1. Añadir protección de solicitudes en Cloudflare antes de publicar endpoints públicos.
2. Implementar y probar un endpoint limitado para visitas con deduplicación del lado servidor y actualización consistente.
3. Migrar `script-visits.js` para enviar solo una solicitud por día; mantener las suscripciones de lectura existentes.
4. Implementar el flujo del historial desde una fuente confiable; no aceptar escrituras arbitrarias del cliente ni confiar en la elección de líder del navegador.
5. Probar en staging: visitas simultáneas, recargas repetidas, cambio de día, datos malformados, ausencia de secretos y respuesta de error.
6. Solo después preparar reglas RTDB completas que nieguen las escrituras directas ya migradas.

## Bloqueos antes de producción

- La configuración CORS solo reduce qué sitios pueden leer respuestas del navegador; no autentica al visitante ni evita solicitudes falsificadas fuera del navegador.
- Deben configurarse límites persistentes en Cloudflare para cada endpoint público.
- El Worker necesita secretos de Firebase válidos y los permisos mínimos requeridos.
- No activar cron ni aplicar reglas RTDB hasta superar las pruebas de staging.
