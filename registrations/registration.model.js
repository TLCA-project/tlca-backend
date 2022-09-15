import mongoose from 'mongoose'
import validator from 'validator'

const { model, Schema } = mongoose

const validateLocalStrategyEmail = function (email) {
  return validator.isEmail(email, { require_tld: false })
}

const RegistrationSchema = new Schema({
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
  },
  date: {
    type: Date,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: [validateLocalStrategyEmail, 'Please fill a valid email address'],
  },
  group: {
    teaching: {
      type: Number,
    },
    working: {
      type: Number,
    },
  },
  invitation: {
    type: String,
    enum: ['requested', 'sent'],
  },
  invitationDate: {
    type: Date,
  },
  program: {
    type: Schema.ObjectId,
    ref: 'Program',
  },
  progress: {
    advanced: {
      type: Number,
      default: 0,
    },
    basic: {
      type: Number,
      default: 0,
    },
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

export default model('Registration', RegistrationSchema)
