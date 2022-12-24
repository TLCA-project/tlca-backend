import { DateTime } from 'luxon'
import mongoose from 'mongoose'
import { getBannerPathCleaner, getPathCompleter } from '../lib/models.js'

const { Schema } = mongoose

const CompetencySchema = new Schema(
  {
    category: {
      type: String,
      enum: ['basic', 'advanced'],
    },
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
    },
    subcategory: {
      type: String,
      trim: true,
    },
    useLearningOutcomes: {
      type: Boolean,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const ProgressStepSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    progress: {
      advanced: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      basic: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
    },
  },
  {
    id: false,
    _id: false,
  }
)

const ScheduleSchema = new Schema(
  {
    end: {
      type: Date,
    },
    evaluationRequestsEnd: {
      type: Date,
    },
    evaluationsEnd: {
      type: Date,
    },
    registrationsEnd: {
      type: Date,
    },
    registrationsStart: {
      type: Date,
    },
    start: {
      type: Date,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const TeachingGroupSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    supervisor: {
      type: Schema.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const WorkingGroupSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const CourseSchema = new Schema(
  {
    archived: {
      type: Date,
    },
    banner: {
      type: String,
    },
    clonedFrom: {
      type: Schema.ObjectId,
      ref: 'Course',
    },
    code: {
      type: String,
      trim: true,
      required: 'Code cannot be blank.',
      unique: true,
    },
    colophon: {
      type: String,
      trim: true,
    },
    competencies: {
      type: [CompetencySchema],
      default: undefined,
    },
    coordinator: {
      type: Schema.ObjectId,
      ref: 'User',
      required: 'Coordinator cannot be blank.',
    },
    created: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      required: 'Description cannot be blank.',
    },
    field: {
      type: String,
      trim: true,
    },
    groups: {
      teaching: {
        type: [TeachingGroupSchema],
        default: undefined,
      },
      working: {
        type: [WorkingGroupSchema],
        default: undefined,
      },
    },
    language: {
      type: String,
      trim: true,
    },
    load: {
      type: {
        type: String,
        enum: ['weekly', 'theo+prac'],
      },
      theory: {
        type: Number,
        min: 0,
      },
      practice: {
        type: Number,
        min: 0,
      },
      weekload: {
        type: Number,
        min: 1,
      },
      ects: {
        type: Number,
        min: 0,
      },
    },
    name: {
      type: String,
      trim: true,
      required: 'Name cannot be blank.',
    },
    partners: {
      type: [
        {
          type: Schema.ObjectId,
          ref: 'Partner',
        },
      ],
      default: undefined,
    },
    progressGuide: {
      type: [ProgressStepSchema],
      default: undefined,
    },
    published: {
      type: Date,
    },
    schedule: {
      type: ScheduleSchema,
      default: undefined,
    },
    span: {
      type: Number,
      min: 1,
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
    teachers: {
      type: [
        {
          type: Schema.ObjectId,
          ref: 'User',
        },
      ],
      default: undefined,
    },
    type: {
      type: String,
      enum: ['project', 'training', 'ucourse', 'unit'],
      default: 'unit',
      required: 'Type cannot be blank.',
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
  },
  { usePushEach: true }
)

function checkSchedule(context) {
  const getDate = (event) =>
    context.schedule[event]
      ? DateTime.fromJSDate(context.schedule[event])
      : undefined
  const invalidate = (event, key) =>
    context.invalidate(`schedule-${event}`, key)

  const end = getDate('end')
  const evaluationRequestsEnd = getDate('evaluationRequestsEnd')
  const evaluationsEnd = getDate('evaluationsEnd')
  const registrationsEnd = getDate('registrationsEnd')
  const registrationsStart = getDate('registrationsStart')
  const start = getDate('start')

  // Registration start date should be...
  if (registrationsStart) {
    // ...before registration end date.
    if (registrationsEnd && registrationsStart >= registrationsEnd) {
      invalidate(
        'registrationsStart',
        'REGISTRATIONS_START_SAME_OR_AFTER_REGISTRATIONS_END_DATE'
      )
      invalidate(
        'registrationsEnd',
        'REGISTRATIONS_END_SAME_OR_BEFORE_REGISTRATIONS_START_DATE'
      )
    }

    // ...before or equal to course start date.
    if (start && registrationsStart > start) {
      invalidate('registrationsStart', 'REGISTRATIONS_START_AFTER_START_DATE')
      invalidate('start', 'START_BEFORE_REGISTRATIONS_START_DATE')
    }

    // ...before course end date.
    if (end && registrationsStart >= end) {
      invalidate(
        'registrationsStart',
        'REGISTRATIONS_START_SAME_OR_AFTER_END_DATE'
      )
      invalidate('end', 'END_SAME_OR_BEFORE_REGISTRATIONS_START_DATE')
    }

    // ...before evaluation requests end date.
    if (evaluationRequestsEnd && registrationsStart >= evaluationRequestsEnd) {
      invalidate(
        'registrationsStart',
        'REGISTRATIONS_START_SAME_OR_AFTER_EVALUATION_REQUESTS_END_DATE'
      )
      invalidate(
        'evaluationRequestsEnd',
        'EVALUATION_REQUESTS_END_SAME_OR_BEFORE_REGISTRATIONS_START_DATE'
      )
    }

    // ...before evaluations end date.
    if (evaluationsEnd && registrationsStart >= evaluationsEnd) {
      invalidate(
        'registrationsStart',
        'REGISTRATIONS_START_SAME_OR_AFTER_EVALUATIONS_END_DATE'
      )
      invalidate(
        'evaluationsEnd',
        'EVALUATIONS_END_SAME_OR_BEFORE_REGISTRATIONS_START_DATE'
      )
    }
  }

  // Registration end date should be...
  if (registrationsEnd) {
    // ...before course end date (if there are no evaluations end)..
    if (!evaluationsEnd && end && registrationsEnd >= end) {
      invalidate('registrationsEnd', 'REGISTRATIONS_END_SAME_OR_AFTER_END_DATE')
      invalidate('end', 'END_SAME_OR_BEFORE_REGISTRATIONS_END_DATE')
    }

    // ...before evaluations end date.
    if (evaluationsEnd && registrationsEnd >= evaluationsEnd) {
      invalidate(
        'registrationsEnd',
        'REGISTRATIONS_END_SAME_OR_AFTER_EVALUATIONS_END_DATE'
      )
      invalidate(
        'evaluationsEnd',
        'EVALUATIONS_END_SAME_OR_BEFORE_REGISTRATIONS_END_DATE'
      )
    }
  }

  // Course start date should be...
  if (start) {
    // ...before course end date.
    if (end && start >= end) {
      invalidate('start', 'START_SAME_OR_AFTER_END_DATE')
      invalidate('end', 'END_SAME_OR_BEFORE_START_DATE')
    }

    // ...before evaluation requests end date.
    if (evaluationRequestsEnd && start >= evaluationRequestsEnd) {
      invalidate('start', 'START_SAME_OR_AFTER_EVALUATION_REQUESTS_END_DATE')
      invalidate(
        'evaluationRequestsEnd',
        'EVALUATION_REQUESTS_END_SAME_OR_BEFORE_START_DATE'
      )
    }

    // ...before evaluations end date.
    if (evaluationsEnd && start >= evaluationsEnd) {
      invalidate('start', 'START_SAME_OR_AFTER_EVALUATIONS_END_DATE')
      invalidate('evaluationsEnd', 'EVALUATIONS_END_SAME_OR_BEFORE_START_DATE')
    }
  }

  // Course end date should be...
  if (end) {
    // ...after evaluations requests end date (if there are no evaluations end).
    if (
      !evaluationsEnd &&
      evaluationRequestsEnd &&
      end <= evaluationRequestsEnd
    ) {
      invalidate('end', 'END_SAME_OR_BEFORE_EVALUATION_REQUESTS_END_DATE')
      invalidate(
        'evaluationRequestsEnd',
        'EVALUATION_REQUESTS_END_SAME_OR_AFTER_END_DATE'
      )
    }

    // ...before or equal to evaluations end date.
    if (evaluationsEnd && end >= evaluationsEnd) {
      invalidate('end', 'END_SAME_OR_AFTER_EVALUATIONS_END_DATE')
      invalidate('evaluationsEnd', 'EVALUATIONS_END_SAME_OR_BEFORE_END_DATE')
    }
  }

  // Evaluation requests end date should be before evaluations end date.
  if (
    evaluationRequestsEnd &&
    evaluationsEnd &&
    evaluationRequestsEnd >= evaluationsEnd
  ) {
    invalidate(
      'evaluationRequestsEnd',
      'EVALUATION_REQUESTS_END_SAME_OR_AFTER_EVALUATIONS_END_DATE'
    )
    invalidate(
      'evaluationsEnd',
      'EVALUATIONS_END_SAME_OR_BEFORE_EVALUATION_REQUESTS_END_DATE'
    )
  }
}

CourseSchema.pre('validate', function (next) {
  // There must be at least one basic competency.
  if (!this.competencies.some((c) => c.category === 'basic')) {
    this.invalidate('competencies', 'MISSING_BASIC_COMPETENCY')
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

  // Schedule must be coherent.
  if (this.schedule) {
    checkSchedule(this)
  }

  // Teaching group names must be all different.
  if (this.groups?.teaching?.length) {
    const groups = new Set()
    if (
      this.groups.teaching
        .filter((g) => g.name?.length)
        .some((g) => groups.size === groups.add(g.name).size)
    ) {
      this.invalidate('groups', 'DUPLICATE_TEACHING_GROUP_NAMES')
    }
  }

  next()
})

// Generate full path for the banner.
CourseSchema.post(['aggregate', 'find', 'findOne'], getPathCompleter('courses'))
CourseSchema.pre('save', getBannerPathCleaner)

export default mongoose.model('Course', CourseSchema)
