const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      required: true
    },
    postalCode: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    theme: {
      primaryColor: {
        type: String,
        default: '#005AC6'
      },
      secondaryColor: {
        type: String,
        default: '#4CAF50'
      }
    },
    features: {
      gpsTracking: {
        type: Boolean,
        default: true
      },
      offlineMode: {
        type: Boolean,
        default: true
      },
      dataExport: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
organizationSchema.index({ 'address.coordinates': '2dsphere' });

module.exports = mongoose.model('Organization', organizationSchema);
