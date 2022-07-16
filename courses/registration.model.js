import mongoose from 'mongoose'
import validator from 'validator'

const { Schema } = mongoose

const validateLocalStrategyEmail = function (email) {
  return validator.isEmail(email, { require_tld: false })
}

const RegistrationSchema = new Schema({
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
    required: 'Course cannot be blank.',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  invite: {
    type: String,
    enum: ['requested', 'sent'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: [validateLocalStrategyEmail, 'Please fill a valid email address'],
  },
  stars: {
    basic: {
      type: Number,
      default: 0,
    },
    advanced: {
      type: Number,
      default: 0,
    },
  },
  group: {
    type: Number,
  },
})

export default mongoose.model('Registration', RegistrationSchema)
