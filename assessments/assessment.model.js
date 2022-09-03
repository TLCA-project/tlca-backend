import { DateTime } from 'luxon'
import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema(
  {
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
      required: true,
    },
    optional: {
      type: Boolean,
    },
    stars: {
      type: Number,
      min: 1,
      max: 3,
      required: true,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const AssessmentSchema = new Schema({
  category: {
    type: String,
    enum: [
      'casestudy',
      'coding',
      'exercise',
      'interview',
      'mission',
      'project',
      'quiz',
    ],
    required: true,
  },
  clonedFrom: {
    type: Schema.ObjectId,
    ref: 'Assessment',
  },
  closed: {
    type: Boolean,
  },
  code: {
    type: String,
  },
  competencies: {
    type: [CompetencySchema],
    default: undefined,
  },
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
  },
  end: {
    type: Date,
  },
  event: {
    type: Schema.ObjectId,
    ref: 'Event',
  },
  hidden: {
    type: Boolean,
  },
  incremental: {
    type: Boolean,
  },
  instances: {
    type: Number,
  },
  load: {
    defense: {
      type: Number,
      min: 0,
    },
    grading: {
      type: Number,
      min: 0,
    },
    work: {
      type: Number,
      min: 0,
    },
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  oralDefense: {
    type: Boolean,
  },
  start: {
    type: Date,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

AssessmentSchema.pre('validate', function (next) {
  // There must be at least one mandatory competency.
  if (!this.competencies.some((c) => !c.optional)) {
    this.invalidate('competencies', 'MISSING_MANDATORY_COMPETENCY')
  }

  // Competencies must be all different.
  const codes = new Set()
  if (
    this.competencies.some(
      (c) =>
        codes.size ===
        codes.add((c.competency._id || c.competency).toString()).size
    )
  ) {
    this.invalidate('competencies', 'DUPLICATE_COMPETENCIES')
  }

  // Start date must be strictly before end date,
  // if both are defined.
  if (this.start && this.end) {
    const start = DateTime.fromJSDate(this.start)
    const end = DateTime.fromJSDate(this.end)

    if (start >= end) {
      this.invalidate('start', 'START_DATE_NOT_BEFORE_END_DATE')
    }
  }

  next()
})

export default model('Assessment', AssessmentSchema)
