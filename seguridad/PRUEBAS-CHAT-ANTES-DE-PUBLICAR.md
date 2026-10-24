# Pruebas del chat antes de publicar

Este checklist no sustituye las pruebas reales. No se ha desplegado nada ni se ha conectado a Firebase desde este paquete.

## 1. Antes de tocar reglas
- Exportar las reglas actuales de Realtime Database y guardarlas fuera del repositorio.
- Confirmar que no haya `.write: true` en `rules`, `chat` ni otro ancestro de `chat/messages`.
- No reemplazar todas las reglas con `database.rules.chat-patch.json`: es un fragmento.
- Revisar las reglas completas junto con las rutas usadas por radio, visitas, historial, talentos y notificaciones.

## 2. Worker y configuración de la web
- Configurar `window.CHAT_MESSAGE_ENDPOINT` con el origen HTTPS real del Worker antes de cargar `chat-script.js`; no dejar un valor de ejemplo.
- Configurar y probar reglas de Rate Limiting de Cloudflare para `POST /chat-message`, `POST /chat-presence` y `POST /chat-typing`. El Worker no contiene un limitador persistente propio.
- Verificar `OPTIONS` desde cada dominio público autorizado para las tres rutas del chat.
- Verificar que `POST /chat-presence` acepte solo `online`/`offline` y `POST /chat-typing` solo `typing`/`stop`; comprobar que no exista ninguna ruta genérica para escribir rutas arbitrarias de Firebase.
- Confirmar que presencia se actualiza con heartbeat y que usuarios inactivos desaparecen tras cinco minutos; el indicador de escritura debe caducar visualmente en diez segundos.
- Verificar que un `Origin` no autorizado reciba `403`. CORS no sustituye el rate limiting ni la validación del servidor.
- Verificar que GET a `/chat-message` reciba `405`, y que el endpoint cron no acepte solicitudes sin `CRON_SECRET`.

## 3. Validación del envío
- Nombre vacío, de 1 carácter, de más de 20 caracteres o con controles HTML: rechazado.
- Mensaje vacío, de más de 500 caracteres o JSON malformado: rechazado.
- Mensaje válido: se guarda solo en `chat/messages` y aparece en las sesiones que leen el chat.
- Al fallar la red, el mensaje no se borra del campo de texto.
- El cliente no puede insertar `type: system`, borrar mensajes ni escribir directamente en `chat/messages`.

## 4. Rutas pendientes
`chat/presence` y `chat/typing` ya se actualizan mediante rutas específicas del Worker en este paquete; no se han cambiado las reglas RTDB, así que el acceso directo aún no está cerrado. `chat/users` no se usa para escrituras en el código revisado, pero debe confirmarse contra el resto del sitio antes de cerrar permisos.

## 5. Criterio de aprobación
No publicar hasta completar todas las pruebas en un entorno de staging, revisar la consola del navegador y las solicitudes de red en móvil y escritorio, y confirmar que el reproductor, historial y notificaciones no se hayan roto. Mantener el cron desactivado durante esta fase.
