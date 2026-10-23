# 📡 Guía Completa de Integración con MIPanel.stream / SHOUTcast

## 🔍 INVESTIGACIÓN COMPLETA DE ENDPOINTS

### **Servidor Investigado:**
```
Host: radio.mipanel.stream
Puerto: 6816
Tipo: SHOUTcast v2 (compatible Icecast)
```

---

## 🌐 ENDPOINTS PÚBLICOS (Sin Autenticación)

### 1. **Stream de Audio**
```
GET https://radio.mipanel.stream:6816/stream
```
- **Función:** Reproducir audio en vivo
- **Uso:** Conectar reproductores, verificar servidor online
- **CORS:** Funciona con mode: 'no-cors'

---

### 2. **Estadísticas del Stream (JSON)**
```
GET https://radio.mipanel.stream:6816/stats?json=1
```
**Respuesta JSON:**
```json
{
  "currentlisteners": 23,
  "maxlisteners": 100,
  "uniquelisteners": 45,
  "averagetime": 1800,
  "status": 1,
  "contenttype": "audio/mpeg",
  "bitrate": 192,
  "genre": "Folklore Llanero"
}
```

**Implementación:**
```javascript
const response = await fetch('https://radio.mipanel.stream:6816/stats?json=1', {
    method: 'GET',
    mode: 'cors'
});
const data = await response.json();
console.log('Oyentes:', data.currentlisteners);
```

---

### 3. **Estadísticas Globales del Servidor**
```
GET https://radio.mipanel.stream:6816/statistics?json=1
```
- **Función:** Estadísticas de todos los streams en el servidor
- **Datos:** Múltiples streams, listeners totales, uptime

---

### 4. **Canción Actual**
```
GET https://radio.mipanel.stream:6816/currentsong?json=1
```
**Respuesta:**
```json
{
  "title": "Juan Vicente Torrealba - Caballo Viejo"
}
```

**Implementación:**
```javascript
const response = await fetch('https://radio.mipanel.stream:6816/currentsong?json=1');
const data = await response.json();
const parts = data.title.split(' - ');
console.log('Artista:', parts[0]);
console.log('Canción:', parts[1]);
```

---

### 5. **Próximas Canciones**
```
GET https://radio.mipanel.stream:6816/nextsongs?json=1
```
- **Función:** Ver playlist upcoming
- **Uso:** Preview de lo que viene

---

### 6. **Stats Legacy (Formato HTML)**
```
GET https://radio.mipanel.stream:6816/7.html
```
**Respuesta:** `23,45,192,1,100`
- Current listeners
- Unique listeners  
- Bitrate
- Status (1=online)
- Max listeners

---

## 🔐 ENDPOINTS ADMINISTRATIVOS (Requieren Contraseña)

### **Autenticación:**
```
Basic Auth: admin:<password>
URL: https://radio.mipanel.stream:6816/admin.cgi
```

---

### 1. **Ver Estado del Stream (JSON)**
```
GET https://radio.mipanel.stream:6816/admin.cgi?mode=viewjson&page=1&sid=1
```

**Páginas disponibles:**
- `page=1` → Resumen general
- `page=3` → Estadísticas de oyentes
- `page=4` → Historial de canciones
- `page=5` → Metadata completa
- `page=6` → Configuración del stream

**Implementación:**
```javascript
const response = await fetch(
    'https://radio.mipanel.stream:6816/admin.cgi?mode=viewjson&page=1&sid=1',
    {
        headers: {
            'Authorization': 'Basic ' + btoa('admin:' + ADMIN_PASSWORD)
        }
    }
);
```

---

### 2. **ACTUALIZAR METADATA (¡IMPORTANTE!)**
```
POST https://radio.mipanel.stream:6816/admin.cgi?mode=updinfo&sid=1&song=Artista%20-%20Canción
```

**Parámetros:**
- `mode=updinfo` → Actualizar metadata
- `sid=1` → Stream ID
- `song=` → "Artista - Canción" (URL encoded)

**Implementación:**
```javascript
async function updateMetadata(artist, song) {
    const songTitle = encodeURIComponent(`${artist} - ${song}`);
    const url = `https://radio.mipanel.stream:6816/admin.cgi?mode=updinfo&sid=1&song=${songTitle}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa('admin:' + ADMIN_PASSWORD)
        }
    });
    
    return response.ok;
}

// Uso:
await updateMetadata('Juan Vicente Torrealba', 'Caballo Viejo');
```

---

### 3. **Ver Ancho de Banda**
```
GET https://radio.mipanel.stream:6816/admin.cgi?mode=bandwidth&type=json
```

---

### 4. **Estado del Directorio YP**
```
GET https://radio.mipanel.stream:6816/admin.cgi?mode=ypstatus
```

---

## 🎙️ FORMAS DE TRANSMITIR AL SERVIDOR

### **MÉTODO 1: Conexión Source SHOUTcast (Recomendado)**

**Protocolo:** SHOUTcast DNAS Source
**Puerto:** 6816
**Contraseña:** Source password (desde mipanel.stream)

**Implementación con BUTT (Broadcast Using This Tool):**
```
1. Descargar BUTT: https://sourceforge.net/projects/butt/
2. Configurar:
   - Server: radio.mipanel.stream
   - Port: 6816
   - Password: [tu contraseña source]
   - Type: SHOUTcast v2
3. Conectar y transmitir audio del sistema
```

**Implementación con RadioBOSS:**
```
1. Add Encoder → SHOUTcast v2
2. Server: radio.mipanel.stream
3. Port: 6816
4. Password: [source password]
5. Mount Point: /stream
6. Conectar
```

---

### **MÉTODO 2: Icecast Source Connection**

**URL:** `icecast://radio.mipanel.stream:6816/stream`
**Autenticación:** source:<password>

---

### **MÉTODO 3: FFmpeg Command Line**

```bash
ffmpeg -re -i input.mp3 \
    -content_type audio/mpeg \
    -ice_name "Puro Llano Radio" \
    -ice_genre "Folklore" \
    icecast://source:PASSWORD@radio.mipanel.stream:6816/stream
```

---

### **MÉTODO 4: Liquidsoap (Avanzado)**

```liquidsoap
#!/usr/bin/liquidsoap

# Configurar output SHOUTcast
output.icecast(
    %mp3(bitrate=192, samplerate=48000, stereo=true),
    host="radio.mipanel.stream",
    port=6816,
    password="SOURCE_PASSWORD",
    mount="/stream",
    name="Puro Llano Radio",
    genre="Folklore Llanero",
    description="La mejor música llanera",
    radio
)
```

---

## 🔧 IMPLEMENTACIÓN EN ESTUDIO-VIVO.HTML

### **Funciones Implementadas:**

```javascript
// 1. Verificar servidor online
await checkServerOnline();

// 2. Obtener estadísticas reales
await fetchPublicStats();
// → currentListeners, peakListeners

// 3. Obtener canción actual
await fetchCurrentSong();
// → Actualiza UI con artista/canción

// 4. Obtener próximas canciones
await fetchNextSongs();

// 5. Actualizar metadata (requiere password)
await updateMetadata(artist, song);

// 6. Polls automáticos
startPeriodicUpdates();
// → Stats cada 15s
// → Song cada 10s
```

---

## 📊 FLUJO DE CONEXIÓN COMPLETO

```
┌─────────────────────────────────────────────────────────┐
│              ESTUDIO EN VIVO (Browser)                   │
│                                                          │
│  1. checkServerOnline()                                 │
│     → GET /stream (HEAD)                                │
│     → GET /stats?json=1                                 │
│     → GET /7.html (fallback)                            │
│         ↓                                                │
│  2. fetchPublicStats()                                  │
│     → GET /stats?json=1                                 │
│     → Parse: currentlisteners                           │
│         ↓                                                │
│  3. fetchCurrentSong()                                  │
│     → GET /currentsong?json=1                           │
│     → Parse: "Artista - Canción"                        │
│         ↓                                                │
│  4. setupAudioStream()                                  │
│     → getUserMedia() → Micrófono local                  │
│     → AudioContext (48kHz)                              │
│         ↓                                                │
│  5. startPeriodicUpdates()                              │
│     → setInterval(fetchPublicStats, 15000)              │
│     → setInterval(fetchCurrentSong, 10000)              │
│         ↓                                                │
│  6. TRANSMITIR (requiere encoder externo)               │
│     → BUTT / RadioBOSS / FFmpeg                         │
│     → Conectar a radio.mipanel.stream:6816              │
│     → Enviar audio al servidor                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 CONFIGURACIÓN REQUERIDA

### **Para obtener credenciales:**

1. **Ingresar a mipanel.stream**
2. **Ir a tu panel de control**
3. **Buscar "Contraseña Source" o "Source Password"**
4. **Copiar la contraseña**
5. **Pegar en el código:**

```javascript
const STREAM_SERVER = {
    // ...
    adminPassword: 'TU_ADMIN_PASSWORD',    // Para admin.cgi
    sourcePassword: 'TU_SOURCE_PASSWORD'   // Para transmitir
};
```

---

## 🚀 EJEMPLO PRÁCTICO COMPLETO

```javascript
// Configurar servidor
const STREAM_SERVER = {
    baseUrl: 'https://radio.mipanel.stream:6816',
    statsUrl: 'https://radio.mipanel.stream:6816/stats?json=1',
    currentSongUrl: 'https://radio.mipanel.stream:6816/currentsong?json=1',
    adminPassword: 'obtener_desde_mipanel',
    sourcePassword: 'obtener_desde_mipanel'
};

// Verificar conexión
async function conectar() {
    const online = await checkServerOnline();
    if (!online) {
        console.error('Servidor offline');
        return;
    }
    
    // Obtener stats
    const stats = await fetchPublicStats();
    console.log('Oyentes:', stats.currentlisteners);
    
    // Obtener canción
    const song = await fetchCurrentSong();
    console.log('Ahora:', song.title);
    
    // Actualizar metadata (si tienes password)
    if (STREAM_SERVER.adminPassword) {
        await updateMetadata('Nuevo Artista', 'Nueva Canción');
    }
}

conectar();
```

---

## 📝 NOTAS IMPORTANTES

1. **CORS:** Algunos endpoints requieren modo `cors`, otros `no-cors`
2. **Contraseñas:** Nunca expongas contraseñas en código público
3. **Rate Limiting:** No hacer polls más frecuente de cada 10 segundos
4. **HTTPS:** El servidor usa SSL, todas las URLs deben ser `https://`
5. **Stream ID:** Por defecto es `1`, cambiar si hay múltiples streams

---

## 🔗 RECURSOS ADICIONALES

- **SHOUTcast Docs:** https://wiki.shoutcast.com
- **Icecast Docs:** https://icecast.org/docs/
- **BUTT Download:** https://sourceforge.net/projects/butt/
- **RadioBOSS:** https://www.djsoft.net/

---

**Última actualización:** 2026-04-12  
**Versión:** 3.0 - Integración completa con SHOUTcast v2 API
