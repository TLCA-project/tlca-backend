import mongoose from 'mongoose';

const { Schema } = mongoose;

const CompetencySchema = new Schema({
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
    type: String
  },
  type: {
    type: String,
    enum: ['theoretical', 'practical']
  },
  public: {
    type: Boolean
  },
  partners: {
    type: [{
      type: Schema.ObjectId,
      ref: 'Partner'
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

export default mongoose.model('Competency', CompetencySchema);
