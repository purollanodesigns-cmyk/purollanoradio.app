# 🤖 AutoDJ Panel - Documentación

## 📋 Descripción

El **AutoDJ Panel** es un sistema completo de gestión de streaming para **Puro Llano Radio** que reemplaza el antiguo sistema de "Estudio en Vivo". Este panel permite administrar playlists, programación, AutoDJ, metadata y estadísticas de oyentes en tiempo real, conectado directamente al servidor SHOUTcast de **MIPanel.stream**.

---

## 🚀 Características Principales

### ✅ **1. Gestión de Playlists**
- **Playlist Principal**: Cola de reproducción de música
- **Playlist Secundaria**: Jingles, cuñas publicitarias, efectos
- Subir archivos de audio (MP3, WAV, OGG, FLAC)
- Reordenar tracks (mover arriba/abajo)
- Reproducir canciones individuales
- Modo aleatorio (shuffle)
- Reproducción completa de playlist

### ✅ **2. Programación Semanal**
- Crear programas por horarios
- Asignar DJs/Locutores
- Tipos: En Vivo o AutoDJ
- Indicador visual del programa actual
- Ordenamiento automático por hora

### ✅ **3. Estadísticas de Oyentes**
- Oyentes en tiempo real
- Gráfico histórico de audiencia
- Pico de oyentes
- Promedio de oyentes
- Actualización automática cada 10 segundos

### ✅ **4. AutoDJ Inteligente**
- Activar/desactivar AutoDJ
- Modo repetición (loop de playlist)
- Modo aleatorio
- Crossfader entre playlists principal/secundaria
- Control de tiempo de transición

### ✅ **5. Editor de Metadata**
- Actualizar artista y canción en vivo
- Género musical
- Historial de canciones reproducidas
- Envío de metadata al servidor SHOUTcast

### ✅ **6. Acciones Rápidas**
- Anunciar hora actual (voz sintética)
- Insertar jingle aleatorio
- Fade a música
- Grabar show

---

## 🔐 Autenticación

### Credenciales del Panel:
```
👤 Usuario: admin
🔑 Contraseña: autodj2026
```

### Configuración del Servidor (en código):
```javascript
const STREAM_CONFIG = {
    server: 'https://radio.mipanel.stream:6816',
    streamUrl: 'https://radio.mipanel.stream:6816/stream',
    statsUrl: 'https://radio.mipanel.stream:6816/stats?json=1',
    currentSongUrl: 'https://radio.mipanel.stream:6816/currentsong?json=1',
    adminPassword: 'Micampo123.',
    sourcePassword: '6816',
    serverType: 'shoutcast2'
};
```

---

## 📁 Estructura del Sistema

```
estudio-vivo.html
├── LOGIN SCREEN (Autenticación)
├── DASHBOARD
│   ├── Top Navigation (Tabs)
│   ├── Status Bar (Live status, now playing, stats)
│   └── Content Sections
│       ├── PLAYLISTS
│       │   ├── Playlist Principal
│       │   └── Playlist Secundaria
│       ├── SCHEDULE (Programación semanal)
│       ├── LISTENERS (Estadísticas)
│       ├── AUTODJ (Controles)
│       └── METADATA (Editor)
└── MODALS
    └── Add Schedule Modal
```

---

## 🎯 Cómo Usar el Panel

### **1. Iniciar Sesión**
1. Abrir `estudio-vivo.html` en el navegador
2. Ingresar credenciales (admin / autodj2026)
3. Click en "Acceder al Panel"

### **2. Gestionar Playlists**
1. Ir a la pestaña **"Playlists"**
2. Subir canciones arrastrando archivos o haciendo clic en "Subir Canciones"
3. Reordenar tracks con las flechas arriba/abajo
4. Reproducir una canción específica con el botón ▶
5. Eliminar canciones con el botón 🗑️

### **3. Configurar Programación**
1. Ir a la pestaña **"Programación"**
2. Click en **"Agregar Programa"**
3. Completar:
   - Nombre del programa
   - DJ/Locutor
   - Hora de inicio y fin
   - Tipo (AutoDJ o En Vivo)
4. Click en "Agregar Programa"

### **4. Activar AutoDJ**
1. Ir a la pestaña **"AutoDJ"**
2. Activar el toggle **"Modo AutoDJ"**
3. Configurar:
   - Repetir Playlist (loop)
   - Modo Aleatorio
   - Crossfader (mezcla entre playlists)
   - Tiempo de transición
4. Click en **"Reproducir Todo"** para iniciar

### **5. Actualizar Metadata**
1. Ir a la pestaña **"Metadata"**
2. Ingresar:
   - Nombre del Artista
   - Nombre de la Canción
   - Álbum (opcional)
   - Género
3. Click en **"Actualizar Metadata"**

---

## 📊 Endpoints del Servidor

| Endpoint | Función |
|----------|---------|
| `/stream` | Stream de audio en vivo |
| `/stats?json=1` | Estadísticas de oyentes |
| `/currentsong?json=1` | Canción actual |
| `/admin.cgi?mode=updinfo` | Actualizar metadata |

---

## 🔄 Flujo de Trabajo

```
┌─────────────────────────────────────────────────────┐
│                  AutoDJ Panel                         │
│                                                       │
│  1. Login → Autenticación                            │
│         ↓                                             │
│  2. Conectar → Verificar servidor SHOUTcast          │
│         ↓                                             │
│  3. Cargar → Playlists desde localStorage            │
│         ↓                                             │
│  4. Monitorear → Estadísticas cada 10s               │
│         ↓                                             │
│  5. Reproducir → AutoDJ o manual                     │
│         ↓                                             │
│  6. Actualizar → Metadata en vivo                    │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Almacenamiento Local

El sistema usa **localStorage** para persistir datos:

```javascript
'autodj_auth'              // Estado de autenticación
'autodj_playlists'         // Playlists principal y secundaria
'autodj_schedules'         // Programación semanal
```

---

## 🎨 Tecnologías Utilizadas

- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con variables CSS
- **JavaScript Vanilla** - Sin dependencias externas
- **Font Awesome 6.4** - Iconografía
- **Google Fonts (Inter)** - Tipografía
- **Fetch API** - Comunicación con servidor SHOUTcast
- **localStorage** - Persistencia de datos
- **SpeechSynthesis API** - Anuncios de hora

---

## 🛠️ Personalización

### Cambiar Credenciales
Editar en el archivo `estudio-vivo.html`:

```javascript
// Línea ~1200
if (user === 'admin' && pass === 'autodj2026') {
```

### Cambiar Servidor de Streaming
Editar la configuración:

```javascript
// Línea ~1150
const STREAM_CONFIG = {
    server: 'https://tu-servidor.com:puerto',
    // ...
};
```

### Agregar más géneros musicales
Editar el select de metadata en el HTML:

```html
<select id="metaGenre">
    <option value="nuevo-genero">Nuevo Género</option>
    <!-- ... -->
</select>
```

---

## 📱 Responsive Design

El panel es completamente responsive y funciona en:
- ✅ Desktop (1600px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 768px)

---

## 🆘 Solución de Problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| "Servidor no disponible" | URL incorrecta o servidor caído | Verificar STREAM_CONFIG |
| No carga estadísticas | CORS bloqueado | Configurar CORS en servidor |
| No se reproducen tracks | Archivos no válidos | Usar formatos MP3, WAV, OGG |
| Metadata no se actualiza | Contraseña admin incorrecta | Verificar adminPassword |
| AutoDJ no funciona | Playlist vacía | Agregar canciones primero |

---

## 🔗 Enlaces Relacionados

- **Stream URL:** https://radio.mipanel.stream:6816/stream
- **Estudio Local:** estudio-vivo.html
- **Blog Público:** blog.html
- **Admin Blog:** admin-blog.html

---

## 📝 Notas Importantes

1. **Almacenamiento Local**: Las playlists se guardan en el navegador. Si borras datos, se pierden.
2. **CORS**: El servidor SHOUTcast debe permitir peticiones cross-origin.
3. **HTTPS**: El micrófono y SpeechSynthesis requieren HTTPS o localhost.
4. **AutoDJ**: Para reproducción real de audio, se necesita implementar un reproductor HTML5.
5. **Metadata**: El envío al servidor usa el endpoint `/admin.cgi` con autenticación.

---

## 🚀 Próximas Mejoras (Opcional)

- [ ] Reproductor de audio HTML5 integrado
- [ ] Upload de archivos al servidor (no solo local)
- [ ] Waveform visualizer
- [ ] Ecualizador de audio
- [ ] Soundboard de efectos
- [ ] Integración con APIs externas (Last.fm, Spotify)
- [ ] Exportar/importar playlists (JSON, M3U)
- [ ] Multi-usuario con roles

---

**Última actualización:** 2026-04-12  
**Versión:** 3.0.0 - AutoDJ Panel completo  
**Autor:** Puro Llano Radio Team
