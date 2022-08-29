import { DateTime } from 'luxon'
import mongoose from 'mongoose'

const { model, Schema } = mongoose

const EventSchema = new Schema({
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
  },
  end: {
    type: Date,
    required: true,
  },
  start: {
    type: Date,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['assessment'],
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

EventSchema.pre('validate', function (next) {
  // Start date must be strictly before end date,
  const start = DateTime.fromJSDate(this.start)
  const end = DateTime.fromJSDate(this.end)

  if (start >= end) {
    this.invalidate('start', 'START_DATE_NOT_BEFORE_END_DATE')
    this.invalidate('end', 'END_DATE_NOT_AFTER_START_DATE')
  }

  next()
})

export default model('Event', EventSchema)
