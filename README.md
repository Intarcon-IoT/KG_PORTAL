# KG Portal

Plataforma interna de **reserva de salas de reuniones** del grupo KEYTER: Keyter, Intarcon, Genaq,
KIO y Kiconex comparten salas, calendario y validación de reservas.

Monorepo con **dos servicios independientes** que se despliegan con PM2.

| | Servicio | Stack | Puerto |
|---|---|---|---|
| `frontend/` | SPA | Vue 3 · Vite 8 · Vuetify 4 · Pinia · Vue Router 5 | `3000` dev · `9445` preview |
| `backend/` | API REST | Node 24 · Express 5 · MySQL · Redis · Nodemailer | `PORT` (`.env`, `3445` en local) |

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Requisitos previos](#requisitos-previos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Configuración](#configuración)
5. [Comandos](#comandos)
6. [Dominio: roles y reservas](#dominio-roles-y-reservas)
7. [Integraciones](#integraciones)
8. [Base de datos y migraciones](#base-de-datos-y-migraciones)
9. [Convenciones del proyecto](#convenciones-del-proyecto)
10. [Calidad y dependencias](#calidad-y-dependencias)
11. [Producción](#producción)
12. [Troubleshooting](#troubleshooting)
13. [Documentación](#documentación)

---

## Arquitectura

```text
   ┌──────────────┐                        ┌───────────────────┐
   │   frontend   │  Vue 3 · Vuetify 4     │ pantallas de sala │  GET /api/v0/rooms/:uuid
   │  :3000 / SPA │  Pinia · Router 5      │ (api_token sala)  │  reunión actual y siguiente
   └──────┬───────┘                        └─────────┬─────────┘
          │ Authorization: Basic <token>             │ Authorization: <api_token>
          └─────────────────────┬────────────────────┘
                         ┌──────▼───────┐
                         │   backend    │  Express 5 bajo /api
                         │              │  Winston · Nodemailer
                         └──┬────┬────┬─┘
          ┌─────────────────┘    │    └─────────────────┐
  ┌───────▼──────┐       ┌───────▼──────┐       ┌───────▼───────────┐
  │    MySQL     │       │    Redis     │       │ apps de terceros  │
  │  kg_portal   │       │   sesiones   │       │ configThirdParty  │
  └──────────────┘       └──────────────┘       └───────────────────┘
```

**Cómo se comunican:** el frontend solo habla con `backend/api/*`. Las sesiones viven en Redis, los
datos en MySQL y los correos salen por SMTP. Las apps de terceros reciben las altas, cambios y bajas
de reservas de las salas sin validación, y pueden llamar a la API con su propio token.

### Estructura

```text
KG_PORTAL/
├── backend/                 API Express 5
│   ├── migrations/          db-migrate
│   └── src/
│       ├── index.js         monta app.js bajo /api
│       ├── app.js           cabeceras CORS, body parsers y rutas
│       ├── routes/          rooms · facilities · users · tenants · bookings · system · password-reset
│       │   └── v0/          API de las pantallas de sala
│       ├── controllers/     lógica y respuesta HTTP por dominio
│       ├── models/          clases con SQL raw (Legacy/ = modelo de las pantallas)
│       ├── middlewares/     sesión, roles y token de sala
│       ├── connections/     pool MySQL y transporte SMTP
│       └── utils/           mysqlAdapter · cacheAdapter · bookingHelper · thirdPartyService
│           └── emailTemplates/  alta de usuario, contraseña y estado de reserva
├── frontend/                SPA Vue 3 + Vite
│   └── src/
│       ├── views/           pantallas por ruta (calendario, validación, usuarios, login)
│       ├── components/      calendario, vistas día/semana/mes/agenda, modales y listas
│       ├── store/           stores de Pinia (sesión, reservas, salas, sincronización…)
│       ├── model/           Request (cliente HTTP) y Auth (sesión)
│       └── router/          rutas y guards por rol
├── scripts/                 orquestación del monorepo (lint, deploy, clean)
├── docs/                    toda la documentación .md
└── ecosystem.config.js      PM2 (producción)
```

---

## Requisitos previos

### Herramientas

| Herramienta | Versión | Nota |
|---|---|---|
| **Node.js** | **24.x** | |
| **pnpm** | **12.14.0** | Fijado en `packageManager`. **No usar npm ni yarn** |

Con [Corepack](https://nodejs.org/api/corepack.html) activo, pnpm se ajusta solo a la versión de
`packageManager`. Si no:

```bash
npm install -g pnpm@12.14.0
```

### Servicios externos

Nada de esto arranca con el repo; hay que tenerlo accesible:

- **MySQL**: base de datos `kg_portal`.
- **Redis**: sesiones de usuario y enlaces de recuperación de contraseña.
- **SMTP**: correos de alta de usuario, recuperación de contraseña y estado de las reservas.

Sin MySQL el backend **no arranca** (comprueba la conexión al iniciar). Sin Redis arranca, pero nadie
puede iniciar sesión.

---

## Puesta en marcha

### 1. Instalar

```bash
pnpm run install:all
```

### 2. Crear la configuración local

Cuatro ficheros a partir de sus plantillas. Ninguno se versiona.

**Linux / macOS:**

```bash
cp backend/.env.sample backend/.env && cp backend/database.json.sample backend/database.json && cp backend/configThirdParty.json.sample backend/configThirdParty.json && cp frontend/.env.sample frontend/.env
```

**Windows PowerShell:**

```powershell
Copy-Item backend\.env.sample backend\.env; Copy-Item backend\database.json.sample backend\database.json; Copy-Item backend\configThirdParty.json.sample backend\configThirdParty.json; Copy-Item frontend\.env.sample frontend\.env
```

Rellénalos con lo de [Configuración](#configuración). Si no hay apps de terceros, deja
`configThirdParty.json` como `{}`.

### 3. Migrar la base de datos

```bash
cd backend && pnpm run migrate
```

### 4. Arrancar

Dos terminales:

```bash
cd backend && pnpm run dev
```

```bash
cd frontend && pnpm run start
```

El frontend queda en `http://localhost:3000`. Los usuarios los da de alta un administrador desde
**Administrar Usuarios**; la contraseña inicial llega por correo.

---

## Configuración

### `backend/.env`

| Clave | Para qué |
|---|---|
| `PORT` | Puerto de la API: `3445`. Client360 usa `3443` e IntarLAB `3444` |
| `FRONTEND_CLIENT` | Origen permitido en `Access-Control-Allow-Origin` |
| `DB_HOST` · `DB_USER` · `DB_PASS` · `DB_DATABASE` | MySQL |
| `REDIS_HOST` · `REDIS_PORT` · `REDIS_USER` · `REDIS_PASS` | Redis. Usuario y contraseña de su ACL; vacíos si no tiene (local) |
| `SECRET_KEY_CACHE` | Prefijo de las claves de Redis (`kg_portal`), distinto del de los demás proyectos porque Redis es compartido. **Cambiarlo cierra todas las sesiones** |
| `APP_URL` | URL pública del frontend, para los enlaces de los correos |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` · `SMTP_USER` · `SMTP_PASS` · `SMTP_FROM` | Envío de correo: `smtp.intarcon.es`, `465`, `true` (como texto). `SMTP_FROM` debe ser el buzón de `SMTP_USER` |

### `backend/database.json`

Conexión de `db-migrate` (entorno `dev`). No lleva credenciales: las lee del `.env` con `{ "ENV": "DB_HOST" }`, así que basta con copiar la plantilla.

### `backend/configThirdParty.json`

Una entrada por aplicación externa. **Obligatorio aunque esté vacío** (`{}`): el backend lo carga al
arrancar.

| Campo | Para qué |
|---|---|
| `api_token` | Token con el que la app llama a la API (`Authorization: Basic <api_token>`) |
| `uuid` | Usuario de KG Portal al que se atribuyen sus reservas |
| `app_url` | URL que recibe el `POST` con cada alta, cambio o baja |
| `app_token` | Cabecera `Authorization` que se envía a esa URL |

### `frontend/.env`

| Clave | Para qué |
|---|---|
| `VITE_API_URL` | URL base del backend **con `/api/` al final** (`http://localhost:3445/api/`) |

> **Los ficheros de configuración nunca se suben.** Si añades una clave, añádela también a su
> `.sample` con el nombre como valor.

---

## Comandos

### Raíz — orquestan el monorepo

```bash
pnpm run lint          # ESLint de backend y frontend (corre los dos; sale 1 si alguno falla)
pnpm run install:all   # pnpm install en backend y frontend
pnpm run deploy        # deploy del backend y, si va bien, del frontend
pnpm run clean         # borra node_modules, builds, cachés y logs (NO los lockfiles) y lanza el deploy
pnpm run bump-version  # sube la versión de VERSION (AAAA.MM.N); con --dry solo la muestra
```

La versión del portal está solo en el fichero `VERSION` de la raíz: el backend la sirve en
`GET /api/system/version` y el frontend la incrusta al compilar. Súbela con `bump-version` en cada entrega.

`deploy` es también un comando propio de pnpm: lánzalo siempre como `pnpm run deploy`, nunca
`pnpm deploy`. La lógica está en `scripts/*.js`.

> `deploy` **no reinicia procesos**. En producción hace falta `pm2 reload` después.

### Backend

```bash
pnpm run dev           # nodemon
pnpm run prod          # node src/index.js
pnpm run migrate       # db-migrate up
pnpm run migrate:down  # revierte la última migración
pnpm run lint
pnpm run deploy        # install --frozen-lockfile + migrate
```

### Frontend

```bash
pnpm run start         # Vite dev en :3000
pnpm run build         # build de producción en dist/
pnpm run prod          # previsualiza el build en :9445 (--strictPort: falla si está ocupado)
pnpm run lint
pnpm run deploy        # install --frozen-lockfile + build
```

---

## Dominio: roles y reservas

### Organización

**Tenant** (empresa del grupo) → **usuarios**. **Facility** (instalación, con color propio) →
**salas** (capacidad, `needsValidation` y `api_token` de su pantalla).

### Roles

| Rol | Puede |
|---|---|
| `Admin` | Todo: usuarios, instalaciones, salas y validación de reservas |
| `Gestor` | Sus reservas se aprueban solas; edita y borra reservas **aprobadas** de cualquiera |
| `User` | Reserva, edita y borra lo suyo |

Las rutas de administración están protegidas en los dos lados: middlewares en el backend
(`AdminMiddleware`, `UserEditMiddleware`) y guards en el frontend (`adminGuard`).

### Ciclo de una reserva

```text
            sala con needsValidation y usuario User
  alta ─────────────────────────────────────────────►  Pending ──► Approved / Rejected (Admin)
    │                                                       ▲
    └── Admin, Gestor o sala sin validación ──► Approved ───┘ rechaza las Pending que se solapan
```

- Al **aprobar**, las `Pending` que se solapan en la misma sala pasan a `Rejected` y sus autores
  reciben un correo.
- No se aceptan reservas en el pasado ni solapadas con una aprobada (o con una pendiente del mismo
  usuario).
- Si un `User` edita una reserva de una sala con validación, vuelve a `Pending`.
- La **reserva en bloque** (`POST /api/bookings/bulk`) va en una transacción: o entran todas o
  ninguna.

---

## Integraciones

### Pantallas de sala (`/api/v0`)

Cada sala tiene un `api_token` para su pantalla de puerta:

```text
GET /api/v0/rooms/:uuid
Authorization: <api_token de la sala>
```

Devuelve el nombre y color de la sala, la fecha y hora del servidor, la reunión en curso y la
siguiente del día. Es una API heredada (`models/Legacy/`): su formato no se cambia sin actualizar
las pantallas.

### Apps de terceros

En las salas **sin validación**, cada alta, cambio o baja se envía por `POST` a las apps de
`configThirdParty.json` con un campo `action` (`insert`, `update`, `delete`). La app que originó el
cambio no lo recibe de vuelta. Un fallo de envío se registra y no afecta a la reserva.

---

## Base de datos y migraciones

La base de datos se llama **`kg_portal`** y es exclusiva del proyecto, por eso las tablas no llevan
prefijo. Migraciones con [`db-migrate`](https://db-migrate.readthedocs.io/) 1.x en `backend/migrations/`.

```bash
cd backend && pnpm run migrate
```

**Ejecútalo siempre después de traer cambios**: `pnpm run deploy` lo incluye, un `git pull` no. La
primera ejecución con db-migrate 1.x crea la tabla `migrations_state`.

| Tabla | Contenido |
|---|---|
| `tenants` | Empresas del grupo |
| `users` | Usuarios (`role`, `tenant_uuid`, contraseña con bcrypt) |
| `facilities` | Instalaciones y su color |
| `rooms` | Salas (`needsValidation`, `api_token`) |
| `bookings` | Reservas (fecha y hora de inicio y fin, `status`) |

Las tablas llevan `id` autoincremental, `uuid` como identificador externo y `create_ts` /
`updated_ts`. Se relacionan **por `uuid`**, con borrado en cascada.

Las migraciones antiguas crean las tablas con el prefijo `kibooking_` y `DropKibookingPrefix` lo
quita: así sirven igual para una base nueva y para una existente. No se editan migraciones ya
aplicadas. El paso de la base antigua a `kg_portal` en el servidor está en
[`docs/MIGRACION-BD-KG_PORTAL.md`](docs/MIGRACION-BD-KG_PORTAL.md).

---

## Convenciones del proyecto

### 1. SQL siempre parametrizado

`mysqlAdapter.query(sql, params)` con `?`. **Nunca** se interpolan valores en el SQL, aunque vengan
de la base de datos.

### 2. Ruta → Controlador → Modelo

Rutas sin lógica, controladores con la validación de permisos y la respuesta HTTP, y modelos con el
SQL. Los modelos se instancian con su uuid: `new Booking(uuid).read()`.

### 3. El usuario sale de la sesión

La identidad viene siempre de `res.locals.user` (rellenado por `AuthMiddleware`), nunca del body.

### 4. Frontend: todo por `Request`

Toda llamada HTTP pasa por `src/model/request.js`, que añade el token y gestiona los errores: un
`401` limpia la sesión y vuelve al login.

### 5. Vuetify 4 — tema claro y API vigente

El tema está fijado a `light` en `main.js` (Vuetify 4 sigue por defecto el del sistema y la app solo
está diseñada en claro). Antes de usar un prop, compruébalo en la documentación de la versión
instalada.

---

## Calidad y dependencias

```bash
pnpm run lint
```

Debe salir **0 errores**. Hay avisos preexistentes; no añadas más.

Los `pnpm-lock.yaml` de `backend/` y `frontend/` **están versionados** y los `deploy` usan
`--frozen-lockfile`: si no cuadran con el `package.json`, el deploy falla en vez de resolver otras
versiones. Tras cambiar dependencias, sube el lockfile con el `package.json`.

Las compilaciones nativas permitidas se declaran en `allowBuilds` del `pnpm-workspace.yaml` de cada
servicio.

---

## Producción

Ubuntu + Apache + PM2, en `/var/www/KG_PORTAL`. Comparte servidor con Client360: puertos y
nombres de proceso propios para no pisarlo.

| Proceso PM2 | Ruta | Comando | Puerto |
|---|---|---|---|
| `KG_00_Backend` | `/var/www/KG_PORTAL/backend` | `node src/index.js` (directo, para que le llegue SIGINT) | `3445` |
| `KG_01_Frontend` | `/var/www/KG_PORTAL/frontend` | `pnpm run prod` | `9445` |

Ocupados en el servidor: `3443`/`9443` (Client360), `5000`, `5001`, `8000`, MySQL y Redis. Antes de
cambiar un puerto, compruébalo con `sudo ss -tlnp`. MySQL y Redis están en el mismo servidor.

> Nunca `pm2 delete all` ni `pm2 restart all`: afectan a los procesos de Client360.

### Despliegue

```bash
cd /var/www/KG_PORTAL && pnpm run deploy
```

```bash
pm2 reload /var/www/KG_PORTAL/ecosystem.config.js --update-env && pm2 save
```

> `--update-env` es obligatorio: sin él PM2 no recoge los cambios del `.env`.

### Logs

```bash
pm2 logs KG_00_Backend --lines 200
```

El backend escribe además en `backend/logs/` con rotación diaria (14 días).

---

## Troubleshooting

### El backend no arranca: `Cannot find module '../../configThirdParty.json'`

Falta `backend/configThirdParty.json`. Créalo, aunque sea con `{}`.

### El backend se cae al arrancar con un error de MySQL

`connections/mysql.js` comprueba la conexión al iniciar y lanza el error si falla. Revisa `DB_*` en
el `.env` y que la base sea accesible.

### Todas las peticiones del frontend dan 404

`VITE_API_URL` sin `/api/` al final. El cliente concatena la URL base con el endpoint
(`users/sign-in`).

### Nadie puede iniciar sesión, o todos vuelven al login

Redis no responde o `SECRET_KEY_CACHE` ha cambiado: el backend no encuentra la sesión y responde
`401`, que en el frontend cierra la sesión.

### Los correos no llegan o los enlaces apuntan a otro sitio

Revisa `SMTP_*` (`SMTP_SECURE` es `true` o `false` como texto) y `APP_URL`, que es la base de los
enlaces de recuperación de contraseña.

### Vistas en blanco o errores de columna tras traer cambios

Faltan migraciones:

```bash
cd backend && pnpm run migrate
```

### `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` · «Acceso denegado»

Un `node_modules` a medio borrar. Bórralo a mano y repite:

```bash
rm -rf node_modules && pnpm install
```

---

## Documentación

Toda la documentación `.md` vive en [`docs/`](docs). En la raíz solo están este README y
`CLAUDE.md`.

| Documento | Contenido |
|---|---|
| [`docs/MIGRACION-BD-KG_PORTAL.md`](docs/MIGRACION-BD-KG_PORTAL.md) | Paso de la base antigua a `kg_portal` y tablas sin prefijo (pendiente en el servidor) |

`CLAUDE.md` recoge estas mismas convenciones en el formato que consume
[Claude Code](https://claude.com/claude-code).

---

Software propietario de INTARCON. Uso interno.
