import mongoose from 'mongoose'

const { model, Schema } = mongoose

const AssessmentInstanceSchema = new Schema({
  assessment: {
    type: Schema.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  data: {
    type: Object,
    required: true,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true,
  },
})

export default model('AssessmentInstance', AssessmentInstanceSchema)
