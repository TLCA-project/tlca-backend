import { DateTime } from 'luxon'
import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema(
  {
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
    },
    stars: {
      type: Number,
      min: 1,
      max: 3,
    },
    optional: {
      type: Boolean,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const AssessmentSchema = new Schema({
  code: {
    type: String,
  },
  name: {
    type: String,
    trim: true,
    required: 'Name cannot be blank.',
  },
  category: {
    type: String,
    enum: [
      'quiz',
      'exercise',
      'coding',
      'mission',
      'project',
      'interview',
      'casestudy',
    ],
    required: 'Category cannot be blank.',
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
  competencies: {
    type: [CompetencySchema],
    default: undefined,
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

AssessmentSchema.pre('validate', function (next) {
  // Start date must be strictly before end date,
  // if both are defined.
  if (this.start && this.end) {
    const start = DateTime.fromJSDate(this.start)
    const end = DateTime.fromJSDate(this.end)

    if (start >= end) {
      this.invalidate('start', 'START_DATE_NOT_BEFORE_END_DATE')
    }
  }

  // Selected competencies must be all different
  const codes = new Set()
  if (
    this.competencies.some((c) => codes.size === codes.add(c.competency).size)
  ) {
    this.invalidate('competencies', 'DUPLICATE_COMPETENCIES')
  }

  next()
})

export default model('Assessment', AssessmentSchema)
