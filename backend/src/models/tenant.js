const mysqlAdapter = require("../utils/mysqlAdapter");

class Tenant {
  constructor(uuid) {
    this.uuid = uuid;
    this.name = "";
  }

  set(data) {
    this.name = data.name;
    return this;
  }

  getData() {
    return {
      uuid: this.uuid,
      name: this.name
    };
  }

  async create() {
    const data = this.getData();
    const result = await mysqlAdapter.query("INSERT INTO kibooking_tenants SET ?", data);
    return result;
  }

  async update(tenantData = null) {
    const data = tenantData ?? this.getData();
    const result = await mysqlAdapter.query(`UPDATE kibooking_tenants SET ? WHERE uuid = '${this.uuid}'`, data);
    return result;
  }

  async delete() {
    const result = await mysqlAdapter.query("DELETE FROM kibooking_tenants WHERE uuid = ?", [this.uuid]);
    return result;
  }

  async list() {
    const rows = await mysqlAdapter.query("SELECT uuid, name FROM kibooking_tenants ORDER BY name ASC", []);
    return rows;
  }

  read(filter = {}) {
    let data = [];
    let sql = "SELECT uuid, name FROM kibooking_tenants WHERE 1";
    
    if (Object.keys(filter).length === 0 && this.uuid) {
      sql += " AND uuid = ?";
      data.push(this.uuid);
    }
    
    if (filter.name) {
      sql += " AND name = ?";
      data.push(filter.name);
    }
    
    return mysqlAdapter.query(sql, data);
  }
}

module.exports = Tenant;
