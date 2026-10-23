# 🚀 Infraestructura de Puro Llano Radio

## 📋 Arquitectura Actual

Este proyecto utiliza la siguiente infraestructura **100% gratuita**:

| Servicio | Función | URL |
|----------|---------|-----|
| **Cloudflare Pages** | Frontend (HTML/CSS/JS) | `https://purollanoradio.pages.dev` |
| **Render.com** | APIs (Notificaciones Push) | `https://purollanoradio-api.onrender.com` |
| **cron-job.org** | CRON Jobs (cada 10 min) | Panel de cron-job.org |
| **Firebase** | Base de datos en tiempo real | `puro-llano-radio-f7166` |

---

## 🌐 Frontend - Cloudflare Pages

### **Qué hace:**
- Sirve todas las páginas HTML
- Archivos CSS y JavaScript
- Reproductor de radio
- Chat en vivo
- Blog y artistas

### **Deploy automático:**
Cada vez que haces push a GitHub en la rama `main`, Cloudflare Pages hace deploy automáticamente.

### **URL del frontend:**
- **Desarrollo**: `https://purollanoradio.pages.dev`
- **Producción** (con dominio personalizado): `https://purollanoradio.com`

---

## 🔌 APIs - Render.com

### **Qué hace:**
- Envío de notificaciones push
- Procesamiento de notificaciones programadas
- Endpoints para administración

### **Endpoints disponibles:**

#### **1. Health Check**
```
GET https://purollanoradio-api.onrender.com/api/health
```

**Respuesta:**
```json
{
  "status": "ok",
  "message": "Puro Llano Radio API está funcionando",
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

#### **2. Enviar Notificación Push**
```
POST https://purollanoradio-api.onrender.com/api/send-push
```

**Body:**
```json
{
  "title": "¡Estamos en vivo!",
  "body": "Escucha el mejor joropo venezolano",
  "image": "https://purollanoradio.com/imagen.jpg",
  "url": "https://purollanoradio.com",
  "pin": "PuroLlano2024"
}
```

**Respuesta:**
```json
{
  "sent": 150,
  "failed": 2,
  "message": "Notificaciones enviadas con éxito."
}
```

#### **3. CRON Processor**
```
POST https://purollanoradio-api.onrender.com/api/cron-processor
```

Este endpoint es llamado automáticamente por cron-job.org cada 10 minutos.

---

## ⏰ CRON Jobs - cron-job.org

### **Qué hace:**
- Revisa notificaciones programadas cada 10 minutos
- Envía notificaciones pendientes automáticamente
- Mueve notificaciones enviadas al historial

### **Configuración:**
- **URL**: `https://purollanoradio-api.onrender.com/api/cron-processor`
- **Método**: POST
- **Frecuencia**: Cada 10 minutos (`*/10 * * * *`)

### **Cómo verificar:**
1. Ve a: https://cron-job.org/
2. Inicia sesión
3. Revisa los logs de tu cronjob

---

## 🔥 Firebase - Base de Datos

### **Estructura de la Base de Datos:**

```
firebase-database/
├── radio_history/
│   └── puro_llano_radio/
│       ├── songs: [...]
│       ├── currentSong: {...}
│       └── leader: {...}
│
├── radio_listeners/
│   └── puro_llano_radio/
│       ├── current: {...}
│       └── history: [...]
│
├── visits/
│   └── puro_llano_radio/
│       ├── total: 12345
│       └── daily/
│           └── 2026-04-05: 123
│
├── chat/
│   ├── messages/
│   ├── users/
│   ├── presence/
│   └── typing/
│
├── blog_comments/
│   └── puro_llano_radio/
│       ├── comment_1/
│       │   ├── author: "Juan"
│       │   ├── text: "Excelente artículo"
│       │   └── timestamp: 1234567890
│       └── comment_2/...
│
├── notifications_history/
│   └── ...
│
├── push_tokens/
│   └── ...
│
└── scheduledNotifications/
    └── ...
```

### **Reglas de Seguridad:**

Las reglas completas están en `firebase.js` (líneas 71-140).

**Para actualizarlas:**
1. Ve a: https://console.firebase.google.com/
2. Selecciona: `puro-llano-radio-f7166`
3. **Build** → **Realtime Database** → **Rules**
4. Pega las reglas completas
5. Click en **Publish**

---

## 📱 Variables de Entorno

### **En Render.com:**

Estas variables deben estar configuradas en Render.com:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `FIREBASE_PROJECT_ID` | `puro-llano-radio-f7166` | ID del proyecto Firebase |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...` | Email del service account |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----...` | Clave privada del service account |
| `ADMIN_PIN` | `PuroLlano2024` | PIN para enviar notificaciones |

### **Cómo obtener las credenciales de Firebase:**

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto
3. ⚙️ → **Project settings** → **Service accounts**
4. Click en **"Generate new private key"**
5. Se descargará un archivo JSON
6. De ese archivo:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

---

## 🔄 Flujo de Deploy

### **Frontend (Cloudflare Pages):**

```mermaid
graph LR
    A[Push a GitHub] --> B[Cloudflare Pages detecta cambios]
    B --> C[Build automático]
    C --> D[Deploy en producción]
    D --> E[https://purollanoradio.pages.dev]
```

### **APIs (Render.com):**

```mermaid
graph LR
    A[Push a GitHub] --> B[Render detecta cambios]
    B --> C[Instala dependencias]
    C --> D[Deploy automático]
    D --> E[https://purollanoradio-api.onrender.com]
```

### **CRON Jobs (cron-job.org):**

```mermaid
graph LR
    A[cron-job.org cada 10 min] --> B[Llama /api/cron-processor]
    B --> C[Render procesa notificaciones]
    C --> D[Envía push notifications]
    D --> E[Mueve a historial]
```

---

## 🛠️ Mantenimiento

### **Cómo actualizar el frontend:**

```bash
# Hacer cambios a los archivos
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

Cloudflare Pages hará deploy automáticamente.

### **Cómo actualizar las APIs:**

```bash
# Modificar server.js o package.json
git add .
git commit -m "Actualización de API"
git push origin main
```

Render.com hará deploy automáticamente.

### **Cómo verificar el estado:**

**Frontend:**
```
https://purollanoradio.pages.dev
```

**API:**
```
https://purollanoradio-api.onrender.com/api/health
```

**CRON:**
```
https://cron-job.org/ → Revisar logs
```

---

## 💡 Notas Importantes

### **Render.com Free Tier:**

- El servicio se "duerme" después de 15 minutos de inactividad
- Se "despierta" automáticamente con la primera petición (~30 segundos)
- **Solución**: cron-job.org mantiene el servicio activo llamándolo cada 10 minutos

### **Cloudflare Pages:**

- ✅ Bandwidth **ilimitado**
- ✅ HTTPS **automático**
- ✅ Deploy **automático**
- ✅ CDN **global**

### **cron-job.org:**

- ✅ **Gratis** hasta 60 cronjobs
- ✅ Ejecución cada **10 minutos** mínimo
- ✅ Logs de ejecución disponibles
- ✅ Notificaciones por email si falla

---

## 📞 Soporte

### **Si algo falla:**

1. **Frontend no carga:**
   - Revisa: https://dash.cloudflare.com/ → Pages → Tu proyecto
   - Verifica los logs de deploy

2. **API no responde:**
   - Revisa: https://dashboard.render.com/ → Tu servicio
   - Verifica los logs en Render
   - Comprueba las variables de entorno

3. **CRON no se ejecuta:**
   - Revisa: https://cron-job.org/ → Logs
   - Verifica que la URL de la API sea correcta

4. **Firebase no conecta:**
   - Verifica las reglas de seguridad
   - Comprueba las variables de entorno en Render
   - Revisa la consola del navegador

---

## 🎯 Resumen de URLs

| Servicio | URL |
|----------|-----|
| **Frontend** | `https://purollanoradio.pages.dev` |
| **API** | `https://purollanoradio-api.onrender.com` |
| **Health Check** | `https://purollanoradio-api.onrender.com/api/health` |
| **Send Push** | `https://purollanoradio-api.onrender.com/api/send-push` |
| **Cron Processor** | `https://purollanoradio-api.onrender.com/api/cron-processor` |
| **Firebase Console** | `https://console.firebase.google.com/project/puro-llano-radio-f7166` |
| **Cloudflare Pages** | `https://dash.cloudflare.com/?to=/:account/pages` |
| **Render Dashboard** | `https://dashboard.render.com/` |
| **cron-job.org** | `https://cron-job.org/` |

---

**Última actualización:** 5 de abril de 2026
