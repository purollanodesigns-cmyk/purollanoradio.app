# Reglas candidatas de Firebase RTDB — Puro Llano Radio

Archivo de reglas: `seguridad/database.rules.production-v19.json`

## Qué protege
- Deniega por defecto lecturas y escrituras en la raíz.
- Permite lectura pública de radio, chat, perfiles, publicaciones y comentarios.
- Bloquea escrituras directas del navegador al chat, visitas globales, tokens push, historial de notificaciones y cola programada; esos cambios deben pasar por el Worker o un servicio con Admin SDK.
- Permite crear comentarios y publicaciones de Talento solo como registros nuevos, con validaciones de tipo y longitud; no permite editarlos ni borrarlos desde el cliente.
- Restringe perfiles y registros de usuario al UID autenticado y limita el rol del cliente a `artista`.
- Permite crear solicitudes de contratación con estado inicial `pendiente` y limita los campos.
- Mantiene las escrituras de blog y biblioteca de medios limitadas al rol `admin`.

## Importante antes de publicar
Estas reglas son un **candidato revisado**, no reglas desplegadas ni probadas con Firebase Emulator o el proyecto real. No pegarlas a ciegas en producción.

Hay una incompatibilidad de seguridad/funcionalidad que debe resolverse antes de dar por operativa la instalación: `dashboard-artista.html` lee la colección completa `/contrataciones` con una consulta por `artistaId`. Realtime Database Rules no filtra filas por consulta; una regla que autorice la lectura de toda la colección a cada artista expondría datos personales de otros clientes. En este candidato se prioriza la privacidad, así que esa consulta no recibirá permiso suficiente. Migrar esa lectura a un endpoint del Worker que autentique al artista y filtre en servidor, o crear un modelo de datos por artista sin datos cruzados, antes de publicar estas reglas.

El formulario público de contratación crea el registro en `/contrataciones`; se quitó la segunda escritura redundante en `/perfiles/{uid}/contrataciones`. Los perfiles no deben guardar copias de datos personales de contratación.

El panel de administración consulta el rol en `/usuarios/{uid}/rol`, mientras el panel nuevo de notificaciones usa `/admin_users/{uid}` a través del Worker. Son modelos de rol distintos y deben validarse antes de crear cuentas administrativas.

## Aplicación segura
1. Descargar/exportar una copia de las reglas actuales de Firebase Console.
2. Probar el archivo en Firebase Local Emulator Suite con pruebas de lectura/escritura anónima, artista autenticado, administrador y Worker/Admin SDK.
3. Resolver la consulta de contrataciones del dashboard antes del despliegue.
4. Desplegar en una ventana de mantenimiento y verificar reproductor, chat, publicaciones, perfiles, contrataciones, blog y panel de notificaciones.
5. Tener a mano las reglas previas para revertir inmediatamente si alguna función crítica falla.

No se incluye ninguna clave privada o secreto en este archivo.
