const bcryptjs = require("bcryptjs");
const mysqlAdapter = require("../utils/mysqlAdapter");
const cache = require('../utils/cacheAdapter');
const { createCacheToken } = require("../utils/userToken");
const moment = require("moment");

class User {
  constructor(uuid) {
    this.uuid = uuid;
    this.mail = "";
    this.name = "";
    this.password = "";
    this.isAdmin = false;
  }

  set(data) {
    this.name = data.name;
    this.mail = data.mail;
    this.password = bcryptjs.hashSync(data.password, 0);
    this.isAdmin = data.isAdmin || false;
    return this;
  }

  getData() {
    return {
      uuid: this.uuid,
      name: this.name,
      mail: this.mail,
      password: this.password,
      isAdmin: this.isAdmin
    };
  }

  async create() {
    const data = this.getData();
    const result = await mysqlAdapter.query("INSERT INTO kibooking_users SET ?", data);
    return result;
  }

  async update() {
    const data = this.getData();
    const result = await mysqlAdapter.query("UPDATE kibooking_users SET ? WHERE uuid = ?", [data, this.uuid]);
    return result;
  }

  async delete() {
    return mysqlAdapter.query("DELETE FROM kibooking_users WHERE uuid = ?", [this.uuid]);
  }

  async list() {
    const rows = await mysqlAdapter.query("SELECT uuid, name, mail, isAdmin FROM kibooking_users", []);
    return rows;
  }

  read(filter = {}) {
    let data = [];
    let sql = "SELECT uuid, name, mail, password, isAdmin FROM kibooking_users WHERE 1";
    if (Object.keys(filter).length === 0) {
      sql += " AND uuid = ?";
      data.push(this.uuid);
    }
    if (filter.email) {
      sql += " AND mail = ?";
      data.push(filter.email);
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

}

module.exports = User;
