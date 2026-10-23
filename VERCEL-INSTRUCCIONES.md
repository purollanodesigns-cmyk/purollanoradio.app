# 🚀 Guía de Despliegue en Vercel (Gratis)

Al desplegar tu proyecto en Vercel, obtendrás un servidor gratuito ("Serverless Function") que se encargará de enviar las Notificaciones Push de forma segura.

---

## 📋 Pasos para Desplegar

### 1️⃣ Crear cuenta en Vercel

1. Ve a **[Vercel.com](https://vercel.com/signup)** y regístrate usando tu cuenta de **GitHub**.
2. Verifica tu email si te lo solicita.

---

### 2️⃣ Importar el Proyecto

1. En el panel de Vercel, haz clic en **"Add New..."** → **"Project"**.
2. Dale permisos a Vercel para leer tus repositorios de GitHub.
3. Busca tu repositorio: **`PUROLLANORADIO-COM`**
4. Haz clic en **"Import"**.

---

### 3️⃣ Configurar Variables de Entorno (Claves de Firebase)

⚠️ **ESTE PASO ES CRUCIAL** - Sin las variables correctas, las notificaciones push NO funcionarán.

#### **Paso 3.1: Obtener las Credenciales de Firebase**

1. **Ve a Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Selecciona tu proyecto:**
   ```
   puro-llano-radio-f7166
   ```

3. **Accede a la configuración del proyecto:**
   - Haz clic en el **engranaje ⚙️** (arriba a la izquierda, junto al nombre del proyecto)
   - Selecciona **"Project settings"** (Configuración del proyecto)

4. **Ve a la pestaña "Service accounts":**
   - Haz scroll hasta la sección **"Firebase Admin SDK"**
   - Haz clic en **"Generate new private key"** (Generar nueva clave privada)

5. **Descarga el archivo JSON:**
   - Aparecerá un diálogo de confirmación advirtiendo sobre la seguridad
   - Haz clic en **"Generate key"**
   - Se descargará un archivo llamado algo como:
     ```
     puro-llano-radio-f7166-firebase-adminsdk-xxxxx-abc123.json
     ```

6. **Abre el archivo JSON descargado:**
   - Haz clic derecho → Abrir con → Bloc de notas (o VS Code)
   - Verás algo como esto:

   ```json
   {
     "type": "service_account",
     "project_id": "puro-llano-radio-f7166",
     "private_key_id": "a1b2c3d4e5f6...",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n...más líneas...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@puro-llano-radio-f7166.iam.gserviceaccount.com",
     "client_id": "123456789012345678901",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40puro-llano-radio-f7166.iam.gserviceaccount.com"
   }
   ```

---

#### **Paso 3.2: Copiar las Variables a Vercel**

1. **En la pantalla de importación de Vercel:**
   - Haz clic en **"Environment Variables"** (Variables de entorno) para expandir la sección

2. **Agrega cada variable UNA POR UNA:**

| Nombre de Variable | Valor (del archivo JSON) | Ejemplo |
|--------------------|--------------------------|---------|
| `FIREBASE_PROJECT_ID` | Copia el valor de `project_id` | `puro-llano-radio-f7166` |
| `FIREBASE_CLIENT_EMAIL` | Copia el valor de `client_email` | `firebase-adminsdk-xxxxx@puro-llano-radio-f7166.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Copia TODO el valor de `private_key` (incluyendo `\n`) | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |
| `ADMIN_PIN` | Este lo eliges tú | `PuroLlano2024` |

3. **Cómo agregar cada variable:**

   **Para `FIREBASE_PROJECT_ID`:**
   - En "Name" escribe: `FIREBASE_PROJECT_ID`
   - En "Value" escribe: `puro-llano-radio-f7166`
   - Click en **"Add"**

   **Para `FIREBASE_CLIENT_EMAIL`:**
   - En "Name" escribe: `FIREBASE_CLIENT_EMAIL`
   - En "Value" pega: `firebase-adminsdk-xxxxx@puro-llano-radio-f7166.iam.gserviceaccount.com`
   - Click en **"Add"**

   **Para `FIREBASE_PRIVATE_KEY`:** ⚠️ **IMPORTANTE**
   - En "Name" escribe: `FIREBASE_PRIVATE_KEY`
   - En "Value" pega TODO el contenido de `private_key` del JSON, incluyendo:
     - `-----BEGIN PRIVATE KEY-----`
     - Los `\n` (saltos de línea)
     - `-----END PRIVATE KEY-----`
     - El `\n` final
   - Click en **"Add"**

   **Para `ADMIN_PIN`:**
   - En "Name" escribe: `ADMIN_PIN`
   - En "Value" escribe: `PuroLlano2024` (o el PIN que prefieras)
   - Click en **"Add"**

---

#### **⚠️ ERRORES COMUNES CON `FIREBASE_PRIVATE_KEY`**

**❌ ERROR 1: Quitar los `\n`**
```
Incorrecto: -----BEGIN PRIVATE KEY-----MIIEvg...-----END PRIVATE KEY-----
Correcto: -----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n
```

**❌ ERROR 2: Agregar comillas extras**
```
Incorrecto: "-----BEGIN PRIVATE KEY-----\n..."
Correcto: -----BEGIN PRIVATE KEY-----\n...
```

**❌ ERROR 3: Pegar solo una parte**
```
Incorrecto: -----BEGIN PRIVATE KEY-----
Correcto: -----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n
```

**✅ FORMA CORRECTA:**
1. Abre el archivo JSON
2. Copia TODO el valor de `private_key` (está entre comillas dobles)
3. Pega exactamente como está en Vercel
4. NO quites nada, NO agregues nada

---

### 4️⃣ Configurar el Build

En la pantalla de configuración del proyecto en Vercel:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | `Other` |
| **Build Command** | *(déjalo vacío)* |
| **Output Directory** | *(déjalo vacío)* |
| **Install Command** | `npm install` |
| **Development Command** | *(déjalo vacío)* |

---

### 5️⃣ Deploy

1. Haz clic en **"Deploy"**
2. Vercel comenzará a construir tu proyecto
3. Esto tomará 1-3 minutos
4. Verás una pantalla de progreso

---

### 6️⃣ Verificar que Funciona

1. **Verifica el frontend:**
   ```
   https://tu-proyecto.vercel.app
   ```
   Debería cargar la página principal de Puro Llano Radio.

2. **Verifica el health check:**
   ```
   https://tu-proyecto.vercel.app/api/health
   ```
   Deberías ver:
   ```json
   {
     "status": "ok",
     "message": "Puro Llano Radio API está funcionando",
     "timestamp": "2026-04-05T..."
   }
   ```

3. **Verifica el panel de notificaciones:**
   ```
   https://tu-proyecto.vercel.app/admin-notificaciones.html
   ```
   Debería cargar el panel de administración.

---

## 🔧 Solución de Problemas

### **Problema 1: "Error: Failed to parse private key"**

**Causa:** La clave privada no tiene el formato correcto.

**Solución:**
1. Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**
2. Elimina la variable `FIREBASE_PRIVATE_KEY`
3. Vuelve a agregarla asegurándote de incluir:
   - `-----BEGIN PRIVATE KEY-----`
   - Los `\n` entre líneas
   - `-----END PRIVATE KEY-----`
   - El `\n` al final

---

### **Problema 2: "Credential implementation provided to initializeApp() failed"**

**Causa:** Las credenciales son incorrectas o el service account no tiene permisos.

**Solución:**
1. Ve a Firebase Console → Project Settings → Service accounts
2. Genera una nueva clave privada
3. Actualiza las tres variables en Vercel:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
4. Haz un nuevo deploy:
   - Ve a tu proyecto en Vercel
   - Click en **"Deployments"**
   - Click en los tres puntos `...` → **"Redeploy"**

---

### **Problema 3: "MODULE_NOT_FOUND - Cannot find module 'firebase-admin'"**

**Causa:** Las dependencias no se instalaron correctamente.

**Solución:**
1. Verifica que `package.json` existe en tu repositorio
2. Verifica que `firebase-admin` está en las dependencias
3. Haz un nuevo deploy en Vercel

---

### **Problema 4: El deploy falla con "Error: ENOENT: no such file or directory"**

**Causa:** Vercel no encuentra algún archivo.

**Solución:**
1. Verifica que todos los archivos están en el repositorio:
   - `index.html`
   - `server.js`
   - `package.json`
   - `api/send-push.js`
   - `api/cron-processor.js`

2. Haz push de los archivos faltantes:
   ```bash
   git add .
   git commit -m "fix: Agregar archivos faltantes"
   git push origin main
   ```

---

## 📊 Panel de Notificaciones

Una vez que todo funcione, puedes administrar tus notificaciones desde:

```
https://tu-proyecto.vercel.app/admin-notificaciones.html
```

**Para enviar una notificación:**

1. Abre el panel de administración
2. Llena los campos:
   - **Título**: El título de la notificación
   - **Mensaje**: El contenido
   - **Imagen** (opcional): URL de una imagen
   - **URL** (opcional): Link al hacer clic
   - **PIN**: Tu `ADMIN_PIN` (por defecto: `PuroLlano2024`)

3. Haz clic en **"Enviar Notificación"**

---

## 🔄 Actualizaciones Futuras

Cada vez que hagas push a GitHub en la rama `main`, Vercel hará deploy automáticamente:

```bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

Si necesitas actualizar las variables de entorno:

1. Ve a tu proyecto en Vercel
2. Click en **Settings** → **Environment Variables**
3. Edita las variables que necesites
4. Haz un **Redeploy** para que surtan efecto

---

## 💡 Notas Importantes

### **Límites del Plan Gratuito de Vercel:**

| Límite | Valor |
|--------|-------|
| **Serverless Functions** | 100GB-horas/mes |
| **Tiempo máximo de ejecución** | 10 segundos por función |
| **Tamaño del payload** | 4.5 MB |
| **Bandwidth** | 100 GB/mes |

### **Notificaciones Push:**

- ✅ Puedes enviar notificaciones manualmente desde el panel
- ✅ Las notificaciones programadas requieren CRON jobs (plan pago)
- ✅ **Alternativa gratis**: Usa cron-job.org para llamar tu API cada 10 minutos

---

## 📞 Soporte

Si algo no funciona:

1. **Revisa los logs de Vercel:**
   - Ve a tu proyecto → **Deployments** → Click en el deployment → **Logs**

2. **Verifica las variables de entorno:**
   - Settings → Environment Variables
   - Asegúrate de que las tres variables de Firebase estén correctas

3. **Prueba el health check:**
   ```
   https://tu-proyecto.vercel.app/api/health
   ```

4. **Verifica Firebase:**
   - Asegúrate de que el servicio esté activo
   - Verifica las reglas de seguridad

---

**Última actualización:** 5 de abril de 2026
