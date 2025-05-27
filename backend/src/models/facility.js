const mysqlAdapter = require("../utils/mysqlAdapter");

class Facility {

  constructor(uuid) {
    this.uuid = uuid;
    this.name = "";
    this.color = "";
  }

  set(data) {
    this.name = data.name;
    this.color = data.color;
  }

  getData() {
    const data = {
      uuid: this.uuid,
      name: this.name,
      color: this.color
    };
    return data;
  }

  async create() {
    const data = this.getData();
    const result = await mysqlAdapter.query("INSERT INTO kibooking_facilities SET ?", data);
    return result;
  }

  async update() {
    const data = this.getData();
    const result = await mysqlAdapter.query("UPDATE kibooking_facilities SET ? WHERE uuid = ?", [data, this.uuid]);
    return result;
  }

  async delete() {
    return mysqlAdapter.query("DELETE FROM kibooking_facilities WHERE uuid = ?", [this.uuid]);
  }

  async list() {
    const rows = await mysqlAdapter.query("SELECT uuid, name, color FROM kibooking_facilities WHERE enabled = 1", []);
    return rows;
  }

  read(filter = {}) {
    let data = [];
    let sql = "SELECT uuid, name, color FROM kibooking_facilities WHERE uuid = ?";
    if (Object.keys(filter).length === 0) {
      sql += " AND uuid = ?";
      data.push(this.uuid);
    }

    return mysqlAdapter.query(sql, data);
  };

}

module.exports = Facility;
