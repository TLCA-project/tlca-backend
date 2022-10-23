import mongoose from 'mongoose'

const { model, Schema } = mongoose

const FileSchema = new Schema({
  assessment: {
    type: Schema.ObjectId,
    ref: 'Assessment',
  },
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  evaluation: {
    type: Schema.ObjectId,
    ref: 'Evaluation',
  },
  origName: {
    type: String,
    trim: true,
  },
  path: {
    type: String,
    trim: true,
    default: undefined,
  },
  size: {
    type: Number,
    min: 0,
  },
  tempPath: {
    type: String,
    trim: true,
    default: undefined,
  },
  type: {
    type: String,
    trim: true,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

export default model('File', FileSchema)
