import crypto from 'crypto'
import { DateTime } from 'luxon'

function clean(obj, fields, check) {
  for (const field of fields) {
    if (check(obj, field)) {
      delete obj[field]
    }
  }
}

function cleanArray(obj, ...fields) {
  clean(obj, fields, (o, f) => !o[f]?.length)
}

function cleanField(obj, ...fields) {
  clean(obj, fields, (o, f) => !o[f])
}

function cleanObject(obj, ...fields) {
  clean(obj, fields, (o, f) => !Object.keys(o[f]).length)
}

function cleanString(obj, ...fields) {
  clean(obj, fields, (o, f) => !o[f]?.trim().length)
}

function generateToken(expiresIn = 10) {
  return {
    token: crypto.randomBytes(20).toString('hex'),
    expires: DateTime.now().plus({ minutes: expiresIn }).toISO(),
  }
}

export { cleanArray, cleanField, cleanObject, cleanString, generateToken }
