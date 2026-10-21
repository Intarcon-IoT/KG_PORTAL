const bcryptjs = require("bcryptjs");
const mysqlAdapter = require("../utils/mysqlAdapter");
const cache = require('../utils/cacheAdapter');
const { createCacheToken, hashToken } = require("../utils/userToken");
const sessions = require('../utils/sessions')
const moment = require("moment");
const logger = require('../utils/logger').init();
const mailerAdapter = require('../utils/mailerAdapter');
const { passwordResetTemplate } = require('../utils/emailTemplates/passwordResetTemplate');
const { newUserTemplate } = require('../utils/emailTemplates/newUserTemplate');

class User {
  constructor(uuid) {
    this.uuid = uuid;
    this.mail = "";
    this.name = "";
    this.password = "";
    this.role = "";
    this.tenant_uuid = "";
  }

  set(data) {
    this.name = data.name;
    this.mail = data.mail;
    this.password = bcryptjs.hashSync(data.password, 0);
    this.role = data.role;
    this.tenant_uuid = data.tenant_uuid;
    return this;
  }

  getData() {
    return {
      uuid: this.uuid,
      name: this.name,
      mail: this.mail,
      password: this.password,
      role: this.role,
      tenant_uuid: this.tenant_uuid
    };
  }

  async create() {
    const data = this.getData();
    const result = await mysqlAdapter.query("INSERT INTO users SET ?", data);
    return result;
  }

  async update(userData = null) {
    const data = userData ?? this.getData();

    if (data.password) {
      data.password = bcryptjs.hashSync(data.password, 0);
    }

    const result = await mysqlAdapter.query('UPDATE users SET ? WHERE uuid = ?', [data, this.uuid]);
    return result;
  }

  // Los usuarios no se borran: se deshabilitan y conservan sus reservas
  setActive(active) {
    return mysqlAdapter.query('UPDATE users SET active = ? WHERE uuid = ?', [active ? 1 : 0, this.uuid])
  }

  async isActive() {
    const access = await this.readAccess()
    return access === null ? null : access?.active === 1
  }

  // Datos de permisos actuales: fila { active, role, tenant_uuid }, false si no existe, null si falla la BD
  async readAccess() {
    const rows = await mysqlAdapter.query('SELECT active, role, tenant_uuid FROM users WHERE uuid = ?', [this.uuid])
    if (rows.error) return null
    return rows[0] || false
  }

  // Aplica a una sesión los permisos actuales de la BD; false si el usuario ya no puede entrar
  static async refreshSession(user) {
    const access = await new User(user.uuid).readAccess()
    if (access === null) return user
    if (!access || access.active !== 1) return false
    return { ...user, role: access.role, tenant_uuid: access.tenant_uuid }
  }

  async list(filter = {}) {
    let sql = "SELECT u.uuid, u.name, u.mail, u.role, u.tenant_uuid, u.active, t.name AS tenant_name FROM users u LEFT JOIN tenants t ON u.tenant_uuid = t.uuid WHERE 1";
    let data = [];
    if (filter.tenant_uuid) {
      sql += " AND u.tenant_uuid = ?";
      data.push(filter.tenant_uuid);
    }
    const rows = await mysqlAdapter.query(sql, data);
    return rows;
  }

  // El hash de la contraseña solo se lee con readWithPassword (login y comprobación de la actual)
  read(filter = {}) {
    return this.select(filter, false)
  }

  readWithPassword(filter = {}) {
    return this.select(filter, true)
  }

  select(filter, withPassword) {
    let data = [];
    let sql = `SELECT uuid, name, mail, ${withPassword ? 'password, ' : ''}role, tenant_uuid, active FROM users WHERE 1`;
    if (Object.keys(filter).length === 0) {
      sql += " AND uuid = ?";
      data.push(this.uuid);
    }
    if (filter.email) {
      sql += " AND mail = ?";
      data.push(filter.email);
    }
    if (filter.tenant_uuid) {
      sql += " AND tenant_uuid = ?";
      data.push(filter.tenant_uuid);
    }

    return mysqlAdapter.query(sql, data);
  };

  async login(email, password) {
    // Sin esto, { email: 0 } coincide con cualquier fila en MySQL
    if (typeof email !== 'string' || !email || typeof password !== 'string') return { login: false, message: "Credenciales no válidas" }
    const result = await this.readWithPassword({ email });

    if (result.error) {
      return { ok: false, message: "Error en la operación" };
    }

    const userStored = result[0];    
    if (!userStored) {
      return { login: false, message: "Usuario no encontrado." };
    } else {
      const check = await bcryptjs.compare(password, userStored.password);
      if (!check) {
        return { login: false, message: "Contraseña incorrecta" };
      }
      if (userStored.active !== 1) return { login: false, message: "Usuario deshabilitado" }

      delete userStored.password
      userStored.start = moment(new Date()).format("YYYY-MM-DD HH:mm:ss")
      const token = await sessions.create(userStored)
      if (!token) return { ok: false, message: "Error en la operación" }

      // El token solo viaja en la respuesta; en Redis queda su hash
      return { login: true, user: { ...userStored, token } }
    }
  }

  // Devuelve la sesión como texto JSON (lo que espera el frontend) con el rol y la empresa actuales
  async loadSession(token) {
    const stored = await sessions.get(token)
    if (stored?.error) return { ok: false, unavailable: true }
    if (!stored) return { ok: false, message: "Token no válido" }
    const user = await User.refreshSession(JSON.parse(stored))
    if (!user) {
      await sessions.destroy(token)
      return { ok: false, message: "Usuario deshabilitado" }
    }
    return { ok: true, user: JSON.stringify(user) }
  }

  async closeSession(token) {
    await sessions.destroy(token)
    return { ok: true };
  }

  async sendPasswordResetEmail(email) {
    const APP_URL = process.env.APP_URL;
    const expirationTime = 600;

    try {
      const userInfoArray = await this.read({ email });
      const userInfo = userInfoArray[0];

      if (userInfo && userInfo.active !== 1) {
        logger.warn(`Password reset requested for disabled user: ${email}`)
      } else if (userInfo) {
        const token = await new User(userInfo.uuid).createResetToken(expirationTime)

        // En el fragmento (#): el navegador no lo envía al servidor ni en el Referer
        const resetLink = `${APP_URL}/reset-password#token=${token}`;
        const template = passwordResetTemplate(
          resetLink,
          Math.floor(expirationTime / 60),
          userInfo.name
        );
        await mailerAdapter.sendMail({ to: email, template });
      } else {
        logger.warn(`Password reset requested for non-existing user: ${email}`);
      }
    } catch (err) {
      logger.error("Password reset error - " + JSON.stringify(err, null, 2));
    }
  }

  // Tokens de recuperación: espacio de claves propio (no valen como sesión), hasheados, un solo uso y uno vivo por usuario
  async createResetToken(expiration) {
    const previous = await cache.getRedis(`reset-user.${this.uuid}`)
    if (typeof previous === 'string') await cache.delRedis(`reset.${JSON.parse(previous)}`)
    const token = createCacheToken()
    await cache.setRedis(`reset.${hashToken(token)}`, { uuid: this.uuid }, false, expiration)
    await cache.setRedis(`reset-user.${this.uuid}`, hashToken(token), false, expiration)
    return token
  }

  static async findByResetToken(token) {
    if (typeof token !== 'string' || !token) return null
    const stored = await cache.getRedis(`reset.${hashToken(token)}`)
    return typeof stored === 'string' ? JSON.parse(stored).uuid : null
  }

  async consumeResetToken(token) {
    await cache.delRedis(`reset.${hashToken(token)}`)
    await cache.delRedis(`reset-user.${this.uuid}`)
  }

  async sendUserCredentialsEmail(password) {
    const loginUrl = process.env.APP_URL ? `${process.env.APP_URL}/login` : undefined
    const template = newUserTemplate(this.name, this.mail, password, loginUrl)
    await mailerAdapter.sendMail({ to: this.mail, template });
  }

  async checkPassword(currentPassword) {
    if (typeof currentPassword !== 'string') return false
    const user = await this.readWithPassword();
    if (!user || user.error || user.length === 0) {
      return false;
    }
    return await bcryptjs.compare(currentPassword, user[0].password);
  }
}

module.exports = User;
