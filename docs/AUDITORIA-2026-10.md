# Auditoría de KG Portal — octubre 2026

**Fecha:** 20/10/2026 · **Rama:** `Prod` (con los cambios locales sin commitear de esta sesión) · **Alcance:** backend, frontend, base de datos, dependencias, configuración y despliegue.

## Método

- Lectura completa de `backend/src`, `backend/migrations`, `frontend/src`, configuración (`.sample`, `ecosystem.config.js`, `.gitignore`, scripts) e historial git (100 commits).
- Verificación de cada hallazgo crítico o alto contra el código y, cuando era posible, ejecutándolo: comportamiento de `bcryptjs`, `cors`, `mysql2`, fechas con `TZ=Europe/Madrid` y pruebas contra la API local con usuarios temporales (borrados al terminar).
- `pnpm audit` y `pnpm outdated` en backend y frontend.
- Las correcciones aplicadas después de la auditoría se detallan en [Corregido durante la auditoría](#corregido-durante-la-auditoría) y se reflejan en el estado de cada hallazgo.

**Severidad:** *Crítica* = explotable sin credenciales o con impacto total; *Alta* = robo de cuentas/datos con credenciales mínimas, o datos de negocio incorrectos sin aviso; *Media* = riesgo real con condiciones o impacto acotado; *Baja* = mejora defensiva o caso límite; *Info* = observación sin riesgo directo.

## Resumen

| Severidad | Seguridad | Datos y lógica | Robustez y operación | Frontend (UX, a11y, calidad) | Base de datos | Total |
|---|---:|---:|---:|---:|---:|---:|
| Crítica | 1 | – | – | – | – | **1** |
| Alta | 4 | 5 | – | 2 | – | **11** |
| Media | 9 | 8 | 9 | 12 | 1 | **39** |
| Baja | 9 | 6 | 3 | 11 | 3 | **32** |

### Estado (actualizado el 20/10/2026)

Cada hallazgo lleva su estado: ✅ Hecho · 🟡 Parcial (se indica qué falta) · ⬜ Pendiente · — Sin acción.

| Severidad | ✅ Hecho | 🟡 Parcial | ⬜ Pendiente | Total |
|---|---:|---:|---:|---:|
| Crítica | 1 | – | – | 1 |
| Alta | 10 | 1 | – | 11 |
| Media | 2 | 2 | 35 | 39 |
| Baja | 3 | – | 29 | 32 |
| **Total** | **16** | **3** | **64** | **83** |

- **Hechos:** SEG-01 a SEG-04, SEG-07, DAT-01 a DAT-05, FRO-01, FRO-02, FRO-05, SEG-18, SEG-21 y OPE-10.
- **Parcial:** SEG-05 (falta el certificado, que depende del DNS) OPE-03 (falta el timeout del SMTP y enviar el correo de alta tras responder) y OPE-04 (falta reutilizar un único cliente Redis).
- BD-05 (informativo) no requiere acción.

**Lo que hay que hacer ya** (horas, no días):

1. ✅ **SEG-01** — Inyección SQL sin autenticar en `/api/v0/rooms/:uuid`: permite leer toda la base de datos, incluidos los hashes de contraseña.
2. ✅ **SEG-02** — `GET /users/:uuid` devuelve el hash de contraseña de cualquier usuario a cualquier sesión.
3. ✅ **SEG-03 / SEG-04** — Tokens de sesión y recuperación con `Math.random()` y token de recuperación usable como sesión completa.
4. 🟡 **SEG-05** — Producción servida por HTTP: contraseñas y tokens viajan en claro. El backend ya solo escucha en local; falta el certificado.
5. ✅ **DAT-01 / DAT-02** — El calendario no carga el domingo y cada pestaña descarga todas las reservas de la base de datos cada minuto.

Lo que está bien: SQL parametrizado en todo salvo SEG-01, lista blanca de campos en todos los `SET ?`, sin secretos en el historial de git, sin vectores XSS en el frontend (no hay `v-html`), dependencias del frontend sin vulnerabilidades conocidas, migraciones recientes reversibles.

---

## 1. Seguridad

### Crítica

#### SEG-01 · Inyección SQL sin autenticar en las pantallas de sala

- **Estado:** ✅ Hecho
- **Dónde:** `backend/src/models/Legacy/legacyRoom.js:19` (`WHERE r.uuid = '${this.uuid}'`), llamado desde `checkToken()` (`:94-101`) por `ApiRoomMiddleware` (`backend/src/middlewares/apiRoomMiddleware.js:8-11`) **antes** de autenticar.
- **Problema:** `:uuid` de la URL se interpola en el SQL. Además, sin cabecera `Authorization` el token vale `null`, y `null === null` deja pasar cualquier fila con `api_token` nulo (las salas creadas por la API nunca lo rellenan: `models/room.js:12-18`).
- **Explotación:** `GET /api/v0/rooms/x' UNION SELECT 'a',CONCAT(mail,0x3a,password),NULL,'#000000' FROM users LIMIT 0,1-- -` sin credenciales devuelve `correo:hash`. Variando el `LIMIT` se extrae cualquier tabla accesible al usuario MySQL. Sirve también como inyección ciega por tiempo. Sin inyección, cualquier sala sin `api_token` expone su reunión actual y la siguiente (título y organizador).
- **Recomendación:** `WHERE r.uuid = ?` con `[this.uuid]`; validar `:uuid` como UUID en la ruta; en `checkToken`, rechazar si el token o `api_token` están vacíos y comparar con `crypto.timingSafeEqual`; generar `api_token` al crear la sala. Revisar los privilegios del usuario MySQL (si tiene `FILE`, el impacto aumenta).

### Alta

#### SEG-02 · `GET /users/:uuid` expone el hash de contraseña

- **Estado:** ✅ Hecho
- **Dónde:** `backend/src/routes/users.js:25-26` (solo `AuthMiddleware`), `controllers/user_ctrl.js` `getUser`, `models/user.js` `read()` (selecciona `password`).
- **Explotación:** cualquier usuario `User` (o token de terceros) obtiene los `user_uuid` de `GET /bookings` y pide `GET /users/<uuid>` de cada uno: correo, rol y hash bcrypt para romper fuera de línea. El frontend no usa este endpoint.
- **Recomendación:** proteger con `UserEditMiddleware` y no seleccionar nunca `password` en `read()`; usar un método aparte solo para `login` y `checkPassword`.

#### SEG-03 · Tokens y contraseñas generados con `Math.random()`

- **Estado:** ✅ Hecho
- **Dónde:** `backend/src/utils/userToken.js:2` (sesión y recuperación), `utils/passwordGenerator.js` (contraseña inicial de 8 caracteres, barajado sesgado con `sort(() => 0.5 - Math.random())`).
- **Problema:** `Math.random` de V8 no es criptográfico; con pocas salidas consecutivas puede recuperarse su estado y predecir tokens ajenos (técnica pública; no se ha hecho prueba de concepto).
- **Recomendación:** `crypto.randomBytes(32).toString('base64url')` para tokens y `crypto.randomInt` para contraseñas. Guardar en Redis el SHA-256 del token, no el token.

#### SEG-04 · El flujo de recuperación permite tomar cuentas

- **Estado:** ✅ Hecho
- **Dónde:** `models/user.js` `sendPasswordResetEmail` (guarda `userInfo` con rol y **hash** en el mismo espacio de claves que las sesiones), `routes/password_reset.js:14` (`reset-password` con `AuthMiddleware`), `controllers/password_reset_ctrl.js` (cambia la contraseña sin pedir la actual).
- **Problema:** el token de recuperación (10 min) es una sesión completa con el rol del usuario y, vía `load-session`, devuelve el hash. A la inversa, **cualquier sesión** de 30 días (o token de terceros) puede fijar una contraseña nueva sin conocer la actual, saltándose la comprobación de `PUT /users/:uuid`. Sin política de contraseña (`"a"` es válida). El token viaja en la URL.
- **Recomendación:** tokens de recuperación con prefijo propio (`reset:`), solo `{ uuid }`, de un solo uso y que invaliden los anteriores; `reset-password` debe aceptar solo esos tokens y `AuthMiddleware` rechazarlos. Longitud mínima y complejidad en el backend.

#### SEG-05 · Producción por HTTP, sin TLS

- **Estado:** 🟡 Parcial — hecho: el backend escucha solo en `127.0.0.1` (configurable con `HOST`). Pendiente: certificado y redirección a HTTPS cuando el DNS apunte al servidor (configuración en [Despliegue HTTPS](#despliegue-https)).
- **Dónde:** VirtualHost de Apache actual (`prt.keytergroup.com.conf`, solo `:80`, acceso por IP mientras se migra el DNS); `backend/src/index.js:13` escucha en `0.0.0.0:3445`.
- **Problema:** credenciales de login, tokens de sesión (`Authorization`) y enlaces de recuperación viajan en claro. Si el puerto 3445 está abierto en el firewall, el backend es accesible sin pasar por Apache.
- **Recomendación:** activar HTTPS en cuanto el DNS apunte al servidor (Let's Encrypt con webroot ya preparado), redirigir 80→443 y añadir HSTS. Escuchar en `127.0.0.1`.

### Media

| ID | Estado | Dónde | Problema | Recomendación |
|---|---|---|---|---|
| SEG-06 | ⬜ Pendiente | `backend/src/app.js` | Sin limitación de peticiones: fuerza bruta de `sign-in`, bombardeo de correos con `request-password-reset`, prueba masiva de `api_token`. | `express-rate-limit` por IP y por cuenta en `sign-in`, `request-password-reset`, `load-session` y `v0`; `app.set('trust proxy', 1)` detrás de Apache. |
| SEG-07 | ✅ Hecho | `middlewares/authMiddleware.js`, `utils/cacheAdapter.js:43` | Sesiones de 30 días con rol y tenant congelados al iniciar sesión (un Admin degradado sigue siéndolo); cambiar la contraseña no cierra otras sesiones; tokens en claro como nombre de clave en un Redis **compartido**; `log-out` borra el token del body, no el de la cabecera. | Refrescar `role` y `tenant_uuid` en el `SELECT active` que ya se hace por petición; índice `usuario → tokens` para invalidar; guardar hashes; TTL más corto o deslizante; logout con el token de la cabecera. Confirmar que la ACL de Redis limita a `kg_portal:*`. **Hecho:** sesiones que caducan el domingo a las 23:59:59 (hora de Madrid), rol, empresa y estado leídos de la BD en cada petición, tokens hasheados, logout con la cabecera y cierre de todas las sesiones al cambiar contraseña, rol o empresa o al deshabilitar. *Queda por confirmar en el servidor:* la ACL de Redis. |
| SEG-08 | ⬜ Pendiente | `middlewares/authMiddleware.js` (terceros) | Tokens de `configThirdParty.json` sin rol pero con acceso a todas las reservas de todos los tenants, a `GET /users/:uuid` (SEG-02) y a `reset-password` (SEG-04); sin caducidad, comparados con `===` y solo revocables reiniciando. | Lista blanca de rutas para terceros (lectura y reservas propias), bloquear `/users` y `/password-reset`, comparar en tiempo constante. |
| SEG-09 | ⬜ Pendiente | `controllers/user_ctrl.js` `createUser`, `utils/emailTemplates/newUserTemplate.js` | La contraseña inicial se envía en claro por correo y no se obliga a cambiarla. | Enviar un enlace de un solo uso para fijarla (reutilizando el flujo de SEG-04 corregido). |
| SEG-10 | ⬜ Pendiente | `controllers/booking_ctrl.js` `editBooking` (`merged = { ...saved[0], ...req.body }`) | El payload que se reenvía a las apps de terceros sale del body: el dueño de una reserva puede enviar un `uuid` ajeno y las apps externas actualizarán otra reserva con sus datos. La sincronización decide con la sala original, no con la nueva. | Construir el payload desde `booking.get()` con el `uuid` de los parámetros y decidir con la sala final. |
| SEG-11 | ⬜ Pendiente | `backend/src/app.js:13-25` | `app.use(cors())` sin opciones responde `Access-Control-Allow-Origin: *` y anula la cabecera manual: `FRONTEND_CLIENT` no tiene efecto. | Solo `cors({ origin: process.env.FRONTEND_CLIENT })`. |
| SEG-12 | ⬜ Pendiente | `backend/src/app.js`, `index.js` | Sin `helmet`; `X-Powered-By: Express`; el frontend se sirve sin CSP ni `X-Frame-Options`. | `helmet()`, `app.disable('x-powered-by')`, CSP `script-src 'self'` en Apache. |
| SEG-13 | ⬜ Pendiente | `frontend/src/model/auth.js:16` | Token de 30 días en `localStorage`: cualquier XSS (propio o de una dependencia) lo roba. No se ha encontrado ningún vector XSS. | Cookie `HttpOnly; Secure; SameSite=Strict` o TTL corto con renovación. |
| SEG-14 | ⬜ Pendiente | `backend/src/utils/emailTemplates/*` | Nombre, título, detalles y sala se interpolan en el HTML del correo sin escapar. Un Gestor puede editar el título de una reserva ajena y el dueño recibirá ese HTML desde el remitente corporativo. | Escapar `& < > " '` en todas las interpolaciones. |

### Baja

| ID | Estado | Dónde | Problema | Recomendación |
|---|---|---|---|---|
| SEG-15 | ⬜ Pendiente | `password_reset_ctrl.js`, `models/user.js` `login` | Enumeración de usuarios por tiempo: si el correo existe se espera al SMTP; si no existe en `sign-in` no se ejecuta bcrypt. | Enviar el correo en segundo plano y hacer un `bcrypt.compare` falso. |
| SEG-16 | ⬜ Pendiente | `user_ctrl.js` `ALLOWED_FIELDS` | Un `User` puede cambiar su propio `tenant_uuid` (cambiar de empresa) y su `mail` sin verificación. | Restringir esos campos al Admin o verificar el correo. |
| SEG-17 | ⬜ Pendiente | `utils/mysqlAdapter.js`, `models/user.js` | Los logs guardan el SQL completo con valores (correos; hashes si falla un `UPDATE users`). | Registrar `code` y `sqlMessage`, no `sql`; enmascarar correos. |
| SEG-18 | ✅ Hecho | `models/user.js` `login` | `email` sin validar tipo: `{"email":0}` coincide con todas las filas en MySQL y prueba la contraseña del primer usuario. | Exigir `typeof email === 'string'` en todos los campos del body. |
| SEG-19 | ⬜ Pendiente | `models/user.js` `isActive` | Devuelve `null` si falla la BD y el middleware solo bloquea con `=== false`: ante un error, deja pasar a los deshabilitados. | Tratar `null` como no autorizado (decisión explícita). |
| SEG-20 | ⬜ Pendiente | `controllers/booking_ctrl.js` `getBookings`, `getBooking` | Cualquier sesión ve todas las reservas (incluidas `Pending` y `Rejected`) de todos los tenants con nombre del autor; `filter_tenant` que envía el frontend no está implementado. | Confirmar si es deseado; si no, filtrar por tenant y limitar campos. |
| SEG-21 | ✅ Hecho | `frontend/src/views/login/set-new-password-view.vue` | El token de recuperación queda en el historial y la vista sustituye el token global: si el enlace caducó, el 401 borra además la sesión abierta. | `Request` con cabecera propia para esa llamada. |
| SEG-22 | ⬜ Pendiente | `frontend/src/model/request.js:18` | `Authorization: Basic <token>` no es Basic real y se envía vacío a endpoints públicos. | `Bearer` y omitir la cabecera si no hay token. |
| SEG-23 | ⬜ Pendiente | `backend/src/routes/v0`, `configThirdParty` | `configThirdParty.json` ausente tumba el arranque en bucle (pasó en el primer despliegue). | Validar la configuración al arrancar con un mensaje claro y `process.exit(1)`. |

---

## 2. Datos y lógica de reservas

### Alta

| ID | Estado | Dónde | Problema | Recomendación |
|---|---|---|---|---|
| DAT-01 | ✅ Hecho | `frontend/src/components/Calendar.vue:103-112` | El rango semanal se formatea con `toISOString()` (UTC): en España la semana del 19 al 25 se pide como **18 al 24** (comprobado con `TZ=Europe/Madrid`). Las reservas del domingo visible no se cargan y la sala aparece libre. | Formatear fechas en local (`moment(d).format('YYYY-MM-DD')`); prohibir `toISOString` para fechas. |
| DAT-02 | ✅ Hecho | `frontend/src/store/useSyncStore.js:56`, `useBookingStore.js:15-17` | La sincronización de cada minuto (y al volver a la pestaña) llama a `fetchBookings()` sin parámetros: el backend devuelve **todas** las reservas de la BD, sobrescribe `currentParams` y compite con el fetch de la semana. Carga creciente sin límite y exposición del histórico completo. | Reutilizar `currentParams`; exigir `from_date`/`to_date` en el backend; cancelar peticiones obsoletas. |
| DAT-03 | ✅ Hecho | `frontend/src/components/modals/DateSelectionModal.vue:141-175, 272-283` | `new Date('YYYY-MM-DD')` (medianoche UTC) + `toISOString()`: tras el cambio de hora o entre las 00:00 y las 02:00, el botón muestra el día N y se reserva el N-1, sin aviso. | Trabajar solo con cadenas locales `YYYY-MM-DD` y `new Date(y, m, d)`. |
| DAT-04 | ✅ Hecho | `backend/src/models/booking.js:202-243` | La validación de «pasado» se salta: el regex admite fechas ISO completas y en `editBooking` `start_date` llega como `Date`, así que `new Date(\`${start_date}T${start_time}\`)` es `Invalid Date` (comprobado) y todas las comparaciones dan `false`. Se pueden editar reservas pasadas o con fin anterior al inicio. | Normalizar a `YYYY-MM-DD` en `set()`, exigir ese formato y rechazar `isNaN(fecha)`. |
| DAT-05 | ✅ Hecho | `backend/src/models/booking.js:232` frente a `:293-305` | Una reserva que cruza la medianoche (del 20 a las 10:00 al 21 a las 09:00) pasa `validate` pero `validRange` nunca la detecta como solape (`start_time > end_time`). | Decidir el modelo: franja diaria (exigir `start_time < end_time`) o intervalo continuo (`TIMESTAMP(start_date, start_time)`, idealmente columnas `start_at`/`end_at` indexadas). |

### Media

| ID | Estado | Dónde | Problema | Recomendación |
|---|---|---|---|---|
| DAT-06 | ⬜ Pendiente | `booking_ctrl.js` alta/edición/bulk, `utils/bookingHelper.js` | Validar y escribir sin bloqueo: dos peticiones simultáneas (o dos aprobaciones) pueden dejar dos `Approved` solapadas. | `runInTransaction` con `SELECT … FROM rooms WHERE uuid = ? FOR UPDATE` para serializar por sala. |
| DAT-07 | ⬜ Pendiente | `booking_ctrl.js:41, 258`, `bookingHelper.js:38-39` | `rejectOverlapping` se ignora en altas y bulk (los autores no reciben correo, contra lo documentado); en la aprobación se rechaza y se avisa **antes** del `update`, fuera de transacción; editar una `Approved` encima de `Pending` no las rechaza. | Llamar a `rejectOverlapping` siempre que el resultado sea `Approved`, dentro de la transacción de DAT-06, y enviar correos tras el commit. |
| DAT-08 | ⬜ Pendiente | `backend/src/models/Legacy/legacyRoom.js` | Pantallas de sala: fecha en UTC y hora local (entre las 00:00 y las 02:00 muestra las de ayer); excluye reservas de varios días; muestra `Pending`; compara `'10:00:00' <= '10:00'` como texto (la reunión aparece un minuto tarde); `color.slice(1)` lanza si la sede no tiene color. | Fecha local, rango `start_date <= hoy <= end_date`, solo `Approved`, horas normalizadas, color por defecto. |
| DAT-09 | ⬜ Pendiente | `backend/src/models/booking.js:226-228`, `connections/mysql.js:11` | «Pasado» depende de la zona horaria del proceso, que no se fija (`TZ` no está en `ecosystem` ni `.env`): en un servidor en UTC se puede reservar hasta 2 h en el pasado. | `TZ=Europe/Madrid` en `ecosystem.config.js`; `SET time_zone` coherente por conexión. |
| DAT-10 | ⬜ Pendiente | `migrations/20250513141840-CreateBookingTable.js:27`, `models/booking.js:219` | El título se valida hasta 255 caracteres, pero la columna es `VARCHAR(100)`: entre 101 y 255 da error 500 o se trunca. | Migración `MODIFY title VARCHAR(255)` o validar contra 100. |
| DAT-11 | ⬜ Pendiente | `room_ctrl.js`/`models/room.js`, `facility_ctrl.js`/`models/facility.js` | Un `PUT` parcial deja a `NULL` los campos no enviados (`set(req.body)` + `SET ?`); un uuid inexistente responde 200. | Construir el objeto solo con las claves presentes y validar tipos. |
| DAT-12 | ⬜ Pendiente | `frontend/.../WeekView.vue:162-176`, `DateSelectionModal.vue:190-193`, backend `list` | Las reservas de varios días solo se ven el primer día: los intermedios aparecen libres. | Filtrar por solape (`start_date <= día <= end_date`) o prohibir reservas de varios días. |
| DAT-13 | ⬜ Pendiente | `frontend/src/store/useBookingStore.js:25, 64` | Calendario y validación comparten el array `bookings`, y una respuesta `{ok:false}` (200) se guarda como si fuera la lista: `.filter` lanza en `WeekView`. | Separar `weekBookings` y `pendingBookings`; `Array.isArray(r) ? r : []`. |

### Baja

| ID | Estado | Dónde | Problema |
|---|---|---|---|
| DAT-14 | ⬜ Pendiente | `models/booking.js` | Sin duración máxima (un `User` puede bloquear una sala hasta 2099), sin tope de elementos en `bulk`, y se pueden reservar salas con `enabled = 0`. |
| DAT-15 | ⬜ Pendiente | `booking_ctrl.js:126-128` | Un Admin que edita una `Rejected` sin enviar `status` la aprueba. |
| DAT-16 | ⬜ Pendiente | `booking_ctrl.js:260`, `utils/thirdPartyService.js:17` | El bulk quita `user_uuid` antes de sincronizar, así que la app que originó el cambio lo recibe de vuelta. |
| DAT-17 | ⬜ Pendiente | `booking_ctrl.js` `editBooking` | Al cambiar de sala no se valida la nueva (la FK falla y responde 200 `ok:false`). |
| DAT-18 | ⬜ Pendiente | `models/booking.js:263-270` | `validRange` devuelve un objeto *truthy* si faltan datos (hoy inalcanzable). |
| DAT-19 | ⬜ Pendiente | `frontend/.../ViewBookingDetailsModal.vue:199-201`, `Calendar.vue:273` | «Solo lectura» se calcula solo con la fecha de fin: una reserva que terminó esta mañana sigue editable. |

---

## 3. Robustez y operación (backend)

| ID | Estado | Sev. | Dónde | Problema | Recomendación |
|---|---|---|---|---|---|
| OPE-01 | ⬜ Pendiente | Media | Varios (`booking_ctrl.js:18, 92-96, 207`, `user_ctrl.js:83`, `booking.js:61, 331, 385`) | `mysqlAdapter.query` nunca rechaza y muchos usos no comprueban `result.error`: `editBooking` accede a `saved[0]` antes de comprobar que existe (500), `deleteBooking` y `updateUser` responden «correctamente» ante un error (mail duplicado, body vacío), y la sincronización con terceros se lanza igualmente. | Comprobar `result.error` antes de `[0]`, `length` o `affectedRows` en todos los usos. |
| OPE-02 | ⬜ Pendiente | Media | Todos los controladores | Formato de respuesta incoherente: 200 con `{ok:false}`, `res.send({message})` con 200, 400 sin `ok`, 500 con `error`; `createRoom` y `createFacility` devuelven el `OkPacket` con el `insertId` interno. | Helper único `send(res, status, {ok, message, data})` con códigos HTTP reales. |
| OPE-03 | 🟡 Parcial: la sincronización con terceros usa `fetch` con 10 s de límite; falta el SMTP | Media | `utils/thirdPartyService.js:25`, `connections/mailer.js`, `user_ctrl.js` `createUser` | Llamadas externas sin timeout esperadas dentro de la petición: un tercero colgado bloquea altas y bajas; SMTP sin timeouts; si el correo falla al crear un usuario, el usuario queda creado y se responde 500 (invita a duplicar). | `timeout: 5000` en axios, timeouts en nodemailer y envío en segundo plano tras responder. |
| OPE-04 | 🟡 Parcial: todas las operaciones pasan por `run` (listener de `error`, cierre en `finally`, conexión con límite de 3 s y sin reconexión); falta el cliente único | Media | `utils/cacheAdapter.js` | Un cliente Redis nuevo por operación (conexión, AUTH y cierre en cada petición autenticada), sin listener de `error` (node-redis puede tumbar el proceso) y `close()` fuera de `finally` (fugas). | Un cliente único al arrancar, con `.on('error')`, reutilizado y cerrado al apagar. |
| OPE-05 | ⬜ Pendiente | Media | `backend/src/index.js` | Sin `SIGINT`/`SIGTERM`, `server.close()`, `pool.end()` ni `unhandledRejection`/`uncaughtException`: `pm2 reload` corta peticiones en curso. | Apagado ordenado con timeout y listeners de proceso hacia el logger. |
| OPE-06 | 🟡 Parcial: `connectTimeout: 10000` y `enableKeepAlive` hechos; el error de arranque se registra y el proceso sigue vivo para que `/api/ready` dé la base como caída (sin `process.exit`, que repetiría el bucle). Falta el límite con `queueLimit` | Media | `connections/mysql.js` | `connectTimeout: 1000000` (≈16 min), `connectionLimit: 64` sin `queueLimit`, sin keep-alive; `throw` en el callback de arranque provoca bucle de reinicios cada 2 s. | `connectTimeout: 10000`, límite 10-20 con `queueLimit`, `enableKeepAlive`, error de arranque al logger y `process.exit(1)`. |
| OPE-07 | ⬜ Pendiente | Media | `utils/logger.js` | `logger.init()` crea un logger por fichero que lo llama (tres `DailyRotateFile` sobre el mismo fichero compiten al rotar); `JSON.stringify(error)` de un `Error` da `{}` (se pierden los errores de Redis y SMTP); sin nivel ni consola en desarrollo; mezcla con `console.*`. | Logger único, `format.errors({stack:true})`, nivel por entorno. |
| OPE-08 | ⬜ Pendiente | Media | `backend/package.json` | `db-migrate` y `db-migrate-mysql` están en `devDependencies`, pero `deploy` ejecuta `migrate`: con `NODE_ENV=production`, `pnpm install` no los instala y el despliegue falla. | Pasarlos a `dependencies`. |
| OPE-09 | ⬜ Pendiente | Media | `frontend/package.json:15`, `ecosystem.config.js` | `KG_01_FrontEnd` sirve el frontend con `vite preview`, que no es para producción; Apache ya sirve `dist/`. | Retirar ese proceso de PM2 y dejar Apache con las cabeceras de seguridad. |
| OPE-10 | ✅ Hecho | Baja | `models/user.js` | `setRedis` sin `await` en login y recuperación: el token puede devolverse antes de estar guardado y, si Redis falla, el login dice «ok». | `await` y comprobar el resultado. |
| OPE-11 | ⬜ Pendiente | Baja | `utils/statusEmailHelper.js`, `booking_ctrl.js` bulk | N+1: un `User.read` y un `Room.read` por cada reserva rechazada; el bulk relee la sala en cada elemento dentro de la transacción. | Cargar una vez y reutilizar. |
| OPE-12 | ⬜ Pendiente | Baja | Índices (`migrations`) | `bookings` solo tiene índices por `uuid` y FKs; `validRange`, `rejectOverlapping` y `list` filtran por fechas y `status` sin índice. | Migración con `INDEX (room_uuid, start_date, end_date)` e `INDEX (start_date)`. |

---

## 4. Frontend: accesibilidad, UX, rendimiento y calidad

### Alta

| ID | Estado | Dónde | Problema | Recomendación |
|---|---|---|---|---|
| FRO-01 | ✅ Hecho | `components/views/WeekView.vue:62-80` | Celdas y reservas son `<div @click>` sin `tabindex` ni rol: con teclado o lector de pantalla no se puede abrir, editar ni borrar una reserva (WCAG 2.1.1). | `<button>` con `aria-label` (sala, día, hora y título). |
| FRO-02 | ✅ Hecho | Los cinco modales del asistente de reserva | «Cerrar» y «Volver» son `<i @click>` sin foco y los diálogos son `persistent` (Esc no cierra): el foco queda atrapado. | `<v-btn icon aria-label="Cerrar">`; quitar `persistent` o gestionar Esc. |

### Media

| ID | Estado | Dónde | Problema | Recomendación |
|---|---|---|---|---|
| FRO-03 | ⬜ Pendiente | `Calendar.vue`, `DetailsSelectionModal.vue`, `BulkBookingModal.vue` | Las acciones de reserva no se esperan y el modal se cierra antes de la respuesta: si el backend rechaza (solape, título largo), se pierde lo escrito y queda una promesa rechazada sin manejar. | `await`, botón con `:loading` y cerrar solo si hay éxito. |
| FRO-04 | ⬜ Pendiente | `booking-validation-list.vue`, `booking-validation-view.vue`, `useBookingStore.js` | Aprobar una serie lanza N peticiones en paralelo, N refrescos y N avisos sin agregar resultados (puede quedar a medias) y sin confirmación. | Endpoint en bloque o `Promise.allSettled` con un único refresco y resumen; confirmar las series. |
| FRO-05 | ✅ Hecho | `DetailsSelectionModal.vue`, `BulkBookingModal.vue`, `useBookingStore.js`, `WeekView.vue` | «Hoy» se calcula en UTC (entre las 00:00 y las 02:00 es ayer) y queda congelado al pasar la medianoche. | Utilidad `todayLocal()` evaluada al usarla. **Hecho:** «hoy» en hora local y reactivo (`useToday()` en `utils/dates.js`): calendario, minicalendario, botón «Hoy» y modales cambian de día a medianoche sin recargar. |
| FRO-06 | ⬜ Pendiente | `components/modals/DetailsSelectionModal.vue` | Estados incoherentes: al cambiar de sala no se refresca la disponibilidad; «Desde» con `@click="goBack"` permite `dateTo < dateFrom`; no se valida fin > inicio; `addOneHour` convierte 23:xx en 00:xx del mismo día; usa `REJECTED` como marca de «pendiente no bloqueante». | `watch` sobre sala y fechas, validar el rango y un flag propio. |
| FRO-07 | ⬜ Pendiente | `model/request.js` | Siempre llama a `res.json()` (un 204 o un 502 con HTML lanza `SyntaxError` que llega al usuario), «Failed to fetch» en inglés, varios 401 en paralelo generan varias redirecciones. | Comprobar `content-type` y 204, normalizar errores en español y deduplicar el 401. |
| FRO-08 | ⬜ Pendiente | `components/form-components/text-field.vue` | API de Vuetify 2 (`value`/`onChange`, `dense`, `solo`, selectores `.v-input__slot`): funciona solo porque `modelValue` atraviesa como atributo. | Reescribir con `defineModel()` y borrar el CSS de Vuetify 2. |
| FRO-09 | ⬜ Pendiente | Modales antiguos | Clases que no existen en Vuetify 4.2.6 (`text-h5`, `text-h6`, `text-subtitle-1`, `text-body-1/2`, `text-caption`, `start-5`, `gap-2`, `elevation="6"`): tipografía y espaciado distintos de lo diseñado sin ningún error. | Clases de Vuetify 4 (`text-title-medium`, `ga-2`, `elevation-0…5`) o CSS propio. |
| FRO-10 | ⬜ Pendiente | `main.js`, `CalendarHeader.vue`, modales | Bundle: `import * as components` incluye todo Vuetify (`index.js` 820 KB / 265 KB gzip, CSS 601 KB); `moment-with-locales` (141 locales) convive con `moment` (dos copias); Font Awesome completo con *brands*. | `vite-plugin-vuetify` con autoimport, un solo `moment` con locale `es` (o `Intl`), solo `solid`/`regular` de Font Awesome. |
| FRO-11 | ⬜ Pendiente | Varios | Contraste insuficiente (WCAG AA 4,5:1): `#94a3b8` sobre blanco 2,56:1 (etiquetas, contadores, paginación), `#b4bcc8` 1,91:1 (días pasados), `#c3c9d2` 1,67:1; texto blanco sobre el color arbitrario de la sede (y con `opacity .6` en pendientes). | `#64748b` como mínimo y color de texto del chip según la luminancia del color de sede. |
| FRO-12 | ⬜ Pendiente | `components/form-components/form-field.vue` | La etiqueta es un `<span>` sin `for`: los campos solo tienen el placeholder como nombre accesible; cada campo crea un landmark `<main>`. | `<label :for>` y `<div>` en lugar de `<main>`. |
| FRO-13 | ⬜ Pendiente | `DateSelectionModal.vue`, `password-recovery-view.vue:66`, `booking-validation-list.vue` | Botones solo con icono sin `aria-label`, `<a @click>` sin `href` (no recibe foco), filtros sin etiqueta. | Nombres accesibles y elementos focusables. |
| FRO-14 | ⬜ Pendiente | `ViewBookingDetailsModal.vue:184-190`; `layout.vue`, `main.js` | Lanza `TypeError` si no encuentra la sala; cerrar sesión sin manejo de errores (si falla la red la sesión local sigue viva) y `router.push` antes de `app.use(router)` en `main.js`. | Optional chaining; limpiar la sesión local siempre en `finally`. |

### Baja

| ID | Estado | Problema |
|---|---|---|
| FRO-15 | ⬜ Pendiente | `WeekView`: los eventos se recalculan y ordenan dos veces por celda en cada render (salas × 7 × reservas, agravado por DAT-02); hoy se puede pulsar una hora ya pasada. |
| FRO-16 | ⬜ Pendiente | `ResourceFilter`: la selección guardada no incluye sedes nuevas y `allSelected` compara longitudes aunque haya uuids obsoletos. |
| FRO-17 | ⬜ Pendiente | `app-version` pide `system/version` cada vez que se abre el menú de usuario; `app-loader` falla con `active=false`. |
| FRO-18 | ⬜ Pendiente | Mi cuenta oculta el mensaje del backend ante una contraseña actual incorrecta; «(Editado)» aparece tras aprobar una reserva; el contador de pendientes se pide también para Gestor. |
| FRO-19 | ⬜ Pendiente | Lógica duplicada: lunes de la semana (5 sitios), formato de hora (4), fecha a cadena (3), iniciales (2), CSS de cierre y volver copiado en 5 modales. Crear `utils/dates.js` y un componente de cabecera de diálogo. |
| FRO-20 | ⬜ Pendiente | Componentes grandes: `DetailsSelectionModal` (547 líneas), `WeekView` (449), `BulkBookingModal`, `DateSelectionModal`, `Calendar` con seis modales y todo el estado del asistente. Extraer un composable `useBookingWizard`. |
| FRO-21 | ⬜ Pendiente | Colores repetidos (`#111111` 63 veces, `#64748b` 23, `#334155` 19) y tema de Vuetify sin configurar: los modales antiguos usan `primary` azul y las pantallas nuevas negro y verde. Definirlos en `createVuetify({ theme })`. |
| FRO-22 | ⬜ Pendiente | 23 `!important` en 13 ficheros; props no declaradas en los modales; `sessionStore.getAuth` y setters de `ErrorResponse` sin uso; CSS muerto en `WeekView`; errata `--black-transaparent-xs`. |
| FRO-23 | ⬜ Pendiente | Textos: mezcla de tú y usted, mayúsculas inconsistentes («Crear Reserva» frente a «Nueva reserva»), la misma entidad llamada «Edificio», «Sede» e «instalación»; sin estado de carga en el calendario; el título no tiene `maxlength`; solo horas en punto. |
| FRO-24 | ⬜ Pendiente | Accesibilidad menor: `role="tablist"` sin navegación con flechas, avisos con `role` dinámico (algunos lectores no los anuncian), botón de menú móvil sin `aria-expanded`, información de validación solo en tooltip, `<title>` fijo en todas las rutas. |
| FRO-25 | ⬜ Pendiente | `URLSearchParams` serializa `undefined`/`null` como texto; `filter_tenant` se envía pero el backend no lo implementa. |

---

## 5. Base de datos y migraciones

| ID | Estado | Sev. | Problema | Recomendación |
|---|---|---|---|---|
| BD-01 | ⬜ Pendiente | Media | `fk_user ON DELETE CASCADE` (`CascadeDeleteAndUpdate.js`): un `DELETE` manual de un usuario borra todas sus reservas, en contra de «los usuarios no se borran». | `ON DELETE RESTRICT` en una migración nueva. |
| BD-02 | ⬜ Pendiente | Baja | `notnull` en minúscula (`CreateBookingTable.js:21-22`, `CreateRoomsTable.js:21`): db-migrate solo lee `notNull`, así que `user_uuid`, `room_uuid` y `facility_uuid` admiten NULL. `bookings.uuid`, `tenants.uuid` y `bookings.status` también. | Migración con `NOT NULL`. |
| BD-03 | ⬜ Pendiente | Baja | `fk_room` y `fk_facilities` sin `ON DELETE`: borrar una sala con reservas falla y la API responde 200 `ok:false`. | Definir el comportamiento (`RESTRICT` explícito) y responder 409. |
| BD-04 | ⬜ Pendiente | Baja | `enabled` filtra `list()` pero no `read()` y no se gestiona desde la API. | Unificar o eliminar. |
| BD-05 | — Sin acción | Info | Las ocho migraciones anteriores a `AddValidationColumns` no tienen `down`. `DropKibookingPrefix` y `AddUserActive` sí son reversibles. | Sin acción (no se editan migraciones aplicadas). |

Ver también DAT-10 (longitud del título) y OPE-12 (índices).

---

## 6. Dependencias

| Proyecto | `pnpm audit` | Observaciones |
|---|---|---|
| Backend | 1 alta: `braces ≤ 3.0.3` (DoS por patrones anidados) vía `nodemon › chokidar` | Solo en desarrollo (`nodemon`); no llega a producción. Actualizar `nodemon` cuando haya versión que lo arrastre corregido. |
| Backend | — | `nodemailer` actualizado a 10.1.7. `moment` en mantenimiento. `axios` y `uuid` retirados: `fetch` y `crypto.randomUUID()` nativos. Falta `"engines": { "node": ">=24" }`. |
| Frontend | Sin vulnerabilidades | Todo al día. Ver FRO-10 (tamaño). |

---

## 7. Configuración y despliegue

- **Secretos:** ninguno versionado. `.env`, `configThirdParty.json` y `database.json` están en `.gitignore` y en el historial solo aparecen los `.sample` (comprobado con `git log --all` sobre los 100 commits).
- **TLS:** ver SEG-05. El VirtualHost actual es temporal por IP; el certificado debe emitirse con webroot cuando el DNS de `prt.keytergroup.com` apunte a `185.79.30.101`.
- **Zona horaria:** ver DAT-09; fijar `TZ` en `ecosystem.config.js`.
- **PM2:** el proceso se llama `KG_00_BackEnd` en `ecosystem.config.js` y `KG_00_Backend` en `CLAUDE.md`. `KG_01_FrontEnd` sobra (OPE-09).
- **Tests y CI:** no hay ningún test (cobertura nula) ni integración continua. Prioridad: `Booking.validate`, `validRange` y `rejectOverlapping` (casos de DAT-04, DAT-05, DAT-06) y los permisos de `editBooking`; un *workflow* que ejecute `pnpm run lint` y los tests en cada PR.

---

## 8. Información y descartados

- **bcrypt:** `hashSync(pwd, 0)` **no** usa coste 0: bcryptjs 3.0.3 lo sustituye por 10 (comprobado: el hash empieza por `$2b$10$`). Es engañoso; conviene poner 12 explícito y usar la versión asíncrona, porque `hashSync` bloquea el event loop.
- **Asignación masiva:** descartada. Todos los `SET ?` usan objetos de lista blanca y `updateUser` filtra con `ALLOWED_FIELDS`.
- **Inyección por objetos (`{"mail":1}`):** descartada; mysql2 3.24.6 convierte objetos en `'[object Object]'`.
- **XSS en el frontend:** no hay `v-html`, `innerHTML` ni `eval`; Vue escapa todas las interpolaciones.
- **Código muerto restante:** `version.version_compare` (`utils/version.js`), `app.set('port')`, comentarios de código en `user.js`.
- **Estilo:** 41 ficheros del backend y 37 del frontend con `;` heredados (aceptado por `CLAUDE.md`); comentarios en inglés en `legacyRoom.js`, `booking.js`, `useSyncStore.js` y `useConfigStore.js`.

## Corregido durante la auditoría

**Fase 0 (20/10/2026)**, probado contra la API local con usuarios temporales:

- **SEG-01** — `LegacyRoom.read` usa `?`; `ApiRoomMiddleware` valida el formato UUID (404 si no lo es); `checkToken` rechaza tokens vacíos y salas sin `api_token`, y compara con `crypto.timingSafeEqual`. **Antes de desplegar:** en desarrollo 43 de 44 salas no tienen `api_token`; sus pantallas responderán 403 hasta que se les asigne uno (`UPDATE rooms SET api_token = ? WHERE uuid = ?`).
- **SEG-02** — `GET /users/:uuid` exige `UserEditMiddleware` (Admin o el propio usuario). `User.read()` ya no selecciona `password`; solo `readWithPassword()` lo hace, para `login` y `checkPassword`. El login quita el hash antes de guardar la sesión, espera a Redis y exige que correo y contraseña sean texto (cierra SEG-18 y OPE-10).
- **SEG-03** — Tokens con `crypto.randomBytes(32)` (`base64url`, 43 caracteres). Contraseña inicial de 12 caracteres con `crypto.randomInt` y barajado Fisher-Yates.
- **SEG-04** — Tokens de recuperación en un espacio de claves propio (`reset.<hash>`, solo con el uuid), de un solo uso y uno vivo por usuario. `reset-password` ya no pasa por `AuthMiddleware`: solo acepta ese token (en el body), exige 8 caracteres y rechaza usuarios deshabilitados. Nuevo `POST /password-reset/check` para el guard del frontend, que ya no toca el token de la sesión abierta (cierra SEG-21).

**Altas (20/10/2026)**, probado contra la API local con usuarios temporales y en el navegador con datos simulados:

- **SEG-03** — En Redis solo se guarda el SHA-256 del token, tanto de sesión como de recuperación (`utils/sessions.js`, `utils/userToken.js`); ni la clave ni el valor contienen el token. **Al desplegar, las sesiones abiertas dejan de valer** (se guardaban con el token en claro) y cada usuario tendrá que iniciar sesión una vez.
- **SEG-04** — Cambiar la contraseña (recuperación o Mi cuenta) cierra todas las sesiones del usuario mediante el índice `sessions.<uuid>`. El enlace del correo lleva el token en el fragmento (`/reset-password#token=…`), que no llega al servidor ni al `Referer`, y la vista lo borra de la barra de direcciones al leerlo.
- **SEG-05 (parcial)** — El backend escucha en `127.0.0.1` por defecto (`HOST` en `.env`). Falta el certificado: ver [Despliegue HTTPS](#despliegue-https).
- **SEG-07** — `log-out` usa el token de la cabecera; se cierran todas las sesiones al cambiar rol o empresa (solo si cambian de verdad) o al deshabilitar al usuario. Las sesiones caducan el domingo de su semana a las 23:59:59 (hora de Madrid, independiente de la zona del servidor), y `AuthMiddleware` y `load-session` leen rol, empresa y estado de la BD en cada petición (`User.refreshSession`), así que un cambio de permisos se aplica en la siguiente petición.
- **DAT-01** — Nueva utilidad `frontend/src/utils/dates.js` (fechas `YYYY-MM-DD` en hora local). El calendario pide la semana correcta (del 19 al 25, antes del 18 al 24).
- **DAT-02** — `fetchBookings()` sin parámetros reutiliza el rango visible; la sincronización no pide nada si aún no hay rango, y se descartan las respuestas que llegan tarde.
- **DAT-03** — `DateSelectionModal` calcula los días en hora local; verificado que cada botón corresponde a su fecha también tras el cambio de hora.
- **DAT-04** — `Booking.set()` normaliza las fechas a `YYYY-MM-DD` (desde `Date`, ISO o texto); la validación solo acepta ese formato y comprueba que el día exista (V8 convierte el 31 de febrero en el 3 de marzo). Aprobar o rechazar sin mover la reserva no exige que siga en el futuro, y una reserva que pasa a rechazada no compite por la sala.
- **DAT-05** — Una reserva es una franja dentro del día, igual que la interpreta `validRange`: la hora de fin debe ser posterior a la de inicio.
- **FRO-01** — Celdas y reservas del calendario enfocables con Tab, activables con Intro o Espacio, con etiqueta accesible (sala, día, hora y título) y anillo de foco.
- **FRO-02** — «Volver» y «Cerrar» son botones con `aria-label` en los cinco modales del asistente; Esc cierra todos los diálogos de reserva, incluido el de detalle.
- **FRO-05** — «Hoy» en hora local y reactivo con `useToday()`: el calendario abierto pasa de día a medianoche sin recargar.

**Otros:**

- **`load-session` no invalidaba a los usuarios deshabilitados** (`backend/src/models/user.js`): Redis devuelve la sesión como texto JSON, así que `user.uuid` era `undefined` y la comprobación nunca se ejecutaba. Se parsea antes de comprobar y se mantiene el texto en la respuesta, que es lo que espera el frontend. Verificado con un usuario temporal: deshabilitado → `403` sin pasar por `AuthMiddleware`; activo → `200`.

---

## 9. Plan de acción

**Fase 0 — inmediato (horas)** · 3 hechos, 1 parcial
- ✅ SEG-01: parametrizar `LegacyRoom.read`, validar el uuid y rechazar tokens vacíos.
- ✅ SEG-02: proteger `GET /users/:uuid` y quitar `password` de `read()`.
- ✅ SEG-03 + SEG-04: tokens con `crypto` y hasheados en Redis, tokens de recuperación separados, de un solo uso y fuera de la URL, cierre de sesiones al cambiar la contraseña.
- 🟡 SEG-05: backend en `127.0.0.1` hecho; falta el certificado HTTPS cuando el DNS esté migrado.

**Fase 1 — una o dos semanas** · en curso
- ✅ Fechas: DAT-01, DAT-03, DAT-04, DAT-05, FRO-05 (utilidad común `utils/dates.js`). ⬜ DAT-09.
- ✅ DAT-02: sincronización con el rango visible. ⬜ Rango obligatorio en el backend (pendiente de confirmar que no rompe a las apps de terceros).
- ⬜ DAT-06 + DAT-07: transacción con bloqueo por sala y rechazos coherentes.
- ⬜ SEG-06 (rate limiting), SEG-11 (CORS), SEG-12 (helmet), OPE-08 (`db-migrate` en `dependencies`).
- ⬜ OPE-01 y OPE-02: comprobación de errores y formato de respuesta único.
- ✅ FRO-01, FRO-02: teclado en el calendario y cierre de diálogos. ⬜ FRO-03: esperar las acciones.

**Fase 2 — este trimestre** · pendiente
- ✅ SEG-07 (modelo de sesión). ⬜ SEG-08, SEG-09: permisos de terceros y alta de usuarios sin contraseña por correo.
- OPE-03 a OPE-07: timeouts, cliente Redis único, apagado ordenado, pool y logger.
- FRO-08 a FRO-12: `text-field`, clases de Vuetify 4, bundle, contraste y etiquetas.
- Tests de reservas y permisos, y CI con lint y tests.

**Fase 3 — mantenimiento** · pendiente
- Refactor del asistente de reserva (FRO-19, FRO-20), tema de Vuetify (FRO-21), migración de esquema (BD-01 a BD-03, DAT-10, OPE-12) y el resto de hallazgos bajos.

---

## Despliegue HTTPS

Pendiente para cerrar SEG-05. Se hace en el servidor nuevo (`185.79.30.101`, Ubuntu 24.04, Apache + PM2) en cuanto `prt.keytergroup.com` apunte a él (hoy apunta a `185.79.31.96`). Se da por hecho que los datos ya están en `kg_portal` y el backend viejo está parado.

1. **Comprobar el DNS.** `dig +short prt.keytergroup.com` debe devolver `185.79.30.101`; si no, certbot falla.

2. **Preparar Apache, firewall y certbot** (solo la primera vez). Los puertos `3445` y `9445` no se abren: solo se llega a ellos por Apache.

   ```bash
   sudo apt update && sudo apt install -y certbot
   sudo a2enmod ssl headers proxy proxy_http rewrite
   sudo ufw allow 'Apache Full'
   ```

3. **Emitir el certificado** con webroot. El certificado del servidor viejo no lo impide.

   ```bash
   sudo mkdir -p /var/www/letsencrypt
   sudo certbot certonly --webroot -w /var/www/letsencrypt -d prt.keytergroup.com --deploy-hook "systemctl reload apache2"
   ```

4. **VirtualHost** en `/etc/apache2/sites-available/prt.keytergroup.com.conf`: el `:80` solo redirige (salvo el reto ACME) y el `:443` sirve `dist/` y hace de proxy a la API. Si el frontend se sirve hoy de otra forma (`ProxyPass` a `9445`), se lleva tal cual al `:443`.

   ```apache
   <VirtualHost *:80>
     ServerName prt.keytergroup.com
     Alias /.well-known/acme-challenge/ /var/www/letsencrypt/.well-known/acme-challenge/
     <Directory /var/www/letsencrypt>
       Require all granted
     </Directory>
     RewriteEngine On
     RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
     RewriteRule ^ https://prt.keytergroup.com%{REQUEST_URI} [R=301,L]
   </VirtualHost>

   <VirtualHost *:443>
     ServerName prt.keytergroup.com

     SSLEngine on
     SSLCertificateFile    /etc/letsencrypt/live/prt.keytergroup.com/fullchain.pem
     SSLCertificateKeyFile /etc/letsencrypt/live/prt.keytergroup.com/privkey.pem
     # Valor bajo hasta verificar; después 31536000
     Header always set Strict-Transport-Security "max-age=300"

     ProxyPreserveHost On
     ProxyPass        /api/ http://127.0.0.1:3445/api/
     ProxyPassReverse /api/ http://127.0.0.1:3445/api/

     DocumentRoot /var/www/KG_PORTAL/frontend/dist
     <Directory /var/www/KG_PORTAL/frontend/dist>
       Require all granted
       FallbackResource /index.html
     </Directory>
   </VirtualHost>
   ```

   ```bash
   sudo apache2ctl configtest && sudo systemctl reload apache2
   ```

5. **URLs en https.** En `backend/.env`, `FRONTEND_CLIENT` y `APP_URL` a `https://prt.keytergroup.com`; en `frontend/.env`, `VITE_API_URL` a `https://prt.keytergroup.com/api/`.

6. **Recompilar y recargar.** `VITE_API_URL` va incrustada en el build: sin recompilar, el frontend sigue llamando a la URL anterior. Nunca `pm2 restart all` (afecta a Client360).

   ```bash
   cd /var/www/KG_PORTAL && pnpm run deploy
   pm2 reload /var/www/KG_PORTAL/ecosystem.config.js --update-env && pm2 save
   ```

7. **Comprobar.**

   ```bash
   curl -I http://prt.keytergroup.com                      # 301 a https
   curl -I https://prt.keytergroup.com                     # 200 con Strict-Transport-Security
   curl https://prt.keytergroup.com/api/system/version
   sudo certbot renew --dry-run
   systemctl list-timers | grep certbot
   ```

   En el navegador: inicio de sesión y calendario, y el enlace de recuperación de contraseña debe empezar por `https://`. Las pantallas de sala deben llamar a `https://` (no todas siguen el 301) y cada sala necesita su `api_token` (SEG-01). Confirmar que las apps de terceros siguen recibiendo los avisos.

8. **Retirar el servidor viejo** pasados unos días: `pm2 stop <nombre> && pm2 save` de sus procesos de KG Portal, `sudo certbot delete --cert-name prt.keytergroup.com` para que no intente renovar, y su base de datos se conserva como respaldo hasta confirmar que todo va bien.

---

## Anexo: endpoints y protección

| Endpoint | Middleware | Comprobación en el controlador | Hallazgos |
|---|---|---|---|
| `POST /users/sign-in` | — | — | SEG-06, SEG-15, SEG-18 |
| `POST /users/load-session` | — | token del body | SEG-04 |
| `POST /users/log-out` | Auth | borra el token del body | SEG-07 |
| `GET /users` | Auth + Admin | sin `password` | — |
| `POST /users` | Auth + Admin | rol Admin | SEG-09 |
| `GET /users/:uuid` | **solo Auth** | **ninguna** | **SEG-02** |
| `PUT /users/:uuid` | Auth + UserEdit | lista blanca; contraseña propia con la actual; rol solo Admin | SEG-16 |
| `PUT /users/:uuid/status` | Auth + Admin | no a sí mismo | — |
| `POST /password-reset/request-password-reset` | — | — | SEG-06, SEG-15 |
| `PUT /password-reset/reset-password` | Auth (**cualquier token**) | **sin contraseña actual** | **SEG-04** |
| `GET /bookings`, `GET /bookings/:uuid` | Auth | ninguna | SEG-20, DAT-02 |
| `POST /bookings`, `POST /bookings/bulk` | Auth | estado decidido en servidor | DAT-04 a DAT-07, DAT-14 |
| `PUT /bookings/:uuid` | Auth | dueño, Admin o Gestor sobre `Approved`; estado solo Admin | SEG-10, DAT-15, DAT-17 |
| `DELETE /bookings/:uuid` | Auth | ídem | OPE-01 |
| `GET /rooms…`, `GET /facilities…`, `GET /tenants`, `GET /system/version` | Auth | — | — |
| `POST/PUT/DELETE /rooms…`, `/facilities…` | Auth + Admin | — | DAT-11, BD-03 |
| `GET /v0/rooms/:uuid` | ApiRoom (`api_token`) | — | **SEG-01**, DAT-08 |
