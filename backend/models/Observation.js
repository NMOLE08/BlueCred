const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  observationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Mangrove specific data
  mangroveSpecies: {
    type: String,
    required: true
  },
  treeHeight: {
    type: Number, // in meters
    required: true
  },
  dbh: {
    type: Number, // Diameter at Breast Height in cm
    required: true
  },
  canopyCover: {
    type: Number, // percentage
    min: 0,
    max: 100
  },
  // Environmental data
  salinity: Number, // ppt
  temperature: Number, // in Celsius
  ph: Number, // pH level
  // Additional observations
  notes: String,
  // References to media files
  photos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationNotes: String
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
observationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Observation', observationSchema);
