# 🚀 Guía de Despliegue en Cloudflare

Esta guía te muestra cómo desplegar **Puro Llano Radio** en Cloudflare (100% gratis).

---

## ✅ Estado del Despliegue

**Última actualización:** 6 de abril, 2026 - 11:45 PM

### Cloudflare Worker (Cron Job)
- [x] Worker creado y desplegado exitosamente
- [x] URL: `https://purollanoradio-cron.purollanoradio.workers.dev`
- [x] Cron configurado: `*/10 * * * *` (cada 10 minutos)
- [x] Secretos de Firebase configurados (4 secretos)
- [x] Prueba manual exitosa ✅
- [x] Worker funcionando y respondiendo correctamente
- [x] ✅ **CORREGIDO**: wrangler.toml movido a carpeta `/worker` para evitar conflicto con Pages

### Cloudflare Pages (Frontend)
- [x] Proyecto creado: `purollanoradio`
- [x] Sitio desplegado: `https://897df438.purollanoradio-com.pages.dev`
- [x] Branch: main
- [x] Último deploy: hace 1 minuto
- [x] ✅ **CORREGIDO**: wrangler.toml separado para evitar error de configuración
- [ ] Pendiente: Verificar que el deploy se complete sin errores

### DNS del Dominio
- [x] Dominio: `purollanoradio.com`
- [x] Agregado a Cloudflare
- [x] Nameservers cambiados de e-vzl.com a Cloudflare
- [x] ⏳ Esperando propagación de DNS (24-48 horas)
- [x] Custom domain configurado en Pages
- [ ] Pendiente: Verificar propagación completa (automático)

### Firebase Verificación
- [x] Firebase Realtime Database accesible
- [x] Push tokens registrados: 1 usuario suscrito
- [x] Notificaciones programadas: estructura verificada
- [x] Historial de notificaciones: funcionando
- [x] Cloudflare Worker puede acceder a Firebase ✅


---

## 📋 Arquitectura Final

```
┌─────────────────────────────────────────────────────┐
│              Cloudflare DNS                         │
│         (gestión del dominio)                       │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐     ┌──────────────────┐
│ Cloudflare    │     │ Cloudflare       │
│ Pages         │     │ Workers (Cron)   │
│ (Frontend)    │     │ (Notificaciones) │
└───────────────┘     └────────┬─────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Firebase     │
                        │ (Database)   │
                        └──────────────┘
```

---

## 🎯 Parte 1: Desplegar Frontend en Cloudflare Pages

### Paso 1: Conectar tu repositorio de GitHub

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com)
2. Inicia sesión o regístrate
3. En el menú lateral, haz clic en **Workers & Pages**
4. Haz clic en **Create Application**
5. Selecciona **Pages** tab
6. Haz clic en **Connect to Git**
7. Selecciona tu repositorio: `PUROLLANORADIO-COM`

### Paso 2: Configurar el build

```
Project name: purollanoradio-com
Production branch: main
Build command: dejar vacío (sitio estático)
Build output directory: / (raíz)
```

### Paso 3: Variables de entorno (opcional)

Si tu frontend necesita variables de entorno:

1. Ve a **Settings** > **Environment Variables**
2. Agrega las que necesites (ej: `FIREBASE_API_KEY`)

### Paso 4: Desplegar

Haz clic en **Save and Deploy** y espera a que termine el build.

---

## ⏰ Parte 2: Desplegar Cloudflare Worker (Cron Job)

### Paso 1: Instalar Wrangler CLI

```bash
npm install -g wrangler
```

### Paso 2: Login en Cloudflare

```bash
wrangler login
```

Se abrirá el navegador para que autorices el acceso.

### Paso 3: Configurar secretos de Firebase

⚠️ **IMPORTANTE:** Nunca subas las credenciales de Firebase al código. Usa secretos:

```bash
# Ejecuta estos comandos con tus credenciales reales
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put CRON_SECRET
```

Te pedirá que pegues el valor de cada variable.

### Paso 4: Desplegar el Worker

```bash
wrangler deploy
```

Esto desplegará el worker con el cron job configurado en `wrangler.toml`.

### Paso 5: Verificar el cron job

1. Ve al [Dashboard de Cloudflare](https://dash.cloudflare.com)
2. Ve a **Workers & Pages**
3. Selecciona tu worker: `purollanoradio-cron`
4. Ve a **Settings** > **Triggers**
5. Verifica que el cron está configurado: `*/10 * * * *`

---

## 🔧 Parte 3: Configurar DNS de tu dominio

### Si tu dominio ya está en Cloudflare:

1. Ve a **DNS** en el menú lateral
2. Agrega un registro **CNAME** para tu sitio:

```
Type: CNAME
Name: www
Target: <tu-sitio>.pages.dev
TTL: Auto
Proxy: Proxied (nube naranja)
```

3. Agrega un registro **A** o **CNAME** para el dominio raíz:

```
Type: CNAME
Name: @
Target: <tu-sitio>.pages.dev
TTL: Auto
Proxy: Proxied (nube naranja)
```

### Si tu dominio NO está en Cloudflare:

1. Ve a **Workers & Pages** > Tu proyecto
2. Haz clic en **Custom Domains**
3. Haz clic en **Set up a custom domain**
4. Ingresa tu dominio: `purollanoradio.com` (ejemplo)
5. Cloudflare te dará los nameservers
6. Ve a tu registrador de dominio y actualiza los nameservers

---

## 🧪 Parte 4: Probar el Cron Job

### Prueba manual del worker:

```bash
# Ejecuta el worker manualmente
curl "https://purollanoradio-cron.<tu-subdomain>.workers.dev/?secret=TU_CRON_SECRET"
```

### Ver los logs:

```bash
# Ver logs en tiempo real
wrangler tail
```

---

## 📊 Parte 5: Monitoreo

### Cloudflare Dashboard

1. **Analytics**: Ve el tráfico de tu sitio
2. **Workers**: Ve las ejecuciones del cron job
3. **Logs**: Revisa errores y métricas

### Firebase Console

1. Ve a **Realtime Database**
2. Revisa `scheduledNotifications` y `notificationsHistory`
3. Verifica que las notificaciones se están enviando

---

## 🔄 Flujo de actualización

Cada vez que hagas cambios en tu código:

```bash
# 1. Hacer commit y push
git add .
git commit -m "mensaje"
git push origin main

# 2. Cloudflare Pages se despliega automáticamente

# 3. Para actualizar el worker
wrangler deploy
```

---

## 💰 Costos

| Servicio | Plan | Costo |
|----------|------|-------|
| Cloudflare Pages | Free | $0/mes |
| Cloudflare Workers | Free | $0/mes (100k requests/día) |
| Cron Triggers | Free | $0/mes |
| Firebase | Spark Plan | $0/mes (10k transfers/mes) |

**Total: $0/mes** 🎉

---

## 🚨 Solución de problemas

### Error: "No hay notificaciones para enviar"

- ✅ Verifica que hay notificaciones en `scheduledNotifications` en Firebase
- ✅ Verifica que `scheduledTime` sea menor que `Date.now()`

### Error: "No hay tokens registrados"

- ✅ Verifica que hay usuarios con `pushTokens` en Firebase
- ✅ Los usuarios deben suscribirse a notificaciones push primero

### Error: "Firebase credential error"

- ✅ Verifica que los secretos están configurados: `wrangler secret list`
- ✅ Verifica que `FIREBASE_PRIVATE_KEY` tenga el formato correcto (con `\n`)

### El sitio no se actualiza

- ✅ Cloudflare Pages tiene caché. Ve a **Deployments** > **Retries** > **Clear cache**
- ✅ Hard refresh en el navegador: `Ctrl + Shift + R`

---

## 📞 Comandos útiles

```bash
# Ver todos los secretos
wrangler secret list

# Ver logs del worker en vivo
wrangler tail

# Desplegar worker
wrangler deploy

# Probar worker localmente
wrangler dev

# Ver deployments de Pages
wrangler pages deployment list

# Eliminar un deployment
wrangler pages deployment delete <id>
```

---

## ✅ Checklist final

- [ ] Frontend desplegado en Cloudflare Pages
- [ ] Worker desplegado con cron job cada 10 minutos
- [ ] Dominio configurado en Cloudflare DNS
- [ ] Secretos de Firebase configurados
- [ ] Prueba manual del worker exitosa
- [ ] SSL/TLS activado en Cloudflare
- [ ] Notificaciones push funcionando

---

## 🎉 ¡Listo!

Tu sitio **Puro Llano Radio** ahora está 100% en Cloudflare, sin depender de Vercel, y con un cron job que funciona cada 10 minutos gratis.
