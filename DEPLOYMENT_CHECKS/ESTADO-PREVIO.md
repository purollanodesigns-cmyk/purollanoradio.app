# Estado previo a despliegue

- Rama confirmada por el usuario: `main`.
- La captura de Cloudflare muestra `bun run build` y `npx wrangler deploy`.
- `package.json` no define un script `build`.
- El único archivo Wrangler encontrado es `worker/wrangler.toml`; configura `purollanoradio-cron` y un Cron Trigger cada 10 minutos.
- El frontend estático (`index.html`, HTML, CSS, JS y recursos) está en la raíz.
- Hay endpoints Node.js bajo `api/` y un servidor Express en `server.js`; no se ejecutan automáticamente por desplegar el Worker cron.
- Se retiraron `.env` y `.wrangler/cache/` de este paquete preparado. Hay que comprobar y corregir el seguimiento remoto de Git por separado.
- No ejecutar deploy hasta rotar las credenciales expuestas y decidir si el proyecto principal debe ser Pages o Workers con assets.
