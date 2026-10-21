const { randomUUID } = require('crypto')
const Facility = require("../models/facility");

const facilityCtrl = {};


facilityCtrl.createFacility = async (req, res) => {
  const { name, color } = req.body;

  if (!name || !color) {
    return res.send({ message: "El nombre y color es obligatorios." });
  }

  const newFacility = new Facility(randomUUID());
  newFacility.set(req.body);

  const result = await newFacility.create();

  if (result.error) {
    return res.json({ ok: false, message: "Error al crear la instalación" });
  } else {
    return res.json(result);
  }
};


facilityCtrl.getFacilities = async (req, res) => {
  const facility = new Facility();
  const result = await facility.list();

  if (result.error) {
    res.json({ ok: false, message: "Error al obtener las instalaciones" });
  } else {
    res.json(result);
  }
};


facilityCtrl.getFacility = async (req, res) => {
  const uuid = req.params.uuid;

  let facility = new Facility(uuid);
  const result = await facility.read();

  if (result.error) {
    return res.json({ ok: false, message: "Error al obtener la instalacion" });
  } else {
    return res.json(result);
  }
};


facilityCtrl.editFacility = async (req, res) => {
  const uuid = req.params.uuid;

  let facility = new Facility(uuid);
  facility.set(req.body);  
  const result = await facility.update();

  if (result.error) {
    return res.json({ ok: false, message: "Error al actualizar la instalación" });
  } else {
    return res.json(result);
  }
};


facilityCtrl.deleteFacility = async (req, res) => {
  const uuid = req.params.uuid;

  let facility = new Facility(uuid);
  const result = await facility.delete();

  if (result.error) {
    return res.json({ ok: false, message: "Error al eliminar la instalación" });
  } else {
    return res.json({ ok: true, message: "Instalación eliminada correctamente" });
  }
};

module.exports = facilityCtrl;
