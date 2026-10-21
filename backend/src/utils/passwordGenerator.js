const { randomInt } = require('crypto')

// Contraseña inicial con generador criptográfico y al menos un carácter de cada tipo
const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*()-_=+[]{}|;:,.?']
const ALL = SETS.join('')

const pick = chars => chars[randomInt(chars.length)]

function generateRandomPassword(length = 12) {
  const chars = SETS.map(pick)
  while (chars.length < length) chars.push(pick(ALL))
  // Fisher-Yates: barajado uniforme
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

module.exports = generateRandomPassword
