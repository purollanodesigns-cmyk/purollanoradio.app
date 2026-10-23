# Acción urgente: credenciales y despliegue seguro

## No publicar todavía

Este paquete de preparación elimina `.env` y `.wrangler/cache` del ZIP. Eso no elimina copias que ya estén en el historial de GitHub ni revoca credenciales.

## Rotación requerida

1. En Google Cloud Console, abre IAM y administración > Cuentas de servicio.
2. Identifica la cuenta de servicio de Firebase usada por el proyecto y revoca/elimina la clave privada que estuvo en el archivo `.env`.
3. Crea una clave nueva solo si el flujo actual realmente la necesita. Guárdala fuera del repositorio y cárgala como secreto de Cloudflare; nunca la pegues en el chat ni la incluyas en un ZIP.
4. En Cloudflare, abre el Worker `purollanoradio-cron` > Settings > Variables and Secrets. Actualiza `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` y `CRON_SECRET` como corresponda. Los valores secretos deben introducirse en el panel o CLI de Cloudflare, no en archivos versionados.
5. Si `.env` está versionado en GitHub, elimina el archivo del seguimiento con `git rm --cached .env` (si existe), confirma el cambio y revisa el historial. La limpieza del historial no reemplaza la revocación de la clave.
6. No compartas archivos `.wrangler/cache/*`; contienen metadatos locales de cuenta/despliegue.

## Arquitectura a confirmar

El repositorio tiene el frontend estático en la raíz y el Worker de notificaciones en `worker/worker.js`, configurado por `worker/wrangler.toml`. No debe ejecutarse `npx wrangler deploy` desde la raíz sin configuración: no hay un archivo Wrangler en la raíz, y desplegar `worker/wrangler.toml` despliega el cron Worker, no convierte el frontend en una web estática.

Recomendación segura: mantener el frontend en Cloudflare Pages (directorio de salida `/`, sin comando de build si solo se sirven archivos estáticos) y desplegar el cron como Worker independiente usando `npx wrangler deploy --config worker/wrangler.toml`. Los endpoints Node de `api/` no se ejecutan automáticamente en un Worker; requieren Pages Functions o migración explícita.

## Estado

Esta carpeta es una preparación local. No se ha publicado nada en Cloudflare ni modificado GitHub. Antes de reactivar despliegues automáticos, confirmar qué proyecto de Cloudflare está conectado al repositorio y si es Pages o Workers.
