# Pruebas locales del endpoint de visitas

Estas pruebas son unitarias y no contactan Firebase, Google OAuth ni Cloudflare. Sirven para validar el rechazo de solicitudes malformadas y la política básica del endpoint antes de solicitar un entorno de staging.

## Requisitos

- Node.js 18 o superior.
- Ejecutar desde la raíz del proyecto.

## Ejecutar

```bash
npm run test:visits
```

## Cobertura actual

- Preflight CORS para el origen permitido.
- Rechazo de origen no permitido.
- Rechazo de métodos distintos de POST.
- Rechazo de tipo de contenido distinto de JSON.
- Rechazo de campos enviados por el cliente.
- Fallo cerrado si no está configurado `VISIT_HASH_SECRET`.

## Lo que NO prueban

- Firma JWT y autenticación real de la cuenta de servicio.
- Permisos reales de Firebase Realtime Database.
- Comportamiento de ETag/If-Match con concurrencia real.
- Límites de solicitudes configurados en Cloudflare.
- Integración de extremo a extremo en el navegador.
- Crecimiento de `/visit_dedupe`: el diseño actual crea un registro por combinación IP/User-Agent/día y necesita una política de retención/limpieza antes de producción.

## Requisitos para staging

1. Crear un Worker de staging separado del de producción.
2. Configurar secretos de staging desde el panel; nunca guardarlos en el repositorio.
3. Usar un proyecto Firebase de prueba o una base de datos aislada.
4. Configurar límites de solicitudes para `/visits`.
5. Confirmar que el dominio permitido en `CHAT_ALLOWED_ORIGINS` es exactamente el del frontend de staging.
6. Probar visitas repetidas desde la misma conexión, dos conexiones diferentes, solicitudes simultáneas, fallo de Firebase y cambio de día.
7. Verificar que total y diario no se desincronicen, y que una falla no deje una clave de deduplicación que impida reintentar.

No desplegar el Worker de producción ni aplicar reglas candidatas como parte de estas pruebas.
