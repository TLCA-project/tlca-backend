import mongoose from 'mongoose'
import { getBannerPathCleaner, getPathCompleter } from '../lib/models.js'

const { model, Schema } = mongoose

const CourseSchema = new Schema(
  {
    course: {
      type: Schema.ObjectId,
      ref: 'Course',
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

const ProgramSchema = new Schema({
  archived: {
    type: Date,
  },
  banner: {
    type: String,
  },
  code: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  coordinator: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  courses: {
    type: [CourseSchema],
    default: undefined,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  published: {
    type: Date,
  },
  tags: {
    type: [
      {
        type: String,
        trim: true,
      },
    ],
    default: undefined,
  },
  type: {
    type: String,
    enum: ['training', 'unit', 'uprogram'],
    default: 'unit',
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  visibility: {
    type: String,
    enum: ['public', 'invite-only', 'private'],
    default: 'public',
  },
})

ProgramSchema.pre('validate', function (next) {
  // There must be at least one mandatory course.
  if (!this.courses.some((c) => !c.optional)) {
    this.invalidate('courses', 'MISSING_MANDATORY_COURSE')
  }

  // Courses must be all different.
  const codes = new Set()
  if (
    this.courses.some(
      (c) =>
        codes.size === codes.add((c.course._id || c.course).toString()).size
    )
  ) {
    this.invalidate('courses', 'DUPLICATE_COURSES')
  }

  next()
})

// Generate full path for the banner.
ProgramSchema.post(
  ['aggregate', 'find', 'findOne'],
  getPathCompleter('programs')
)
ProgramSchema.pre('save', getBannerPathCleaner)

export default model('Program', ProgramSchema)
