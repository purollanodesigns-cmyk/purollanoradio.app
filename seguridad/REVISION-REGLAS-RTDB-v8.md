# Revisión de reglas RTDB — candidato v8 (NO APLICAR TODAVÍA)

Este archivo es un candidato completo construido a partir de las reglas que compartió el operador y de las rutas encontradas en el código local. No se ha publicado en Firebase ni probado contra la base de datos real.

## Qué endurece
- Deniega por defecto las lecturas y escrituras en la raíz.
- Mantiene lectura pública para contenido que parece público: historial de radio, oyentes, visitas, mensajes del chat, presencia/typing, comentarios, publicaciones de talento y blog, perfiles y biblioteca multimedia.
- Deniega escrituras directas del navegador en `chat/messages`, `chat/users`, `chat/presence`, `chat/typing`, `radio_history`, `radio_listeners`, `visits`, historial de notificaciones y tokens push.
- Limita `usuarios/$uid` y `perfiles/$uid` al usuario autenticado dueño del UID; limita administración de blog y multimedia a `usuarios/$uid/rol == 'admin'`.
- Protege `admin_users` y las rutas camelCase de notificaciones desde el cliente.

## IMPORTANTE: este candidato puede interrumpir funciones actuales
No aplicarlo aún. El código del sitio escribe directamente en varias rutas que aquí quedan cerradas, y deben migrarse primero o definirse permisos más específicos:
1. `script-history.js` escribe y elimina `radio_history/puro_llano_radio` y `leader`.
2. `script-listeners.js` escribe `radio_listeners/puro_llano_radio`.
3. `script-visits.js` actualiza `visits/puro_llano_radio`.
4. `notifications.js` escribe y elimina `push_tokens`; ahora mismo las claves son hashes de token, no UID autenticados. La lectura pública se cierra por privacidad.
5. `admin-notify.js` escribe `notifications_history` y `scheduledNotifications` desde el navegador; necesita migrarse a un endpoint administrativo autenticado. Las rutas camelCase y snake_case están desalineadas con los workers.
6. `blog.html` permite comentar sin que se haya confirmado que el usuario tenga sesión; este candidato exige sesión para crear/modificar comentarios.
7. `talento.js` crea publicaciones, comentarios y likes. Este candidato exige sesión para escribir publicaciones, pero no valida todavía el esquema interno completo de comentarios/likes.
8. `contratar.html` crea una contratación y también intenta modificar `perfiles/$uid/contrataciones`; esta segunda escritura se deniega deliberadamente. Se debe decidir si el vínculo se escribe en servidor o se elimina del flujo.
9. `perfil-publico.html` incrementa `perfiles/$uid/visitasPerfil`; esa escritura queda denegada y debe migrarse a servidor o retirarse.
10. La regla de `usuarios/$uid` solo permite rol `artista` en escrituras propias; confirmar que los perfiles de otros tipos no necesiten un rol diferente. El cliente nunca debe poder autoasignarse `admin`.

## Precauciones de las reglas
- RTDB aplica permisos de lectura/escritura concedidos en ancestros; no se debe añadir ningún `.write: true` en un ancestro que vuelva a abrir rutas cerradas.
- Las reglas no son filtros: una regla `.read` por usuario en una colección no filtra automáticamente los registros de otros usuarios. Por eso se mantienen denegadas las lecturas de `usuarios` salvo propietario/admin.
- El Worker usa credenciales privilegiadas y no está limitado por estas reglas. Sus endpoints necesitan validación propia y límites de solicitudes Cloudflare.
- La validación del esquema de comentarios debe ajustarse al objeto real que produce `blog.html` antes de aplicar. La expresión actual valida `timestamp` y `text`, pero aún no se verificó si los nombres de campos coinciden exactamente.
- Las reglas actuales compartidas no incluían `usuarios`, `perfiles`, `contrataciones`, `blog_posts`, `media_library`, `admin_users` ni las rutas camelCase. Las reglas candidatas para ellas se infieren del código local, no de una exportación de datos/reglas en vivo.

## Secuencia segura
1. Guardar una copia exportada de las reglas activas desde Firebase Console.
2. Probar el candidato en un proyecto Firebase de pruebas con cuentas de visitante, artista y administrador.
3. Migrar los flujos enumerados arriba.
4. Probar lecturas, escrituras autorizadas y escrituras denegadas en staging.
5. Solo después revisar y aprobar el conjunto final para producción.

No se han cambiado reglas activas, no se ha desplegado el Worker y el cron sigue desactivado.
