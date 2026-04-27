const uuid = require("uuid");
const Tenant = require("../models/tenant");

const tenantCtrl = {};

tenantCtrl.createTenant = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.json({ ok: false, message: "El nombre es obligatorio." });
  }

  const newTenant = new Tenant(uuid.v4());
  newTenant.set(req.body);

  const result = await newTenant.create();

  if (result.error) {
    return res.json({ ok: false, message: "Error al crear el tenant" });
  } else {
    return res.json(result);
  }
};

tenantCtrl.getTenants = async (req, res) => {
  const tenant = new Tenant();
  const result = await tenant.list();

  if (result.error) {
    res.json({ ok: false, message: "Error al obtener los tenants" });
  } else {
    res.json(result);
  }
};

tenantCtrl.getTenant = async (req, res) => {
  const id = req.params.uuid;

  let tenant = new Tenant(id);
  const result = await tenant.read();

  if (result.error) {
    return res.json({ ok: false, message: "Error al obtener el tenant" });
  } else {
    return res.json(result);
  }
};

tenantCtrl.editTenant = async (req, res) => {
  const id = req.params.uuid;

  let tenant = new Tenant(id);
  tenant.set(req.body);  
  const result = await tenant.update();

  if (result.error) {
    return res.json({ ok: false, message: "Error al actualizar el tenant" });
  } else {
    return res.json(result);
  }
};

tenantCtrl.deleteTenant = async (req, res) => {
  const id = req.params.uuid;

  let tenant = new Tenant(id);
  const result = await tenant.delete();

  if (result.error) {
    return res.json({ ok: false, message: "Error al eliminar el tenant" });
  } else {
    return res.json({ ok: true, message: "Tenant eliminado correctamente" });
  }
};

module.exports = tenantCtrl;
