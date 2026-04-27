const bcryptjs = require("bcryptjs");
const mysqlAdapter = require("../utils/mysqlAdapter");
const cache = require('../utils/cacheAdapter');
const { createCacheToken } = require("../utils/userToken");
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
    const result = await mysqlAdapter.query("INSERT INTO kibooking_users SET ?", data);
    return result;
  }

  async update(userData = null) {
    const data = userData ?? this.getData();

    if (data.password) {
      data.password = bcryptjs.hashSync(data.password, 0);
    }

    const result = await mysqlAdapter.query(`UPDATE kibooking_users SET ? WHERE uuid = '${this.uuid}'`, data);
    return result;
  }

  async getDeletionImpact() {
    const [row] = await mysqlAdapter.query(
      'SELECT COUNT(*) AS bookings FROM kibooking_bookings WHERE user_uuid=?', [this.uuid]
    );
    return { ok: true, bookings: row.bookings };
  }

  async delete() {
    const result = await mysqlAdapter.query("DELETE FROM kibooking_users WHERE uuid = ?", [this.uuid]);
    return result;
  }

  async list(filter = {}) {
    let sql = "SELECT u.uuid, u.name, u.mail, u.role, u.tenant_uuid, t.name AS tenant_name FROM kibooking_users u LEFT JOIN kibooking_tenants t ON u.tenant_uuid = t.uuid WHERE 1";
    let data = [];
    if (filter.tenant_uuid) {
      sql += " AND u.tenant_uuid = ?";
      data.push(filter.tenant_uuid);
    }
    const rows = await mysqlAdapter.query(sql, data);
    return rows;
  }

  read(filter = {}) {
    let data = [];
    let sql = "SELECT uuid, name, mail, password, role, tenant_uuid FROM kibooking_users WHERE 1";
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
    const filter = { 'email': email };
    const result = await this.read(filter);

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

      const token = createCacheToken();
      userStored.token = token;
      userStored.start = moment(new Date()).format(
        "YYYY-MM-DD HH:mm:ss"
      );
      // userStored.version = version.getVersion();
      cache.setRedis(token, userStored, true);

      delete userStored.password;

      return {
        login: true,
        user: userStored
      };
    }
  }

  async loadSession(token) {
    const user = await cache.getRedis(token, true);

    if (user) {
      return { ok: true, user };
    } else {
      return { ok: false, message: "Token no válido" };
    }
  }

  async closeSession(token) {
    await cache.delRedis(token, true);
    return { ok: true };
  }

  async sendPasswordResetEmail(email) {
    const APP_URL = process.env.APP_URL;
    const expirationTime = 600;

    try {
      const userInfoArray = await this.read({ email });
      const userInfo = userInfoArray[0];

      if (userInfo) {
        const token = createCacheToken();
        cache.setRedis(token, userInfo, true, expirationTime);

        const resetLink = `${APP_URL}/reset-password?token=${token}`;
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

  async sendUserCredentialsEmail(password) {
    const template = newUserTemplate(this.name, this.mail, password);
    await mailerAdapter.sendMail({ to: this.mail, template });
  }

  async checkPassword(currentPassword) {
    const user = await this.read();
    if (!user || user.length === 0) {
      return false;
    }
    return await bcryptjs.compare(currentPassword, user[0].password);
  }
}

module.exports = User;
