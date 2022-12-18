import mongoose from 'mongoose'

const { model, Schema } = mongoose

const InstanceSchema = new Schema({
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
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true,
  },
})

export default model('Instance', InstanceSchema)
