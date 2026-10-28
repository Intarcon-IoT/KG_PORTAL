# Paso de la base de datos a `kg_portal`

> Estado: **pendiente en el servidor**. Borrar este documento cuando producción esté en `kg_portal`.

Dos cambios que van juntos:

1. **Nombre de la base**: de la actual (`DB_DATABASE` del `.env`) a `kg_portal`. MySQL no renombra bases: se crea la nueva y se copian las tablas. Es un paso manual.
2. **Tablas sin prefijo**: `kibooking_tenants`, `kibooking_users`, `kibooking_facilities`, `kibooking_rooms` y `kibooking_bookings` pasan a `tenants`, `users`, `facilities`, `rooms` y `bookings`. Lo hace la migración `DropKibookingPrefix` dentro del `pnpm run deploy`.

El código nuevo solo funciona con las tablas renombradas: hay que desplegarlo todo de una vez.

## Pasos en producción

Sustituye `<base_antigua>` y `<usuario>` por los del `.env` actual.

### 1. Parar el backend y hacer copia

Para el backend de la instalación antigua. Mira su nombre con `pm2 list`: en el servidor de Client360 `00_BackEnd` es el de Client360, no lo pares.

```bash
pm2 stop <backend_antiguo>
```

```bash
mysqldump -u <usuario> -p <base_antigua> > ~/backup_<base_antigua>_$(date +%F).sql
```

### 2. Crear `kg_portal` y copiar las tablas

Se copian las tablas del proyecto y las de control de db-migrate (`migrations` y `migrations_state`), para que no intente repetir migraciones ya aplicadas. La base antigua queda intacta como respaldo.

```sql
CREATE DATABASE kg_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON kg_portal.* TO '<usuario>'@'%';
```

```bash
mysqldump -u <usuario> -p <base_antigua> kibooking_tenants kibooking_users kibooking_facilities kibooking_rooms kibooking_bookings migrations migrations_state | mysql -u <usuario> -p kg_portal
```

Si la base antigua la compartía otro proyecto, revisa antes que `migrations` solo tenga filas de KG Portal.

### 3. Apuntar la configuración a `kg_portal`

- `backend/.env`: `DB_DATABASE=kg_portal`
- `backend/.env`: `PORT=3445`, y `FRONTEND_CLIENT` y `APP_URL` con la URL pública del frontend.
- `backend/.env`: `REDIS_HOST=127.0.0.1` (Redis y MySQL están en el mismo servidor), `REDIS_USER` y `REDIS_PASS` de su ACL, y `SECRET_KEY_CACHE=kg_portal`. Cambiar el prefijo cierra las sesiones abiertas: todos vuelven a iniciar sesión.
- `frontend/.env`: `VITE_API_URL` con la URL pública del backend terminada en `/api/`.
- Apache: virtualhost con `ProxyPass` del frontend a `localhost:9445` y de `/api` a `localhost:3445` con `upgrade=websocket` (tiempo real; Apache 2.4.47+ con `mod_proxy_wstunnel`).
- `backend/.env`: `ODOO_*` con el Odoo de producción, si se activa Recepción. Las visitas envían correos reales.
- `backend/database.json` no cambia: lee `DB_DATABASE` del `.env`. Si en el servidor aún tiene los valores escritos, sustitúyelo por `database.json.sample`.

### 4. Desplegar

La carpeta del servidor también cambia, de `/var/www/kibooking` a `/var/www/KG_PORTAL` (ver `ecosystem.config.js`).

```bash
cd /var/www/KG_PORTAL && git pull && pnpm run deploy
```

`deploy` ejecuta las migraciones pendientes:

- `DropKibookingPrefix` renombra las tablas.
- `AddUserActive` añade `users.active`.
- `CreateRolesAndPermissions` crea `roles`, `role_permissions` y `user_permissions`. También da al Gestor sus permisos por defecto y convierte `users.role` en clave ajena; los roles desconocidos pasan a `User`.

Después arranca los procesos de KG Portal (`KG_00_Backend` y `KG_01_Frontend`); `pm2 start` con el ecosystem solo toca los suyos:

```bash
pm2 start /var/www/KG_PORTAL/ecosystem.config.js && pm2 save
```

Si la instalación antigua estaba en el mismo PM2, bórrala por su nombre (`pm2 delete <nombre>`), nunca con `all`.

### 5. Comprobar

```sql
SHOW TABLES FROM kg_portal;
```

Deben salir `bookings`, `facilities`, `roles`, `role_permissions`, `rooms`, `tenants`, `user_permissions`, `users`, `migrations` y `migrations_state`, y no queda ninguna `kibooking_*`. Inicia sesión y abre el calendario; con un Admin, comprueba que aparece **Administración › Roles y permisos**.

## Vuelta atrás

Con la base antigua intacta basta con devolver `DB_DATABASE` a `<base_antigua>`, desplegar el commit anterior y recargar PM2.

## Entornos locales

Con una base existente: el mismo proceso, o simplemente `pnpm run migrate` si se queda con su nombre actual. Con una base nueva `kg_portal` vacía, `pnpm run migrate` crea las tablas y las renombra.
