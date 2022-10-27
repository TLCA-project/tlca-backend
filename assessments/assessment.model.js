import { DateTime } from 'luxon'
import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema(
  {
    checklist: {
      private: {
        type: [String],
        default: undefined,
      },
      public: {
        type: [String],
        default: undefined,
      },
    },
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
      required: true,
    },
    learningOutcomes: {
      type: [Number],
      default: undefined,
    },
    maxStars: {
      type: Number,
      min: 1,
      max: 5,
    },
    optional: {
      type: Boolean,
    },
    stars: {
      type: Number,
      min: 1,
      max: 3,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const PhaseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    competencies: {
      type: [CompetencySchema],
      default: undefined,
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
    trim: true,
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
  evaluationRequest: {
    type: Boolean,
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
    required: true,
    trim: true,
  },
  oralDefense: {
    type: Boolean,
  },
  phased: {
    type: Boolean,
  },
  phases: {
    type: [PhaseSchema],
    default: undefined,
  },
  provider: {
    type: String,
    enum: ['tfq'],
  },
  providerConfig: {
    type: Object,
  },
  start: {
    type: Date,
  },
  takes: {
    type: Number,
    min: 1,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

AssessmentSchema.pre('validate', function (next) {
  // Check whether competencies have been defined.
  if (
    (!this.phased && !this.competencies?.length) ||
    (this.phased &&
      !this.phases?.length &&
      !this.phases.every((p) => p.competencies?.length))
  ) {
    this.invalidate('competencies', 'MISSING_COMPETENCIES')
  }
  // Perform several checks on the competencies
  else {
    const phases = !this.phased ? [this] : this.phases
    for (const [i, phase] of phases.entries()) {
      // Competencies must be all different.
      const codes = new Set()
      if (
        phase.competencies.some(
          (c) =>
            codes.size ===
            codes.add((c.competency._id || c.competency).toString()).size
        )
      ) {
        const prefix = this.phased ? `phases-${i}-` : ''
        this.invalidate(`${prefix}competencies`, 'DUPLICATE_COMPETENCIES')
      }
    }
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
