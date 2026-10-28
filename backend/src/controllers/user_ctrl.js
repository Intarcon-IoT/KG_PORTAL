const { randomUUID } = require('crypto')
const User = require("../models/user");
const Role = require('../models/role')
const mysqlAdapter = require('../utils/mysqlAdapter')
const generateRandomPassword = require("../utils/passwordGenerator");
const sessions = require("../utils/sessions")
const { ROLES } = require("../utils/constants");
const permissions = require('../utils/permissions')

const ALLOWED_FIELDS = ["name", "mail", "role", "tenant_uuid", "password", "currentPassword"];

const userCtrl = {};

const isAdmin = user => user?.role === ROLES.ADMIN
const allCompanies = user => permissions.has(user, 'users.all_companies')

// El Admin gestiona a cualquiera; con users.manage, a los de su empresa (o de todas con users.all_companies) que no
// sean administradores ni gestionen usuarios. `target` es el acceso actual (readAccess) del usuario a tocar
const canManage = (me, target) => {
  if (isAdmin(me)) return true
  if (!permissions.has(me, 'users.manage') || target.role === ROLES.ADMIN || target.permissions.includes('users.manage')) return false
  return allCompanies(me) || target.tenant_uuid === me.tenant_uuid
}

// Tipos y formato de los campos que llegan; recorta nombre y correo. Devuelve el mensaje de error o null
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const checkData = body => {
  const { name, mail, tenant_uuid, password, currentPassword } = body
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) return 'El nombre es obligatorio y de 100 caracteres como máximo'
  if (mail !== undefined && (typeof mail !== 'string' || mail.trim().length > 100 || !MAIL.test(mail.trim()))) return 'El correo no es válido'
  if (tenant_uuid !== undefined && tenant_uuid !== null && typeof tenant_uuid !== 'string') return 'La empresa no es válida'
  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) return 'La contraseña debe tener al menos 8 caracteres'
  if (currentPassword !== undefined && typeof currentPassword !== 'string') return 'La contraseña actual no es válida'
  if (name !== undefined) body.name = name.trim()
  if (mail !== undefined) body.mail = mail.trim()
  return null
}

// Acceso del usuario de la URL: { target } o la respuesta de error ya enviada
const loadTarget = async (req, res) => {
  const target = await new User(req.params.uuid).readAccess()
  if (target === null) return void res.status(500).json({ ok: false, message: 'Error al leer el usuario' })
  if (!target) return void res.status(404).json({ ok: false, message: 'Usuario no encontrado' })
  return target
}

userCtrl.createUser = async (req, res) => {
  const me = res.locals.user
  // Sin ser Admin no se elige rol y, sin users.all_companies, la empresa es la propia
  if (!isAdmin(me)) req.body.role = ROLES.USER
  if (!isAdmin(me) && !allCompanies(me)) req.body.tenant_uuid = me.tenant_uuid
  const { name, mail, tenant_uuid, role } = req.body;

  if (!mail || !name || !tenant_uuid || !role) return res.status(400).json({ ok: false, message: 'El nombre, el correo, la empresa y el rol son obligatorios' })
  const invalid = checkData({ name, mail, tenant_uuid })
  if (invalid) return res.status(400).json({ ok: false, message: invalid })
  Object.assign(req.body, { name: name.trim(), mail: mail.trim() })
  const code = await Role.codeOf(role)
  if (!code) return res.status(400).json({ ok: false, message: 'El rol no existe' })
  req.body.role = code

  const randomPassword = generateRandomPassword();
  req.body.password = randomPassword;
  const newUser = new User(randomUUID());
  newUser.set(req.body);

  // Sin el correo nadie conoce la contraseña: si no sale, el alta se deshace
  try {
    await mysqlAdapter.runInTransaction(async () => {
      const result = await newUser.create()
      if (result.error) throw Object.assign(new Error('Error al crear el usuario'), { step: 'create' })
      await newUser.sendUserCredentialsEmail(randomPassword)
    })
  } catch (error) {
    if (error.step === 'create') return res.json({ ok: false, message: 'Error al crear el usuario' })
    console.error('[USUARIOS] Correo de alta no enviado:', error.message)
    return res.status(502).json({ ok: false, message: 'No se ha podido enviar el correo con la contraseña: el usuario no se ha creado' })
  }
  return res.json({ ok: true, uuid: newUser.uuid, message: "Usuario creado correctamente" });
};

// Catálogo de módulos y acciones que se pueden asignar
userCtrl.getPermissionCatalog = (req, res) => res.json(permissions.catalog())

userCtrl.getUserPermissions = async (req, res) => {
  const result = await new User(req.params.uuid).readPermissions()
  if (result.error) return res.status(500).json({ ok: false, message: 'Error al obtener los permisos' })
  res.json(result)
}

// Sustituye la lista completa; surte efecto en la siguiente petición del usuario, sin cerrar su sesión
userCtrl.setUserPermissions = async (req, res) => {
  const { permissions: list } = req.body
  if (!Array.isArray(list) || list.some(p => typeof p !== 'string')) return res.status(400).json({ ok: false, message: 'permissions debe ser una lista de permisos' })
  const unknown = list.filter(p => !permissions.exists(p))
  if (unknown.length) return res.status(400).json({ ok: false, message: `Permisos desconocidos: ${unknown.join(', ')}` })

  const user = new User(req.params.uuid)
  const found = await user.read()
  if (found.error) return res.status(500).json({ ok: false, message: 'Error al actualizar los permisos' })
  if (!found.length) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' })

  const normalized = permissions.normalize(list)
  try {
    await user.setPermissions(normalized, res.locals.user.uuid)
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al actualizar los permisos' })
  }
  res.json({ ok: true, permissions: normalized, message: 'Permisos actualizados' })
}

// Habilita o deshabilita un usuario; nunca se borran porque sus reservas dependen de él
userCtrl.setUserStatus = async (req, res) => {
  const { active } = req.body
  if (typeof active !== 'boolean') return res.status(400).json({ ok: false, message: "El campo active debe ser true o false" })
  if (req.params.uuid === res.locals.user?.uuid) return res.status(400).json({ ok: false, message: "No puedes deshabilitar tu propio usuario" })
  const target = await loadTarget(req, res)
  if (!target) return
  if (!canManage(res.locals.user, target)) return res.status(403).json({ ok: false, message: 'No tienes permiso para gestionar a este usuario' })

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
  const invalid = checkData(req.body)
  if (invalid) return res.status(400).json({ ok: false, message: invalid })

  //Validación de permisos: uno mismo, el Admin o quien lo gestiona; rol solo el Admin, empresa el Admin o users.all_companies
  const me = res.locals.user
  const isSelf = me?.uuid === req.params.uuid
  const target = await loadTarget(req, res)
  if (!target) return
  if (!isSelf && !canManage(me, target)) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para actualizar el usuario" });
  }
  if (req.body.password && !isSelf) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para actualizar la contraseña" });
  }
  // Nadie cambia su propio rol: un administrador podría dejarse sin acceso a la gestión
  if (isSelf && req.body.role !== undefined && req.body.role !== target.role) return res.status(403).json({ ok: false, message: 'No puedes cambiar tu propio rol' })
  if (req.body.role !== undefined && req.body.role !== target.role && !isAdmin(me)) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para actualizar el rol de usuario" });
  }
  if (req.body.tenant_uuid !== undefined && req.body.tenant_uuid !== target.tenant_uuid && !isAdmin(me) && !(allCompanies(me) && !isSelf)) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para cambiar la empresa del usuario" });
  }
  if (req.body.role !== undefined) {
    const code = await Role.codeOf(req.body.role)
    if (!code) return res.status(400).json({ ok: false, message: 'El rol no existe' })
    req.body.role = code
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

// Sin ser Admin ni tener users.all_companies, solo los de su empresa
userCtrl.getUsers = async (req, res) => {
  const me = res.locals.user
  const user = new User();
  const result = await user.list(isAdmin(me) || allCompanies(me) ? {} : { tenant_uuid: me.tenant_uuid });

  if (result.error) {
    res.json({ ok: false, message: "Error al obtener los usuarios" });
  } else {
    res.json(result);
  }
};

// Uno mismo, el Admin o quien ve usuarios de su empresa (o de todas)
userCtrl.getUser = async (req, res) => {
  const uuid = req.params.uuid;
  const me = res.locals.user
  if (me.uuid !== uuid && !isAdmin(me)) {
    const target = await loadTarget(req, res)
    if (!target) return
    if (!permissions.has(me, 'users.view') || (!allCompanies(me) && target.tenant_uuid !== me.tenant_uuid)) return res.status(403).json({ ok: false, message: 'No tienes permiso para ver este usuario' })
  }

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
