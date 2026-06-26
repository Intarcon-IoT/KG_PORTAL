const uuid = require("uuid");
const User = require("../models/user");
const generateRandomPassword = require("../utils/passwordGenerator");
const { ROLES } = require("../utils/constants");

const ALLOWED_FIELDS = ["name", "mail", "role", "tenant_uuid", "password", "currentPassword"];

const userCtrl = {};

userCtrl.createUser = async (req, res) => {
  const { name, mail, tenant_uuid, role } = req.body;

  if (res.locals.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para crear usuarios" });
  }
  if (!mail || !name || !tenant_uuid || !role) {
    return res.send({ message: "El nombre de usuario, mail, tenant y rol son obligatorios" });
  }

  const randomPassword = generateRandomPassword(8);
  req.body.password = randomPassword;
  const newUser = new User(uuid.v4());
  newUser.set(req.body);
  const result = await newUser.create();

  if (result.error) {
    return res.json({ ok: false, message: "Error al crear el usuario" });
  } else {
    await newUser.sendUserCredentialsEmail(randomPassword);
    return res.json({ ok: true, message: "Usuario creado correctamente" });
  }
};

userCtrl.getDeletionImpact = async (req, res) => {
  const { uuid } = req.params;
  const user = new User(uuid);
  const result = await user.getDeletionImpact();
  return res.json(result);
};

userCtrl.deleteUser = async (req, res) => {
  const targetUser = new User(req.params.uuid);
  const targetUserResult = await targetUser.read();

  if (res.locals.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para eliminar usuarios" });
  }
  const result = await targetUser.delete();

  if (result.affectedRows === 0) {
    return res.status(404).json({ ok: false, message: "Error al eliminar el usuario" });
  } else {
    return res.json({ ok: true, message: "Usuario eliminado correctamente" });
  }
};

userCtrl.updateUser = async (req, res) => {
  //Validación de campos permitidos
  const keys = Object.keys(req.body);
  const notAllowed = keys.filter((k) => !ALLOWED_FIELDS.includes(k));
  if (notAllowed.length > 0) {
    return res.status(400).json({ ok: false, message: `Campos no permitidos: ${notAllowed.join(", ")}` });
  }

  //Validación de permisos
  if (res.locals.user?.role !== ROLES.ADMIN && res.locals.user?.uuid !== req.params.uuid) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para actualizar el usuario" });
  }
  if (req.body.password && res.locals.user?.uuid !== req.params.uuid) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para actualizar la contraseña" });
  }
  if (req.body.role && res.locals.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para actualizar el rol de usuario" });
  }

  // Validacion de la contraseña actual
  if (req.body.password) {
    if (!req.body.currentPassword) {
      return res.status(400).json({ ok: false, message: "La contraseña actual es obligatoria para cambiar la contraseña" });
    }else{
      const userForPasswordCheck = new User(req.params.uuid);
      const isPasswordValid = await userForPasswordCheck.checkPassword(req.body.currentPassword);
      if (!isPasswordValid) {
        return res.json({ ok: false, message: "Error al actualizar el usuario" });
      }
      delete req.body.currentPassword;
    }
  }

  const uuid = req.params.uuid;
  const user = new User(uuid);
  const result = await user.update(req.body);

  if (result.affectedRows === 0) {
    return res.json({ ok: false, message: "Error al actualizar el usuario" });
  } else {
    return res.json({ ok: true, message: "Usuario actualizado correctamente" });
  }
};

userCtrl.getUsers = async (req, res) => {
  const user = new User();
  const result = await user.list({});

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

userCtrl.logOut = async (req, res) => {
  const user = new User();
  const { token } = req.body;

  const result = await user.closeSession(token);
  return res.json(result);
};

module.exports = userCtrl;
