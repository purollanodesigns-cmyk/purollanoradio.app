# Migración del panel de notificaciones — v18

## Cambios de esta revisión

- Añadido bloqueo por notificación con compare-and-set de Firebase Realtime Database (`X-Firebase-ETag` + `If-Match`) para evitar que dos ejecuciones del cron procesen simultáneamente el mismo elemento.
- El bloqueo tiene vencimiento de 15 minutos y se libera al finalizar el procesamiento cuando todavía pertenece a la ejecución que lo obtuvo.
- Se mantienen las marcas de entrega por token con SHA-256 para que los ciclos posteriores omitan los dispositivos que ya constan como enviados.
- Añadidas cuatro pruebas unitarias del bloqueo: bloqueo vigente, reclamación con ETag, conflicto HTTP 412 y liberación únicamente por propietario.

## Pruebas locales

Ejecutar desde la raíz del proyecto:

```bash
node --check worker/worker.js
node --test tests/worker-visits.test.js tests/worker-notification-lock.test.js
```

En la preparación v19, la comprobación de sintaxis pasó y las 15 pruebas (11 de visitas y 4 de bloqueo) pasaron.

## Límites y requisitos antes de producción

- FCM no ofrece una garantía general de entrega exactamente una vez. Si FCM acepta el envío y se pierde la confirmación antes de guardar `deliveryState`, puede existir un duplicado.
- El bloqueo expira a los 15 minutos. Una ejecución que dure más que ese plazo puede perder la exclusión; supervisar la duración real y ajustar el diseño si se acercara al límite.
- Las pruebas de bloqueo simulan respuestas HTTP; no sustituyen una prueba de integración con un proyecto Firebase real.
- No se ha desplegado el Worker ni se han modificado reglas Firebase en producción.
- Antes de activar el cron, comprobar variables/secrets en Cloudflare, origen CORS, rol inicial `admin`, reglas RTDB y permisos de la cuenta de servicio. No poner secretos en este archivo.
