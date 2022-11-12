import crypto from 'crypto'
import { DateTime } from 'luxon'

function clean(obj, fields, check) {
  for (const field of fields) {
    if (check(obj, field)) {
      delete obj[field]
    }
  }
}

// Make field 'f' undefined if 'o.f' does not exist
// or is an empty array.
function cleanArray(obj, ...fields) {
  clean(obj, fields, (o, f) => !o[f] || !o[f].length)
}

// Make field 'f' undefined if 'o.f' does not exist.
function cleanField(obj, ...fields) {
  clean(obj, fields, (o, f) => !o[f])
}

// Make field 'f' undefined if 'o.f' is an empty object {}.
function cleanObject(obj, ...fields) {
  clean(obj, fields, (o, f) => !Object.keys(o[f]).length)
}

// Make field 'f' undefined if 'o.f' does not exist
// or is an empty/white-only string.
function cleanString(obj, ...fields) {
  clean(obj, fields, (o, f) => !o[f] || !o[f].trim().length)
}

function generateToken(expiresIn = 10) {
  return {
    token: crypto.randomBytes(20).toString('hex'),
    expires: DateTime.now().plus({ minutes: expiresIn }).toISO(),
  }
}

export { cleanArray, cleanField, cleanObject, cleanString, generateToken }
