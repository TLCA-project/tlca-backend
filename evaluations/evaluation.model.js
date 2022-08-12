import mongoose from 'mongoose'

const { model, Schema } = mongoose

const EvaluationSchema = new Schema({
  assessment: {
    type: Schema.ObjectId,
    ref: 'Assessment',
    required: 'Assessment cannot be blank.',
  },
  competencies: {
    type: [
      {
        type: Schema.ObjectId,
        ref: 'Competency',
      },
    ],
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
  note: {
    type: String,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'User cannot be blank.',
  },
})

export default model('Evaluation', EvaluationSchema)
