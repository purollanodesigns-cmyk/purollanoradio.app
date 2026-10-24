# Revisión de idempotencia y alta administrativa — v17 candidato

## Cambios de esta revisión
- El procesador de notificaciones programadas guarda `deliveryState/{sha256-del-token}: "sent"` después de cada envío FCM exitoso.
- En ciclos posteriores, los tokens que ya tienen éxito registrado se omiten; solo se reintentan los tokens sin éxito persistido.
- El token FCM no se usa como clave ni se escribe en claro en `deliveryState`; se usa su hash SHA-256.
- El alta de operadores intenta eliminar la cuenta recién creada en Firebase Authentication si falla el guardado de su rol en RTDB.

## Límite importante: no es garantía de entrega exactamente una vez
FCM y RTDB no ofrecen una transacción atómica conjunta. Si FCM acepta un envío y la escritura de `deliveryState` falla inmediatamente después, un ciclo posterior puede repetir ese envío. Tampoco se implementó un bloqueo distribuido para dos ejecuciones simultáneas del cron. Por eso este cambio reduce duplicados en fallos parciales normales, pero no demuestra idempotencia absoluta y no autoriza por sí solo activar el cron de producción.

## Pruebas realizadas
- `node --check worker/worker.js`: correcto.
- `node --test tests/worker-visits.test.js`: 11/11 pruebas locales correctas.
- No se han ejecutado pruebas de integración reales contra Firebase Authentication, RTDB, FCM ni Cloudflare.

## Antes de producción
1. Añadir pruebas automatizadas de entrega parcial, fallo de persistencia tras FCM y ejecuciones concurrentes.
2. Decidir si se acepta el riesgo residual de entrega duplicada o implementar un protocolo de reclamación/entrega más robusto.
3. Probar con un proyecto Firebase de prueba y tokens FCM controlados.
4. Confirmar las reglas RTDB y todas las rutas del sitio antes de cambiarlas.
5. Configurar rate limiting/WAF para rutas públicas y administrativas.
6. No activar el cron hasta terminar las comprobaciones anteriores.
