
## Panel de notificaciones: autenticación segura (v15 candidato)

- `admin-notificaciones.html` usa Firebase Authentication; se eliminaron las credenciales locales y el Master PIN incrustado.
- El Worker ofrece `GET /admin-auth` para comprobar el token Firebase y la entrada `admin_users/{uid}`; `POST /admin-users` permite crear cuentas solo a una cuenta administradora activa.
- Añadir el secreto `FIREBASE_WEB_API_KEY` a Cloudflare (es la clave pública de la app Firebase, pero se configura como variable para que el endpoint use el proyecto correcto). No incluir secretos de servicio en archivos ni en el navegador.
- Configurar `CHAT_ALLOWED_ORIGINS` con el origen HTTPS exacto de la web real, y `window.CHAT_MESSAGE_ENDPOINT` con la URL HTTPS del Worker antes de `admin-notify.js`.
- **Bootstrap obligatorio:** crear la primera cuenta desde Firebase Console > Authentication > Users. Copiar su UID y crear por Firebase Admin SDK / consola autorizada el registro `admin_users/{UID}` con `{"name":"Administrador principal","email":"correo-real","role":"admin","active":true}`. No habilitar auto-registro público ni crear ese registro desde el navegador. El panel no permite acceso hasta que el UID esté autorizado.
- En el panel, una sesión administradora autorizada puede registrar operadores. Contraseña mínima 12 caracteres; no se almacena en RTDB ni se devuelve en la respuesta.
- **No aplicar aún las reglas de producción ni considerar el panel completo:** el resto de operaciones de programación, cancelación e historial de notificaciones todavía contiene accesos directos a RTDB desde el navegador. Deben migrarse a endpoints del Worker antes de que las reglas `notifications_history`, `scheduledNotifications` y `push_tokens` queden cerradas. El cron no debe activarse hasta resolver ese punto y validar FCM.
