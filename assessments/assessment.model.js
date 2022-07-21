import mongoose from 'mongoose'

const { model, Schema } = mongoose

const AssessmentSchema = new Schema({
  code: {
    type: String,
  },
  name: {
    type: String,
    trim: true,
    required: 'Name cannot be blank.',
  },
  description: {
    type: String,
    required: 'Description cannot be blank.',
  },
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
    required: 'Course cannot be blank.',
  },
  start: {
    type: Date,
  },
  end: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

export default model('Assessment', AssessmentSchema)
