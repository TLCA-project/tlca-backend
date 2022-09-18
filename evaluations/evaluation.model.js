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
  assessment: {
    type: Schema.ObjectId,
    ref: 'Assessment',
    required: 'Assessment cannot be blank.',
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
    required: 'Course cannot be blank.',
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
    required: 'Evaluator cannot be blank.',
  },
  published: {
    type: Date,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'User cannot be blank.',
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
