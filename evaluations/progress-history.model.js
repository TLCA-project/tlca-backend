import mongoose from 'mongoose'

const { model, Schema } = mongoose

const ProgressHistorySchema = new Schema({
  competency: {
    type: Schema.ObjectId,
    ref: 'Competency',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  evaluation: {
    type: Schema.ObjectId,
    ref: 'Evaluation',
    required: true,
  },
  learningOutcomes: {
    type: [Number],
    default: undefined,
  },
  stars: {
    type: Number,
    min: 1,
    max: 3,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true,
  },
})

ProgressHistorySchema.pre('validate', function (next) {
  // Either stars xor learningOutcomes must be defined.
  if (!!this.stars === !!this.learningOutcomes) {
    this.invalidate('stars', 'ONLY_STARS_OR_LEARNING_OUTCOMES')
    this.invalidate('learningOutcomes', 'ONLY_STARS_OR_LEARNING_OUTCOMES')
  }

  next()
})

export default model('ProgressHistory', ProgressHistorySchema)
