# PurollanoRadio Worker — lista de seguridad previa al despliegue

## Estado
- [x] La credencial privada antigua expuesta fue revocada y sustituida, según confirmación del operador.
- [x] El endpoint manual ya no acepta el secreto en la URL; requiere POST y `Authorization: Bearer ...`.
- [x] Las peticiones REST a Realtime Database llevan token OAuth de Google.
- [x] El código no registra claves, tokens push ni cuerpos de error de proveedores.
- [x] El cron está comentado/desactivado en esta configuración de preparación.
- [ ] Confirmar que la nueva cuenta de servicio tiene solo los permisos mínimos necesarios para RTDB y FCM.
- [x] Host de Realtime Database configurado con la URL confirmada por el operador: `https://puro-llano-radio-f7166-default-rtdb.firebaseio.com`. La confirmación de la URL no verifica permisos ni reglas de acceso.
- [ ] Confirmar que existe el índice `.indexOn: ["scheduledTime"]` en `scheduledNotifications` para la consulta ordenada.
- [ ] Probar OAuth/lectura/escritura con datos de prueba, sin enviar push reales.
- [ ] Diseñar idempotencia por token: si algunos envíos fallan, la entrada queda pendiente y un reintento puede duplicar envíos ya exitosos.
- [ ] Solo tras resolver los puntos anteriores, planificar una activación de cron controlada.

## Secretos requeridos en Cloudflare
- `CRON_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

No incluir valores de secretos en archivos, Git, capturas, URLs ni mensajes.

## Prueba manual (NO ejecutar hasta aprobar)
Método: `POST`
Cabecera: `Authorization: Bearer <CRON_SECRET>`
No enviar el secreto como query parameter.
