# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Visión general del proyecto

KG Portal es el portal interno del grupo KEYTER (Keyter, Intarcon, Genaq, KIO, Kiconex): reserva de salas de reuniones, Recepción (visitas sobre Odoo; Llamadas pendiente) y roles con permisos por módulo. Monorepo con dos servicios independientes:

- **`/backend`**: API Node.js 24 + Express 5 (MySQL, Redis, Nodemailer, Socket.IO, Odoo JSON-2)
- **`/frontend`**: SPA Vue 3 + Vite 8 + Vuetify 4 + Pinia + Vue Router 5 + Socket.IO client

Cada servicio se despliega por separado con PM2 (`ecosystem.config.js` en la raíz). Gestor de paquetes: **pnpm@12.14.0**. No hay workspace raíz: cada servicio tiene su `package.json`, su `pnpm-lock.yaml` (versionado) y su `pnpm-workspace.yaml` (`allowBuilds`).

## Cómo se responde

- **Un único resumen final, breve y profesional**: qué fallaba, por qué, qué se ha cambiado
  (ficheros clave) y cómo se verifica. Sin listas kilométricas, sin repetir el código ya entregado y sin
  «próximos pasos» que nadie ha pedido.

## Comentarios en el código

**Cortos y profesionales: una línea, dos como mucho.** Di qué hace o por qué es así, y nada más.
Nada de narrar el historial («antes pasaba que…»), justificarse, dramatizar ni repetir lo que el
código ya dice. Las cabeceras de fichero, 1-3 líneas: nunca párrafos ni listas de viñetas. Si un
detalle necesita más explicación, va en `/docs`, no en el fichero.

## Idioma y nombres

- **Español**: texto de la UI, mensajes de la API al usuario, comentarios y documentación.
- **Inglés**: funciones, variables, constantes, claves de objeto y campos nuevos de la API (`createBulkBookings`, `needsValidation`, `BOOKING_STATUS`).
- Los valores de `ROLES` (`Admin`, `Gestor`, `User`) y `BOOKING_STATUS` (`Pending`, `Approved`, `Rejected`) se guardan tal cual en BD: no se traducen ni se renombran.

## Estilo de código

Código nuevo **sin `;`**, comillas simples (dobles solo en plantillas o si hace falta), `if` de una sola acción en una línea y sin llaves, y lógica relacionada compacta. Parte del código existente usa `;` y comillas dobles: no se reformatea un fichero entero de paso, solo lo que se escribe o se reescribe.

## Documentación

**Todo documento `.md` va en `/docs`.** Las únicas excepciones son `README.md` y este `CLAUDE.md`.
Hoy hay dos: `docs/MIGRACION-BD-KG_PORTAL.md` (paso de la base antigua a `kg_portal`, pendiente en el servidor) y `docs/AUDITORIA-2026-10.md` (hallazgos de seguridad, datos y calidad con su plan de acción). Los documentos de trabajo se quedan hasta que su contenido esté hecho.

## Comandos

`deploy` es también un comando propio de pnpm: el script se lanza SIEMPRE con `pnpm run deploy`.

### Raíz
```bash
pnpm run lint          # ESLint backend + frontend (corre los dos; sale 1 si alguno falla)
pnpm run install:all   # install en backend y frontend
pnpm run deploy        # deploy del backend y luego del frontend (aborta si falla el backend)
pnpm run clean         # borra node_modules, builds, cachés y logs (no los lockfiles) y hace el deploy
pnpm run bump-version  # sube VERSION (AAAA.MM.N); --dry solo muestra la siguiente
```

### Backend (`/backend`)
```bash
pnpm run dev           # nodemon src/index.js
pnpm run prod          # node src/index.js (PM2: KG_00_Backend)
pnpm run migrate       # db-migrate up
pnpm run migrate:down  # revierte la última migración
pnpm run lint
pnpm run deploy        # install --frozen-lockfile + migrate
```

### Frontend (`/frontend`)
```bash
pnpm run start         # Vite dev en :3000
pnpm run build         # dist/
pnpm run prod          # vite preview en :9445 (PM2: KG_01_Frontend)
pnpm run lint
pnpm run deploy        # install --frozen-lockfile + build
```

`deploy` no reinicia procesos: en producción va seguido de `pm2 reload ecosystem.config.js --update-env`.

### Versiones

La versión del portal vive **solo** en el fichero `VERSION` de la raíz, con formato `AAAA.MM.N` (N es la entrega dentro del mes). El backend la lee al arrancar y la sirve en `GET /api/system/version`; el frontend la incrusta al compilar (`import.meta.env.VITE_APP_VERSION`) y la muestra en el menú de usuario. Cada entrega se sube con `pnpm run bump-version` antes del deploy; los `package.json` no llevan versión.

## Configuración del entorno

Ninguno de estos ficheros se versiona; cada uno tiene su `.sample`:

- **`backend/.env`**: `PORT` (3445 en local y en producción; 3443 y 3444 son de Client360 e IntarLAB), `FRONTEND_CLIENT` (origen CORS), MySQL (`DB_*`), Redis (`REDIS_HOST`, `REDIS_PORT`, `REDIS_USER` y `REDIS_PASS` de su ACL, vacíos en local; `SECRET_KEY_CACHE=kg_portal` como prefijo propio, porque Redis es compartido), `APP_URL` (enlaces de los correos), SMTP (`smtp.intarcon.es:465`, `SMTP_SECURE=true` como texto) y Odoo (`ODOO_HOST`, del que solo se usa el origen; `ODOO_DB`, `ODOO_API_KEY`, `ODOO_COMPANY_ID`, `ODOO_TIMEOUT_MS`). Las credenciales las pone el usuario: no se copian claves entre ficheros.
- **`backend/database.json`**: conexión de `db-migrate` (entorno `dev`) con `{ "ENV": ... }`: lee las credenciales del `.env`, no se duplican.
- **`frontend/.env`**: `VITE_API_URL`, URL base del backend **con `/api/` al final**.

## Arquitectura

### Backend: Ruta → Controlador → Modelo

- `src/index.js` monta la app de `src/app.js` bajo `/api`.
- **Rutas** (`src/routes/`): `rooms`, `facilities`, `users`, `roles`, `tenants`, `bookings`, `reception`, `system`, `password-reset` y `v0/rooms`. Sin lógica: solo middlewares y controlador.
- **Controladores** (`src/controllers/`, `*_ctrl.js`): objetos `const xCtrl = {}` con la validación de permisos y la respuesta HTTP.
- **Modelos** (`src/models/`): clases instanciadas con un uuid (`new Booking(uuid, userUuid)`) con `set`, `get`, `read`, `list`, `create`, `update` y `delete`, y SQL raw vía `mysqlAdapter.query()`. `models/Legacy/` es el modelo de las pantallas de sala.
- **Transacciones**: `mysqlAdapter.runInTransaction(async () => { ... })` guarda la conexión en `AsyncLocalStorage`; todo `query()` dentro del callback usa esa conexión. Si el callback lanza, rollback.

**SQL siempre con parámetros `?`**. Nunca interpolar valores en el SQL, aunque vengan de BD.

### Autenticación y roles

- `POST /api/users/sign-in` crea un token aleatorio y guarda el usuario en Redis bajo su hash; la sesión caduca el domingo de esa semana a las 23:59:59 (hora de Madrid). El cliente lo envía como `Authorization: Basic <token>`; `POST /users/load-session` restaura la sesión al recargar.
- `AuthMiddleware` (`middlewares/authMiddleware.js`) busca el token en Redis y deja el usuario en `res.locals.user`; si no está, responde 401. No hay tokens de terceros: la sincronización de reservas con la API de INTARCON (`configThirdParty.json`) se retiró el 27/10/2026.
- **La identidad sale siempre de `res.locals.user`**, nunca del body.
- Roles (`src/utils/constants.js`, duplicado en `frontend/src/utils/constants.js`: mantenerlos iguales): `Admin`, `Gestor`, `User`. Cada usuario pertenece a un tenant (`tenants`). **El código no compara con `Gestor` ni `User`: todo va por permisos.** Solo se mira `Admin`, que lo tiene todo y es el único que gestiona roles, asigna permisos y cambia el rol de un usuario (`AdminMiddleware`).
- **Roles** (tabla `roles`, pantalla Administración › Roles y permisos, `/api/roles`): `users.role` guarda el `code` del rol (FK) tal como está en `roles`: MySQL compara sin mayúsculas y el código JS no, así que se normaliza con `Role.codeOf`. `Admin`, `Gestor` y `User` son de sistema: no se borran ni renombran. El Gestor lleva por defecto `bookings.auto_approve`, `bookings.manage`, `users.manage` y `users.view`. Un rol solo se borra sin usuarios. Leer los roles basta con `users.view`.
- **Usuarios por permiso** (`user_ctrl.canManage`): `users.view` ve los de su empresa; `users.manage` crea, edita y habilita a los de su empresa que no sean Admin ni tengan `users.manage`, sin elegir rol (crea como `User`) ni empresa; `users.all_companies` amplía a todas las empresas y deja cambiarla. Uno mismo puede editar su nombre, correo y contraseña, pero no su rol (tampoco el Admin) ni su empresa. `checkData` valida tipos y formato (nombre y correo hasta 100 caracteres, correo con formato, contraseña de 8 como mínimo) y recorta espacios. Si el correo con la contraseña no sale, el alta se deshace (502).
- **Permisos por módulo** (`modulo.accion`: `calls.view`, `visits.manage`…): los efectivos son los del rol (`role_permissions`, por defecto para todos sus usuarios) más los propios (`user_permissions`), y el Admin los tiene todos. El catálogo vive solo en `backend/src/utils/permissions.js` (`requires` añade los implícitos) y el frontend lo pide a `GET /users/permissions`. Backend: `can('calls.view')` de `authMiddleware.js` tras `AuthMiddleware`; frontend: `meta.permission` en la ruta con `permissionGuard`, y `can`/`canAny` de `utils/permissions.js`. Se leen de BD en cada petición (`refreshSession`): cambiarlos no cierra sesiones. Solo el Admin los asigna; `models/grants.js` sustituye la lista completa de un usuario o rol.
- **Los usuarios no se borran nunca** (sus reservas dependen de ellos): se deshabilitan con `active = 0` vía `PUT /users/:uuid/status`. Un usuario deshabilitado no inicia sesión ni recupera la contraseña, y `AuthMiddleware` y `load-session` invalidan sus sesiones abiertas.
- **Tokens**: `crypto.randomBytes` (`utils/userToken.js`); nunca `Math.random` para nada sensible. `User.read()` no devuelve el hash: solo `readWithPassword()`, para `login` y `checkPassword`.
- **Sesiones** (`utils/sessions.js`): en Redis se guarda el SHA-256 del token (`<SECRET>:<hash>`), nunca el token; `sessions.<uuid>` indexa las de cada usuario. Rol, empresa y estado se leen de la BD en cada petición (`User.refreshSession`): la sesión solo identifica al usuario. Cambiar contraseña, rol o empresa, o deshabilitar al usuario, cierra todas con `sessions.destroyAll`.
- **Recuperación de contraseña**: `request-password-reset` crea un token de 10 minutos en un espacio de claves propio (`<SECRET>.reset.<hash>`, solo con el uuid; uno vivo por usuario) y envía `APP_URL/reset-password#token=...` (en el fragmento: no llega al servidor). **No es una sesión**: `AuthMiddleware` no lo acepta. `POST /password-reset/check` lo valida y `PUT /password-reset/reset-password` (token en el body) cambia la contraseña, lo consume y cierra las sesiones abiertas.
- **Fechas en el frontend**: siempre con `utils/dates.js` (`toDateKey`, `todayKey`, `parseDateKey`), en hora local; en componentes, `useToday()` para que «hoy» cambie a medianoche. Nunca `toISOString()` para obtener una fecha.

### Reservas

- Estados: `Pending`, `Approved`, `Rejected`. Se aprueban solas con `bookings.auto_approve` o si la sala no tiene `needsValidation`.
- `Booking.validate()`: campos obligatorios, formatos `YYYY-MM-DD` y `HH:MM`, título ≤ 255, nada en el pasado y sin solape (`validRange`) con una `Approved` o con una `Pending` del mismo usuario.
- Al aprobar, `rejectOverlapping()` pasa a `Rejected` las `Pending` que se solapan y `utils/bookingHelper.js` avisa por correo a sus autores.
- Editar y borrar (`booking_ctrl.canTouch`): el dueño; con `bookings.validate`, cualquiera; con `bookings.manage`, las `Approved` de otros. Sin límite de empresa, como antes de los permisos (el frontend manda `filter_tenant`, pero el backend no lo aplica). Solo `bookings.validate` cambia el estado. Al editar con `bookings.auto_approve` o `bookings.validate` se conserva el estado; sin ellos, en sala con validación vuelve a `Pending`. Salas y edificios se gestionan con `rooms.manage` (solo API).
- **Aprobar o rechazar envía correo al autor**, y en local el SMTP es real: en pruebas, no cambiar el estado de reservas de otras personas.
- `POST /bookings/bulk` crea en bloque dentro de `runInTransaction`: o entran todas o ninguna. Los errores de validación se lanzan con `isValidationError` para responder 400.

### Recepción: visitas

- Viven en Odoo, no en MySQL: `x_visita` (cabecera) y `frontdesk.visitor` (una ficha por persona). Lógica en `utils/visitsOdoo.js`, rutas en `routes/reception.js` (`/api/reception/visits…` y `/visitors…`; `visits.view` para leer, `visits.manage` para escribir) y pantalla `views/reception/visits-view.vue` con sus piezas en `components/reception/`.
- **Las escrituras son reales**: las reglas de Odoo 187/188/195/196 mandan la información previa, la firma y el aviso al anfitrión. Las acciones de `frontdesk.visitor` (`action_check_in`, `action_check_out`, `action_canceled`) solo admiten un registro por llamada: van de uno en uno.
- Tras cada escritura, `visit_ctrl` deja una línea `[VISITAS]` en la consola (pm2) y emite `visits:changed` a la sala `visits` para que los demás puestos recarguen; además la pantalla recarga cada minuto (lo que entra por el kiosco de Odoo no avisa).
- Fechas de Odoo en UTC (`YYYY-MM-DD HH:mm:ss`); se muestran en hora de Madrid con `utils/visits.js` del frontend. Lo que llega sin zona al backend es hora de Madrid.
- Los anfitriones no muestran todavía su estado de presencia (apps de móvil y PC de Client360): pendiente de decidir dónde vive la presencia (AO-58).

### Integraciones

- **Pantallas de sala** (`GET /api/v0/rooms/:uuid`, `ApiRoomMiddleware`): autenticadas con el `api_token` de la sala en `Authorization` (sin `Basic`). Devuelven sala, color (entero), fecha y hora del servidor, reunión actual y siguiente. Contrato heredado: no cambiar el formato sin actualizar las pantallas.
- **Odoo** (módulos de Recepción): JSON-2 con `fetch` en `connections/odoo.js` (`ODOO_HOST`, `ODOO_DB`, `ODOO_API_KEY`; lanza con `odooStatus`, reintenta solo lecturas) y operaciones con el contexto del portal en `utils/odooAdapter.js` (`search`, `read`, `create`, `call`, `fieldsGet`, `modelId`, `ping`). Las visitas mandan correos: en local, siempre el Odoo de pruebas. `/api/ready` lo vigila como no crítico si está configurado.
- **Tiempo real**: Socket.IO en `src/socket/index.js`, en el mismo puerto bajo `/api/socket.io`. Solo sesiones del portal; cada socket entra en `user:<uuid>` y en la sala de cada módulo que puede ver (`ROOMS`: `calls`, `visits`), recalculadas cada minuto. Se emite con `emitToRoom` / `emitToUser`. En el frontend, `useSocketStore` (conecta `layout.vue`; `on(evento, fn)` devuelve la baja).
- **Correo**: Nodemailer con pool (`connections/mailer.js`) vía `utils/mailerAdapter.js`; plantillas en `utils/emailTemplates/`.
- **Estado** (`GET /api/ready`, `utils/health.js`): ruta pública con el contrato común que lee Servidores (INTARCON
  Tools).
  - Se monta en `app.js` antes de las rutas.
  - Una vigilancia en segundo plano comprueba MySQL, Redis y SMTP (críticos: si caen, 503) y la carpeta de logs; la
    ruta solo lee ese estado.
  - Un servicio nuevo se añade con `watch()` en `startMonitoring`.

### Frontend

- `src/main.js` crea Vuetify (tema fijado a `light`: Vuetify 4 sigue por defecto el del sistema; iconos Font Awesome; locale `es`), Pinia y restaura la sesión (`Auth.loadAuth`) antes de montar.
- Rutas en `src/router/index.js`; guards en `src/router/guard/` con **retorno** (`undefined` deja pasar, una ruta redirige), no el callback `next`, deprecado en Vue Router 5.
- **Todas las llamadas HTTP pasan por `src/model/request.js`** (`new Request({ endpoint, method, body }).http()`, fetch + `VITE_API_URL`). Añade el token y gestiona errores: un 401 limpia la sesión y redirige al login.
- La sesión (`model/auth.js`) se guarda en `localStorage` (`session`) y vive en el store `sessionStore`.
- Stores de Pinia en `src/store/`, exportados desde `store/index.js`. `useSyncStore` refresca las reservas cada minuto y al volver a la pestaña (y el contador de pendientes solo con `bookings.validate`); `useAccessStore` guarda roles y catálogo de permisos; `useSocketStore`, la conexión en tiempo real.
- **Selector de permisos** (`components/forms/user-permissions.vue`), común a la ficha de usuario y a la de rol: buscador sin acentos, «Solo concedidos», módulos agrupados por `group` y plegables, contador, «Conceder / Quitar todo» e interruptor por acción con su `hint`; los heredados del rol salen con la etiqueta ROL y bloqueados. Se monta con `:key` por usuario o rol para empezar limpio.
- Componentes nuevos en `<script setup>` (los base `app-*` y `form-components/` siguen en Options API). Los formularios usan `formField` (etiqueta + campo) y `textField` de `components/form-components/`; notificaciones y versión son `app-notification` y `app-version`. La estructura con sesión es `layout.vue` (barra superior, menú desde `meta.section` de las rutas), las pantallas de acceso usan `auth-layout.vue` y las tablas paginan con `table-pagination.vue` en el slot `#bottom`.
- **Diálogos y formularios**: todo diálogo usa `app-dialog.vue` (`v-model`, `title`, `eyebrow`, `subtitle`, `back`, `closable`, `icon` + `tone` para confirmaciones; slots `#tools` y `#actions`). Su cuerpo lleva `.kg-form`; fuera de un diálogo se pone la clase en el contenedor. Estilos comunes en `src/style/forms.css`: `.kg-row` (dos columnas), `.kg-btn`/`.kg-btn-ghost`/`.kg-btn-danger-ghost`, `.kg-icon-btn`, `.kg-note` y `.kg-summary`. Etiquetas siempre con `formField column`, nunca con el prop `label` de Vuetify. Las fechas, con `dateField` (valor `YYYY-MM-DD`), nunca con `type="date"`.
- **Slots de item en Vuetify 4**: `item` es el objeto original (no hay `item.raw`); el `ListItem` interno es `internalItem`.
- **Autorrelleno del navegador solo en el login**: `textField` lo desactiva por defecto (`autocomplete="off"` y solo lectura hasta el foco, porque Chrome ignora `off` en contraseñas); únicamente `login-view.vue` pasa `username` y `current-password`. Los campos de Vuetify usados directamente llevan `autocomplete="off"`.
- **Sin prefijo `ki`** en código, ficheros ni textos: el producto es «KG Portal» y la base de datos `kg_portal`.
- **Vuetify 4 — nada deprecated**: comprueba la API de la versión instalada (`frontend/node_modules/vuetify/package.json`) antes de usar un prop o componente.

## Trampas conocidas

- **`mysqlAdapter.query` nunca rechaza**: ante error devuelve `{ error: true, errorInfo }`. Comprueba `result.error` antes de usar `result.length` o `result[0]`.
- **`read(filter)` de `Booking` y `Room`**: con `{}` filtra por el uuid de la instancia; con cualquier clave, aunque su valor sea `undefined`, deja de filtrar por uuid y puede devolver la tabla entera.
- **`Booking.list()` excluye `Rejected`** salvo que se pida `status_in`.
- **Express 5**: `router.use(AuthMiddleware)` aplica a todo lo que se declara después en ese router. En `users.js` el middleware va por ruta porque `sign-in` y `load-session` son públicas.
- **Pantallas de sala sin `api_token`**: `ApiRoomMiddleware` responde 403 si la sala no tiene token. Una sala nueva necesita que se le asigne uno antes de configurar su pantalla.
- **Fechas**: el pool MySQL usa `timezone: '+00:00'`; `getCurrentInfoRoom` mezcla la fecha UTC con la hora local del servidor.
- **Probar sin correos**: en local el SMTP y los usuarios son reales, y Odoo escribe de verdad. Para probar permisos o flujos que envían correo, levantar una copia del backend en otro puerto con `SMTP_HOST` apuntando a un SMTP falso local y `ODOO_HOST` a un puerto cerrado, con usuarios temporales (`@example.invalid`) que se borran al terminar.
- **Escrituras concurrentes en reservas** (DAT-06 de la auditoría): validar y escribir no bloquea la sala; dos altas o aprobaciones simultáneas en la misma franja pueden quedar ambas `Approved`.
- **`cacheAdapter`** abre y cierra un cliente Redis por operación (`run`: falla en 3 s, sin reconexión). Sin Redis, `sessions.get` devuelve `{ error }` y `AuthMiddleware` y `load-session` responden **503**, no 401: el frontend solo descarta la sesión ante 401/403 y, ante fallos de red o 5xx, reintenta al arrancar y la conserva.

## Migraciones de base de datos

Base de datos **`kg_portal`**, exclusiva del proyecto: tablas sin prefijo (`tenants`, `users`, `facilities`, `rooms`, `bookings`, `roles`, `role_permissions`, `user_permissions`). `system` es palabra reservada en MySQL 8: en `roles` va siempre entre comillas invertidas o con alias de tabla. `db-migrate` 1.x en `/backend/migrations` con `backend/database.json`. Ejecuta `pnpm run migrate` tras traer cambios de esquema; la primera ejecución con 1.x crea `migrations_state`.

Las migraciones anteriores a `DropKibookingPrefix` usan los nombres antiguos `kibooking_*` y esa migración los renombra. **No se editan migraciones ya aplicadas**: las nuevas usan ya los nombres sin prefijo. El paso al servidor está en `docs/MIGRACION-BD-KG_PORTAL.md`.

### Convención para tablas nuevas

Sin prefijo, relaciones **por `uuid`** y los mismos campos de control que las tablas existentes:

```sql
CREATE TABLE nombre (
  id         int NOT NULL AUTO_INCREMENT,
  uuid       varchar(36) NOT NULL,
  -- ... resto de columnas ...
  create_ts  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uuid (uuid)
) ENGINE=InnoDB
```

- `id` interno, nunca expuesto; `uuid` es el identificador externo (`crypto.randomUUID()` al insertar).
- El campo de modificación es **`updated_ts`** (no `update_ts` como en Client360/IntarLAB): no mezclar.
- Claves ajenas hacia `uuid`, con `ON DELETE CASCADE` cuando el hijo no tiene sentido sin el padre.
