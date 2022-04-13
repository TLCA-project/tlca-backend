import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ProgramSchema = new Schema({
  code: {
    type: String,
    trim: true,
    required: 'Code cannot be blank.',
    unique: true
  },
  name: {
    type: String,
    default: '',
    trim: true,
    required: 'Name cannot be blank.'
  },
  description: {
    type: String,
    required: 'Description cannot be blank.'
  },
  courses: {
    type: [{
      type: Schema.ObjectId,
      ref: 'Course'
    }],
    default: undefined
  },
  created: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

export default mongoose.model('Program', ProgramSchema);
