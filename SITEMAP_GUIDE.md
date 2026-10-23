# 🗺️ Guía de Envío del Sitemap a Motores de Búsqueda

Esta guía te muestra cómo enviar tu sitemap a Google, Bing y otros motores de búsqueda para mejorar la indexación de **Puro Llano Radio**.

---

## ✅ Estado Actual del Sitemap

| Componente | Estado |
|---|---|
| **sitemap.xml** | ✅ Creado y validado |
| **robots.txt** | ✅ Configurado con referencia al sitemap |
| **URLs indexadas** | 10 páginas |
| **Imágenes referenciadas** | 5 imágenes |
| **Última actualización** | 2026-04-06 |

---

## 1️⃣ Google Search Console

### Paso 1: Verificar tu sitio

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Add Property"** (Agregar propiedad)
4. Selecciona **"URL prefix"**
5. Ingresa: `https://purollanoradio.com`
6. Haz clic en **Continue**

### Paso 2: Verificar propiedad

Hay varias formas de verificar. Te recomiendo **HTML file upload**:

1. Descarga el archivo de verificación (ej: `googlef13976e9337ac604.html`)
2. Ya tienes este archivo en tu proyecto: `googlef13976e9337ac604.html` ✅
3. Haz clic en **Verify**

### Paso 3: Enviar el sitemap

1. En el menú lateral, haz clic en **"Sitemaps"**
2. En **"Add a new sitemap"**, ingresa:
   ```
   sitemap.xml
   ```
3. Haz clic en **Submit**
4. Verás algo como:
   ```
   ✅ Status: Success
   📝 Discovered URLs: 10
   ```

### Paso 4: Solicitar indexación (opcional pero recomendado)

1. Ve a **URL Inspection** (Inspección de URL)
2. Ingresa: `https://purollanoradio.com/`
3. Haz clic en **Test live URL**
4. Si todo está bien, haz clic en **Request indexing**
5. Google indexará tu sitio en 1-3 días

---

## 2️⃣ Bing Webmaster Tools

### Paso 1: Verificar tu sitio

1. Ve a [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Inicia sesión con Microsoft, Google o Facebook
3. Haz clic en **"Add Site"**
4. Ingresa: `https://purollanoradio.com`
5. Selecciona el método de verificación (recomendado: usar la misma verificación de Google)

### Paso 2: Enviar el sitemap

1. Ve a **Sitemaps** en el menú lateral
2. Haz clic en **"Submit a Sitemap"**
3. Ingresa:
   ```
   https://purollanoradio.com/sitemap.xml
   ```
4. Haz clic en **Submit**
5. Bing procesará el sitemap en 24-48 horas

---

## 3️⃣ Yandex Webmaster (Opcional)

1. Ve a [Yandex Webmaster](https://webmaster.yandex.com/)
2. Inicia sesión o regístrate
3. Agrega tu sitio: `https://purollanoradio.com`
4. Verifica la propiedad
5. Ve a **Indexing → Sitemaps**
6. Agrega: `https://purollanoradio.com/sitemap.xml`

---

## 4️⃣ Baidu Webmaster Tools (Opcional - Para China)

1. Ve a [Baidu Webmaster](https://ziyuan.baidu.com/)
2. Regístrate (requiere cuenta china)
3. Agrega y verifica tu sitio
4. Envía el sitemap

---

## 🔍 Verificar la Indexación

### Google

```
site:purollanoradio.com
```

Busca esto en Google para ver cuántas páginas están indexadas.

### Bing

```
site:purollanoradio.com
```

Igual que Google, busca en Bing.

---

## 📊 Estado de Indexación (Checklist)

### Google Search Console
- [ ] Sitio verificado
- [ ] Sitemap enviado
- [ ] URLs descubiertas: 10
- [ ] Sin errores de rastreo
- [ ] Sin problemas de indexación

### Bing Webmaster Tools
- [ ] Sitio verificado
- [ ] Sitemap enviado
- [ ] URLs descubiertas: 10
- [ ] Sin errores de rastreo

---

## 🔄 Actualización Automática del Sitemap

Cada vez que agregues o modifiques páginas:

1. **Actualiza el `sitemap.xml`**:
   - Agrega la nueva URL
   - Actualiza `<lastmod>` con la fecha actual
   - Establece `<changefreq>` y `<priority>` apropiados

2. **Haz commit y push**:
   ```bash
   git add sitemap.xml
   git commit -m "Actualizar sitemap - nueva página"
   git push origin main
   ```

3. **Cloudflare Pages redeplegará automáticamente**

4. **Los motores de búsqueda detectarán los cambios** en 1-7 días

---

## 🚀 Comprobar que el Sitemap es Accesible

Una vez que tu dominio se propague en Cloudflare:

```bash
# Verificar que el sitemap es accesible
curl -I https://purollanoradio.com/sitemap.xml

# Debería responder:
# HTTP/2 200
# content-type: application/xml
```

Mientras tanto, puedes probarlo con:

```bash
# Verificar desde el dominio de Pages
curl -I https://897df438.purollanoradio-com.pages.dev/sitemap.xml
```

---

## 💡 Mejores Prácticas

### ✅ HACER:
- Actualizar `<lastmod>` cada vez que cambies una página
- Usar URLs absolutas (`https://purollanoradio.com/...`)
- Usar solo HTTPS (nunca HTTP)
- Mantener el sitemap con menos de 50,000 URLs (tienes 10 ✅)
- Comprimir el sitemap si supera 50MB (no es tu caso ✅)

### ❌ NO HACER:
- Incluir URLs que devuelvan error 404
- Incluir URLs bloqueadas por robots.txt
- Usar URLs con parámetros innecesarios
- Dejar fechas `<lastmod>` obsoletas

---

## 📝 Estructura del Sitemap

```xml
<url>
    <loc>https://purollanoradio.com/pagina.html</loc>
    <lastmod>2026-04-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
        <image:loc>https://purollanoradio.com/imagen.jpg</image:loc>
        <image:title>Título de la imagen</image:title>
    </image:image>
</url>
```

### Significado de cada campo:

| Campo | Descripción | Valores válidos |
|---|---|---|
| `loc` | URL de la página | URL absoluta (HTTPS) |
| `lastmod` | Última modificación | YYYY-MM-DD |
| `changefreq` | Frecuencia de cambio | always, hourly, daily, weekly, monthly, yearly, never |
| `priority` | Importancia relativa | 0.0 - 1.0 |

---

## 🎯 Próximos Pasos

1. **Verificar en Google Search Console** (prioridad alta)
2. **Verificar en Bing Webmaster Tools** (prioridad media)
3. **Solicitar indexación de la página principal**
4. **Monitorear errores de rastreo** semanalmente
5. **Actualizar el sitemap** cuando agregues contenido

---

## 📞 Comandos Útiles

```bash
# Validar sitemap
node validate-sitemap.js

# Verificar sitemap desde el navegador
curl https://purollanoradio.com/sitemap.xml

# Verificar robots.txt
curl https://purollanoradio.com/robots.txt

# Ver estado de indexación en Google
# Buscar en Google: site:purollanoradio.com
```

---

## ✅ Checklist Final

- [x] sitemap.xml creado y validado
- [x] robots.txt configurado con referencia al sitemap
- [ ] Google Search Console: Sitio verificado
- [ ] Google Search Console: Sitemap enviado
- [ ] Bing Webmaster Tools: Sitio verificado
- [ ] Bing Webmaster Tools: Sitemap enviado
- [ ] Verificar indexación después de 7 días

---

**¿Necesitas ayuda con la verificación en Google Search Console?**
