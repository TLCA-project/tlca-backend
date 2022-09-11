import mongoose from 'mongoose'
import { getBannerPathCleaner, getPathCompleter } from '../lib/models.js'

const { model, Schema } = mongoose

const PartnerSchema = new Schema({
  abbreviation: {
    type: String,
    trim: true,
  },
  banner: {
    type: String,
    trim: true,
  },
  code: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  representative: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  website: {
    type: String,
    trim: true,
  },
})

// Generate full path for the banner and the logo.
PartnerSchema.post(
  ['aggregate', 'find', 'findOne'],
  getPathCompleter('partners')
)
PartnerSchema.pre('save', getBannerPathCleaner)

export default model('Partner', PartnerSchema)
