const mysqlAdapter = require("../utils/mysqlAdapter");

// Empresas del grupo; la API solo las lista (se gestionan directamente en BD)
class Tenant {
  list() {
    return mysqlAdapter.query("SELECT uuid, name FROM tenants ORDER BY name ASC", []);
  }
}

module.exports = Tenant;
