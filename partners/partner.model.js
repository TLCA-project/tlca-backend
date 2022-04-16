import mongoose from 'mongoose';
import { getPathCompleter } from '../lib/models.js';

const { model, Schema } = mongoose;

const PartnerSchema = new Schema({
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
  abbreviation: {
    type: String
  },
  representative: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'Representative cannot be blank.'
  },
  description: {
    type: String,
    required: 'Description cannot be blank.'
  },
  logo: {
    type: String,
    trim: true
  },
  banner: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
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

// Generate full path for the banner and the logo.
const pathCompleter = getPathCompleter('partners');
PartnerSchema.post('aggregate', pathCompleter);
PartnerSchema.post('find', pathCompleter);
PartnerSchema.post('findOne', pathCompleter);

export default model('Partner', PartnerSchema);
