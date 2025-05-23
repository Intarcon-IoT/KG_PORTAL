const uuid = require("uuid");
const User = require("../models/user");

const userCtrl = {};


userCtrl.createUser = async (req, res) => {
  const { name, mail, password } = req.body;

  if ( !mail || !name || !password) {
    return res.send({ message: "El nombre de usuario, mail, name y pass son obligatorios" });
  }

  const newUser = new User(uuid.v4());

  newUser.set(req.body);

  const result = await newUser.create();

  if (result.error) {
    return res.json({ ok: false, message: "Error al crear la sala" });
  } else {
    return res.json(result);
  }
};

userCtrl.getUsers = async (req, res) => {
  const user = new User();
  const result = await user.list();

  if (result.error) {
    res.json({ ok: false, message: "Error al obtener los usuarios" });
  } else {
    res.json(result);
  }
};

userCtrl.getUser = async (req, res) => {
  const uuid = req.params.uuid;

  let user = new User(uuid);
  const result = await user.read();

  if (result.error) {
    return res.json({ ok: false, message: "Error al obtener el usuario" });
  } else {
    return res.json(result);
  }
};

userCtrl.signIn = async (req, res) => {
  const user = new User();
  const { email, password } = req.body;

  const result = await user.login(email, password);

  if (result.login === false) {
    return res.status(401).json({ ok: false, message: "Las credenciales no son válidas" });
  } else {
    return res.json(result);
  }
};

userCtrl.loadSession = async (req, res) => {
  const user = new User();
  const { token } = req.body;

  const result = await user.loadSession(token);

  if (result.ok === false) {
    return res.status(403).json({ ok: false, message: "Error al cargar la sesión" });
  } else {
    return res.json(result);
  }
};

module.exports = userCtrl;