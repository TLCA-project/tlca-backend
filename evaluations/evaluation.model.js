import { DateTime } from 'luxon'
import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema(
  {
    checklist: {
      private: {
        type: [Boolean],
        default: undefined,
      },
      public: {
        type: [Boolean],
        default: undefined,
      },
    },
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
      required: true,
    },
    learningOutcomes: {
      type: [Boolean],
      default: undefined,
    },
    selected: {
      type: Boolean,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const EvaluationSchema = new Schema({
  accepted: {
    type: Date,
  },
  assessment: {
    type: Schema.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  comment: {
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
  data: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  evalDate: {
    type: Date,
  },
  evaluator: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  explanation: {
    type: String,
  },
  instance: {
    type: Schema.ObjectId,
    ref: 'AssessmentInstance',
  },
  note: {
    type: String,
  },
  ongoing: {
    type: Boolean,
  },
  phase: {
    type: Number,
    min: 0,
  },
  published: {
    type: Date,
  },
  rejected: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  requested: {
    type: Date,
  },
  requestedCompetencies: {
    type: [CompetencySchema],
    default: undefined,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true,
  },
})

EvaluationSchema.pre('validate', function (next) {
  // The evaluation date cannot be in the future.
  if (this.evalDate && DateTime.fromJSDate(this.evalDate) > DateTime.now()) {
    this.invalidate('evalDate', 'FORBIDDEN_FUTURE_EVAL_DATE')
  }

  next()
})

export default model('Evaluation', EvaluationSchema)
