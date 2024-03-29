import { passwordStrength } from 'check-password-strength'
import crypto from 'crypto'
import mongoose from 'mongoose'
import validator from 'validator'

import { generateToken } from '../lib/utils.js'

const { model, Schema } = mongoose

const validateLocalStrategyEmail = function (email) {
  return (
    (this.provider !== 'local' && !this.updated) ||
    validator.isEmail(email, { require_tld: false })
  )
}

const validateUsername = function (username) {
  const usernameRegex = /^(?=[\w.-]+$)(?!.*[._-]{2})(?!\.)(?!.*\.$).{3,34}$/
  const illegalUsernames = [
    'anonymous',
    'admin',
    'administrator',
    'api',
    'null',
    'password',
    'undefined',
    'unknown',
    'user',
  ]
  return (
    this.provider !== 'local' ||
    (username &&
      usernameRegex.test(username) &&
      illegalUsernames.indexOf(username) < 0)
  )
}

const UserSchema = new Schema(
  {
    created: {
      type: Date,
      default: Date.now,
    },
    email: {
      type: String,
      index: {
        unique: true,
        sparse: true,
      },
      lowercase: true,
      trim: true,
      default: '',
      validate: [
        validateLocalStrategyEmail,
        'Please fill a valid email address',
      ],
    },
    emailConfirmationToken: {
      type: String,
    },
    emailConfirmationTokenExpires: {
      type: String,
    },
    emailConfirmed: {
      type: Date,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    profileImageURL: {
      type: String,
      default: '/modules/users/client/img/profile/default.png',
    },
    provider: {
      type: String,
      required: 'Provider is required',
    },
    refreshToken: {
      type: String,
    },
    refreshTokenExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordTokenExpires: {
      type: Date,
    },
    roles: {
      type: [
        {
          type: String,
          enum: ['user', 'student', 'teacher', 'manager', 'admin'],
        },
      ],
      default: ['user'],
      required: 'Please provide at least one role',
    },
    salt: {
      type: String,
    },
    updated: {
      type: Date,
    },
    username: {
      type: String,
      unique: 'Username already exists',
      validate: [
        validateUsername,
        'Please enter a valid username: 3+ characters long, non restricted word, characters "_-.", no consecutive dots, does not begin or end with dots, letters a-z and numbers 0-9.',
      ],
      lowercase: true,
      trim: true,
    },
  },
  { usePushEach: true }
)

UserSchema.pre('save', function (next) {
  // Set the username to the '_id' as a default value.
  if (!this.username && this.isNew) {
    this.username = this._id
  }

  // Choose a new salt and hash the password each time a new one is choosed.
  if (this.password && this.isModified('password')) {
    this.salt = crypto.randomBytes(16).toString('base64')
    this.password = this.hashPassword(this.password)
  }

  next()
})

UserSchema.pre('validate', function (next) {
  if (
    this.provider === 'local' &&
    this.password &&
    this.isModified('password')
  ) {
    const { id, value } = passwordStrength(this.password)
    if (id <= 1) {
      this.invalidate('password', 'Password is ' + value.toLowerCase())
    }
  }

  next()
})

// Check that the specified password matches the ones of this user.
UserSchema.methods.authenticate = function (password) {
  return this.password === this.hashPassword(password)
}

// Hash the specified password.
UserSchema.methods.hashPassword = function (password) {
  if (!this.salt || !password) {
    return password
  }

  return crypto
    .pbkdf2Sync(password, Buffer.from(this.salt, 'base64'), 10000, 64, 'SHA1')
    .toString('base64')
}

// Update the email address and invalidate the account of this user.
UserSchema.methods.updateEmail = function (email) {
  this.email = email
  delete this.emailConfirmed

  const token = generateToken()
  this.emailConfirmationToken = token.token
  this.emailConfirmationTokenExpires = token.expires
}

// Reset the password.
UserSchema.methods.resetPassword = function () {
  const token = generateToken()
  this.resetPasswordToken = token.token
  this.resetPasswordTokenExpires = token.expires
}

export default model('User', UserSchema)
