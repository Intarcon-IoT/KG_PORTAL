const Tenant = require("../models/tenant");

const tenantCtrl = {};

tenantCtrl.getTenants = async (req, res) => {
  const result = await new Tenant().list();
  if (result.error) return res.json({ ok: false, message: "Error al obtener los tenants" });
  res.json(result);
};

module.exports = tenantCtrl;
