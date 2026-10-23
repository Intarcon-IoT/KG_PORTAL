const { randomUUID } = require('crypto')
const User = require("../models/user");
const generateRandomPassword = require("../utils/passwordGenerator");
const sessions = require("../utils/sessions")
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

  const randomPassword = generateRandomPassword();
  req.body.password = randomPassword;
  const newUser = new User(randomUUID());
  newUser.set(req.body);
  const result = await newUser.create();

  if (result.error) {
    return res.json({ ok: false, message: "Error al crear el usuario" });
  } else {
    await newUser.sendUserCredentialsEmail(randomPassword);
    return res.json({ ok: true, message: "Usuario creado correctamente" });
  }
};

// Habilita o deshabilita un usuario; nunca se borran porque sus reservas dependen de él
userCtrl.setUserStatus = async (req, res) => {
  const { active } = req.body
  if (typeof active !== 'boolean') return res.status(400).json({ ok: false, message: "El campo active debe ser true o false" })
  if (req.params.uuid === res.locals.user?.uuid) return res.status(400).json({ ok: false, message: "No puedes deshabilitar tu propio usuario" })

  const result = await new User(req.params.uuid).setActive(active)
  if (result.error) return res.status(500).json({ ok: false, message: "Error al cambiar el estado del usuario" })
  if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: "Usuario no encontrado" })
  if (!active) await sessions.destroyAll(req.params.uuid)
  return res.json({ ok: true, message: active ? "Usuario habilitado" : "Usuario deshabilitado" })
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
  const current = await user.read()
  const before = Array.isArray(current) ? current[0] : null
  const result = await user.update(req.body);

  if (result.error || result.affectedRows === 0) {
    return res.json({ ok: false, message: "Error al actualizar el usuario" });
  }
  // Contraseña, rol o empresa nuevos invalidan las sesiones abiertas (guardan los datos antiguos)
  const changed = key => req.body[key] !== undefined && req.body[key] !== before?.[key]
  if (req.body.password || changed('role') || changed('tenant_uuid')) await sessions.destroyAll(uuid)
  return res.json({ ok: true, message: "Usuario actualizado correctamente" });
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

  // Fallo de MySQL o Redis: el frontend espera un usuario en toda respuesta 200
  if (result.ok === false) return res.status(500).json({ ok: false, message: 'No se ha podido iniciar sesión. Inténtalo de nuevo más tarde' })
  if (result.login === false && result.message === "Usuario deshabilitado") return res.status(403).json({ ok: false, message: "Tu usuario está deshabilitado. Contacta con un administrador" })
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

  if (result.unavailable) return res.status(503).json({ ok: false, message: 'Servicio no disponible temporalmente' })
  if (result.ok === false) {
    return res.status(403).json({ ok: false, message: "Error al cargar la sesión" });
  } else {
    return res.json(result);
  }
};

userCtrl.logOut = async (req, res) => {
  // El token sale de la cabecera ya autenticada, no del body
  const result = await new User().closeSession(res.locals.token);
  return res.json(result);
};

module.exports = userCtrl;
