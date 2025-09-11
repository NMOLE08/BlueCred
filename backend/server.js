const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecarbon', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Blue Carbon Project Schema
const projectDataSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    default: 'Seagrass Meadows'
  },
  projectId: {
    type: String,
    required: true,
    default: 'STK1234'
  },
  dataType: {
    type: String,
    required: true,
    enum: ['Project', 'Observation']
  },
  healthStatus: {
    type: String,
    required: true,
    enum: ['Good', 'Fair', 'Poor']
  },
  saplingsPlanted: {
    type: Number,
    required: true,
    min: 0
  },
  avgSaplingHeight: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    type: String,
    default: 'Tamil Nadu, India'
  },
  organization: {
    type: String,
    default: 'Organization'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Review', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  photos: [{
    filename: String,
    originalName: String,
    path: String
  }],
  videos: [{
    filename: String,
    originalName: String,
    path: String
  }]
});

const ProjectData = mongoose.model('ProjectData', projectDataSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes

// Get all project data with optional filtering
app.get('/api/projects', async (req, res) => {
  try {
    const { status, dataType, startDate, endDate } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (dataType) filter.dataType = dataType;
    if (startDate || endDate) {
      filter.submissionDate = {};
      if (startDate) filter.submissionDate.$gte = new Date(startDate);
      if (endDate) filter.submissionDate.$lte = new Date(endDate);
    }

    const projects = await ProjectData.find(filter).sort({ submissionDate: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project data
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await ProjectData.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new project data
app.post('/api/projects', upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'videos', maxCount: 3 }
]), async (req, res) => {
  try {
    const {
      projectName,
      projectId,
      dataType,
      healthStatus,
      saplingsPlanted,
      avgSaplingHeight,
      location,
      organization
    } = req.body;

    const projectData = new ProjectData({
      projectName,
      projectId,
      dataType,
      healthStatus,
      saplingsPlanted: parseInt(saplingsPlanted),
      avgSaplingHeight: parseFloat(avgSaplingHeight),
      location,
      organization
    });

    // Handle file uploads
    if (req.files) {
      if (req.files.photos) {
        projectData.photos = req.files.photos.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path
        }));
      }
      if (req.files.videos) {
        projectData.videos = req.files.videos.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path
        }));
      }
    }

    const savedProject = await projectData.save();
    res.status(201).json(savedProject);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update project status (for verification)
app.patch('/api/projects/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const project = await ProjectData.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete project data
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const project = await ProjectData.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blue Carbon API is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Blue Carbon API server running on port ${PORT}`);
});
