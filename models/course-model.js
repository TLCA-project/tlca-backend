import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const CompetencySchema = new Schema({
  competency: {
    type: Schema.ObjectId,
    ref: 'Competency'
  },
  category: {
    type: String,
    enum: ['basic', 'advanced']
  },
  subcategory: {
    type: String,
    trim: true
  }
}, {
  id: false,
  _id: false
});

const GroupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  supervisor: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  id: false,
  _id: false
});

const ProgressStepSchema = new Schema({
  date: {
    type: Date,
    required: true
  },
  progress: {
    basic: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    advanced: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    }
  }
}, {
  id: false,
  _id: false
});

const ScheduleSchema = new Schema({
  start: {
    type: Date
  },
  end: {
    type: Date
  },
  registrationsStart: {
    type: Date
  },
  registrationsEnd: {
    type: Date
  },
  evaluationsEnd: {
    type: Date
  }
}, {
  id: false,
  _id: false
});

const CourseSchema = new Schema({
  code: {
    type: String,
    trim: true,
    required: 'Code cannot be blank.',
    unique: true
  },
  name: {
    type: String,
    trim: true,
    required: 'Name cannot be blank.'
  },
  type: {
    type: String,
    enum: ['training', 'ucourse'],
    default: 'training',
    required: 'Type cannot be blank.'
  },
  banner: {
    type: String
  },
  schedule: {
    type: ScheduleSchema,
    default: undefined
  },
  span: {
    type: Number,
    min: 1
  },
  load: {
    type: {
      type: String,
      enum: ['weekly', 'theo+prac']
    },
    theory: {
      type: Number,
      min: 0
    },
    practice: {
      type: Number,
      min: 0
    },
    weekload: {
      type: Number,
      min: 1
    },
    ects: {
      type: Number,
      min: 0
    }
  },
  field: {
    type: String,
    trim: true
  },
  tags: {
    type: [{
      type: String,
      trim: true
    }],
    default: undefined
  },
  language: {
    type: String,
    trim: true
  },
  teachers: {
    type: [{
      type: Schema.ObjectId,
      ref: 'User'
    }],
    default: undefined
  },
  coordinator: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'Coordinator cannot be blank.'
  },
  partners: {
    type: [{
      type: Schema.ObjectId,
      ref: 'Partner'
    }],
    default: undefined
  },
  description: {
    type: String,
    trim: true,
    required: 'Description cannot be blank.'
  },
  colophon: {
    type: String,
    trim: true
  },
  competencies: {
    type: [CompetencySchema],
    default: undefined
  },
  groups: {
    type: [GroupSchema],
    default: undefined
  },
  progressGuide: {
    type: [ProgressStepSchema],
    default: undefined
  },
  visibility: {
    type: String,
    enum: ['public', 'invite-only', 'private'],
    default: 'public'
  },
  published: {
    type: Date
  },
  archived: {
    type: Date
  },
  clonedFrom: {
    type: Schema.ObjectId,
    ref: 'Course'
  },
  created: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
}, { usePushEach: true });

export default mongoose.model('Course', CourseSchema);
