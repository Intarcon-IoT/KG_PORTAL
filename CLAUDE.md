# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Visión general del proyecto

KG Portal es la plataforma interna de reserva de salas de reuniones del grupo KEYTER (Keyter, Intarcon, Genaq, KIO, Kiconex). Monorepo con dos servicios independientes:

- **`/backend`**: API Node.js 24 + Express 5 (MySQL, Redis, Nodemailer)
- **`/frontend`**: SPA Vue 3 + Vite 8 + Vuetify 4 + Pinia + Vue Router 5

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
Hoy hay uno: `docs/MIGRACION-BD-KG_PORTAL.md` (paso de la base antigua a `kg_portal`, pendiente en el servidor). Los documentos de trabajo se quedan hasta que su contenido esté hecho.

## Comandos

`deploy` es también un comando propio de pnpm: el script se lanza SIEMPRE con `pnpm run deploy`.

### Raíz
```bash
pnpm run lint          # ESLint backend + frontend (corre los dos; sale 1 si alguno falla)
pnpm run install:all   # install en backend y frontend
pnpm run deploy        # deploy del backend y luego del frontend (aborta si falla el backend)
pnpm run clean         # borra node_modules, builds, cachés y logs (no los lockfiles) y hace el deploy
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

## Configuración del entorno

Ninguno de estos ficheros se versiona; cada uno tiene su `.sample`:

- **`backend/.env`**: `PORT` (3445 en local y en producción; 3443 y 3444 son de Client360 e IntarLAB), `FRONTEND_CLIENT` (origen CORS), MySQL (`DB_*`), Redis (`REDIS_HOST`, `REDIS_PORT`, `REDIS_USER` y `REDIS_PASS` de su ACL, vacíos en local; `SECRET_KEY_CACHE=kg_portal` como prefijo propio, porque Redis es compartido), `APP_URL` (enlaces de los correos) y SMTP (`smtp.intarcon.es:465`, `SMTP_SECURE=true` como texto).
- **`backend/database.json`**: conexión de `db-migrate` (entorno `dev`) con `{ "ENV": ... }`: lee las credenciales del `.env`, no se duplican.
- **`backend/configThirdParty.json`**: apps externas (`api_token`, `uuid`, `app_url`, `app_token`). Se carga con `require` al arrancar: **obligatorio aunque esté vacío (`{}`)** y sus cambios exigen reiniciar.
- **`frontend/.env`**: `VITE_API_URL`, URL base del backend **con `/api/` al final**.

## Arquitectura

### Backend: Ruta → Controlador → Modelo

- `src/index.js` monta la app de `src/app.js` bajo `/api`.
- **Rutas** (`src/routes/`): `rooms`, `facilities`, `users`, `tenants`, `bookings`, `system`, `password-reset` y `v0/rooms`. Sin lógica: solo middlewares y controlador.
- **Controladores** (`src/controllers/`, `*_ctrl.js`): objetos `const xCtrl = {}` con la validación de permisos y la respuesta HTTP.
- **Modelos** (`src/models/`): clases instanciadas con un uuid (`new Booking(uuid, userUuid)`) con `set`, `get`, `read`, `list`, `create`, `update` y `delete`, y SQL raw vía `mysqlAdapter.query()`. `models/Legacy/` es el modelo de las pantallas de sala.
- **Transacciones**: `mysqlAdapter.runInTransaction(async () => { ... })` guarda la conexión en `AsyncLocalStorage`; todo `query()` dentro del callback usa esa conexión. Si el callback lanza, rollback.

**SQL siempre con parámetros `?`**. Nunca interpolar valores en el SQL, aunque vengan de BD.

### Autenticación y roles

- `POST /api/users/sign-in` crea un token aleatorio y guarda el usuario en Redis (`<SECRET_KEY_CACHE>:<token>`, 30 días). El cliente lo envía como `Authorization: Basic <token>`; `POST /users/load-session` restaura la sesión al recargar.
- `AuthMiddleware` (`middlewares/authMiddleware.js`) busca el token en Redis y deja el usuario en `res.locals.user`; si no está, acepta los `api_token` de `configThirdParty.json` (usuario = su `uuid`, sin rol).
- **La identidad sale siempre de `res.locals.user`**, nunca del body.
- Roles (`src/utils/constants.js`, duplicado en `frontend/src/utils/constants.js`: mantenerlos iguales): `Admin`, `Gestor`, `User`. Middlewares: `AdminMiddleware`, `GestorMiddleware`, `UserEditMiddleware` (Admin o el propio usuario). Cada usuario pertenece a un tenant (`tenants`).
- **Recuperación de contraseña**: `request-password-reset` guarda en Redis un token de 10 minutos y envía el enlace `APP_URL/reset-password?token=...`; `reset-password` lo usa como sesión (pasa por `AuthMiddleware`) y lo borra al cambiar la contraseña.

### Reservas

- Estados: `Pending`, `Approved`, `Rejected`. Se aprueban solas si el usuario es Admin/Gestor o la sala no tiene `needsValidation`.
- `Booking.validate()`: campos obligatorios, formatos `YYYY-MM-DD` y `HH:MM`, título ≤ 255, nada en el pasado y sin solape (`validRange`) con una `Approved` o con una `Pending` del mismo usuario.
- Al aprobar, `rejectOverlapping()` pasa a `Rejected` las `Pending` que se solapan y `utils/bookingHelper.js` avisa por correo a sus autores.
- Permisos de edición y borrado: el dueño, el Admin, o el Gestor solo sobre reservas `Approved`. Solo el Admin cambia el estado; si edita un Admin/Gestor, la reserva queda `Approved`; si edita un `User` en sala con validación, vuelve a `Pending`.
- `POST /bookings/bulk` crea en bloque dentro de `runInTransaction`: o entran todas o ninguna. Los errores de validación se lanzan con `isValidationError` para responder 400.

### Integraciones

- **Apps de terceros** (`utils/thirdPartyService.js`): en salas sin validación, cada alta, cambio o baja se envía por `POST` a `app_url` de cada app con `action` (`insert`, `update`, `delete`) y `Authorization: <app_token>`. Se omite la app cuyo `uuid` originó el cambio; un fallo se registra y no rompe la petición.
- **Pantallas de sala** (`GET /api/v0/rooms/:uuid`, `ApiRoomMiddleware`): autenticadas con el `api_token` de la sala en `Authorization` (sin `Basic`). Devuelven sala, color (entero), fecha y hora del servidor, reunión actual y siguiente. Contrato heredado: no cambiar el formato sin actualizar las pantallas.
- **Correo**: Nodemailer con pool (`connections/mailer.js`) vía `utils/mailerAdapter.js`; plantillas en `utils/emailTemplates/`.

### Frontend

- `src/main.js` crea Vuetify (tema fijado a `light`: Vuetify 4 sigue por defecto el del sistema; iconos Font Awesome; locale `es`), Pinia y restaura la sesión (`Auth.loadAuth`) antes de montar.
- Rutas en `src/router/index.js`; guards en `src/router/guard/` con **retorno** (`undefined` deja pasar, una ruta redirige), no el callback `next`, deprecado en Vue Router 5.
- **Todas las llamadas HTTP pasan por `src/model/request.js`** (`new Request({ endpoint, method, body }).http()`, fetch + `VITE_API_URL`). Añade el token y gestiona errores: un 401 limpia la sesión y redirige al login.
- La sesión (`model/auth.js`) se guarda en `localStorage` (`session`) y vive en el store `sessionStore`.
- Stores de Pinia en `src/store/`, exportados desde `store/index.js`. `useSyncStore` refresca las reservas cada minuto y al volver a la pestaña.
- Componentes nuevos en `<script setup>` (los base `app-*` y `form-components/` siguen en Options API). Los formularios usan `formField` (etiqueta + campo) y `textField` de `components/form-components/`; logo, notificaciones, versión y loaders son `app-logo`, `app-notification`, `app-version` y `app-loader`.
- **Sin prefijo `ki`** en código, ficheros ni textos: el producto es «KG Portal» y la base de datos `kg_portal`.
- **Vuetify 4 — nada deprecated**: comprueba la API de la versión instalada (`frontend/node_modules/vuetify/package.json`) antes de usar un prop o componente.

## Trampas conocidas

- **`mysqlAdapter.query` nunca rechaza**: ante error devuelve `{ error: true, errorInfo }`. Comprueba `result.error` antes de usar `result.length` o `result[0]`.
- **`read(filter)` de `Booking` y `Room`**: con `{}` filtra por el uuid de la instancia; con cualquier clave, aunque su valor sea `undefined`, deja de filtrar por uuid y puede devolver la tabla entera.
- **`Booking.list()` excluye `Rejected`** salvo que se pida `status_in`.
- **Express 5**: `router.use(AuthMiddleware)` aplica a todo lo que se declara después en ese router. En `users.js` el middleware va por ruta porque `sign-in` y `load-session` son públicas.
- **`LegacyRoom.read` interpola el uuid en el SQL**: si se toca, pasarlo a `?`.
- **Fechas**: el pool MySQL usa `timezone: '+00:00'`; `getCurrentInfoRoom` mezcla la fecha UTC con la hora local del servidor.
- **`cacheAdapter`** abre y cierra un cliente Redis por operación; sin Redis, `getRedis` devuelve `{ error }` y `AuthMiddleware` responde 401 a todos.

## Migraciones de base de datos

Base de datos **`kg_portal`**, exclusiva del proyecto: tablas sin prefijo (`tenants`, `users`, `facilities`, `rooms`, `bookings`). `db-migrate` 1.x en `/backend/migrations` con `backend/database.json`. Ejecuta `pnpm run migrate` tras traer cambios de esquema; la primera ejecución con 1.x crea `migrations_state`.

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

- `id` interno, nunca expuesto; `uuid` es el identificador externo (`uuid.v4()` al insertar).
- El campo de modificación es **`updated_ts`** (no `update_ts` como en Client360/IntarLAB): no mezclar.
- Claves ajenas hacia `uuid`, con `ON DELETE CASCADE` cuando el hijo no tiene sentido sin el padre.
