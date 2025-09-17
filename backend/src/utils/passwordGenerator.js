function generateRandomPassword(length = 8) {
  // Definir los caracteres que se usarán en la contraseña
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:,.?';
  
  // Combinar todos los caracteres
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  let password = '';
  
  // Asegurar que la contraseña tiene al menos un carácter de cada tipo
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Completar la contraseña hasta la longitud deseada
  for (let i = password.length; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    password += allChars.charAt(randomIndex);
  }
  
  // Mezclar los caracteres para que no estén en un orden predecible
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

module.exports = generateRandomPassword;
