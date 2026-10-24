# Reglas RTDB candidatas — leer antes de usar

El archivo `database.rules.candidate-v8.json` es un CANDIDATO completo para revisión, no debe pegarse aún en producción.

Se preparó después de recibir las reglas actuales que compartió el operador y revisar el código local. No se ha probado contra la instancia real ni se ha aplicado en Firebase.

## Motivo para no aplicarlo todavía

Cierra escrituras públicas peligrosas, pero algunos flujos existentes aún dependen de escrituras directas desde el navegador. Aplicarlo antes de migrarlos puede detener funciones como el historial de canciones, contador de visitas, suscripción a notificaciones, comentarios anónimos y parte de la contratación de artistas. Consulta `REVISION-REGLAS-RTDB-v8.md` para el inventario completo.

Antes de producción hay que migrar esas escrituras a endpoints específicos con validación y límites, o decidir conscientemente que la función se deshabilita. No se debe volver a abrir toda una ruta con `.write: true` como solución rápida.
