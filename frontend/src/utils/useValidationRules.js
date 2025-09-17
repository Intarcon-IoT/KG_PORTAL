const validate = {};

validate.required = (v) => (!!v || v === false) ? true : 'Requerido';

validate.email = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email no válido';

validate.password = (v) => !v || v.length >= 8 || 'Mínimo 8 caracteres';

validate.confirmPassword = (password) => [
  (v) => !password || !!v || 'Confirmación requerida',
  (v) => !password || v === password || 'Las contraseñas no coinciden'
];

export default validate;

