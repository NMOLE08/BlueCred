const express = require('express');
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

// In-memory database for testing
let projectsDatabase = [];
let projectIdCounter = 1;

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
app.get('/api/projects', (req, res) => {
  try {
    const { status, dataType, startDate, endDate } = req.query;
    let filteredProjects = [...projectsDatabase];

    if (status) {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    }
    if (dataType) {
      filteredProjects = filteredProjects.filter(p => p.dataType === dataType);
    }
    if (startDate || endDate) {
      filteredProjects = filteredProjects.filter(p => {
        const projectDate = new Date(p.submissionDate);
        if (startDate && projectDate < new Date(startDate)) return false;
        if (endDate && projectDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort by submission date (newest first)
    filteredProjects.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    
    res.json(filteredProjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project data
app.get('/api/projects/:id', (req, res) => {
  try {
    const project = projectsDatabase.find(p => p._id === req.params.id);
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
]), (req, res) => {
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

    // Validate required fields
    if (!dataType || !healthStatus || !saplingsPlanted || !avgSaplingHeight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProject = {
      _id: `project_${projectIdCounter++}`,
      projectName: projectName || 'Seagrass Meadows',
      projectId: projectId || 'STK1234',
      dataType,
      healthStatus,
      saplingsPlanted: parseInt(saplingsPlanted),
      avgSaplingHeight: parseFloat(avgSaplingHeight),
      location: location || 'Tamil Nadu, India',
      organization: organization || 'Organization',
      status: 'Pending',
      submissionDate: new Date().toISOString(),
      photos: [],
      videos: []
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.photos) {
        newProject.photos = req.files.photos.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path
        }));
      }
      if (req.files.videos) {
        newProject.videos = req.files.videos.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path
        }));
      }
    }

    // Add to in-memory database
    projectsDatabase.push(newProject);
    
    console.log('New project added:', newProject);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update project status (for verification)
app.patch('/api/projects/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const projectIndex = projectsDatabase.findIndex(p => p._id === req.params.id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    projectsDatabase[projectIndex].status = status;
    res.json(projectsDatabase[projectIndex]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete project data
app.delete('/api/projects/:id', (req, res) => {
  try {
    const projectIndex = projectsDatabase.findIndex(p => p._id === req.params.id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    projectsDatabase.splice(projectIndex, 1);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Blue Carbon API is running',
    projectCount: projectsDatabase.length,
    timestamp: new Date().toISOString()
  });
});

// Add some sample data for testing
projectsDatabase.push({
  _id: 'sample_1',
  projectName: 'Seagrass Meadows',
  projectId: 'STK1234',
  dataType: 'Project',
  healthStatus: 'Good',
  saplingsPlanted: 150,
  avgSaplingHeight: 25.5,
  location: 'Tamil Nadu, India',
  organization: 'Marine Conservation Society',
  status: 'Pending',
  submissionDate: new Date().toISOString(),
  photos: [],
  videos: []
});

projectsDatabase.push({
  _id: 'sample_2',
  projectName: 'Mangrove Restoration',
  projectId: 'MNG5678',
  dataType: 'Observation',
  healthStatus: 'Fair',
  saplingsPlanted: 200,
  avgSaplingHeight: 18.3,
  location: 'West Bengal, India',
  organization: 'Coastal Restoration Initiative',
  status: 'In Review',
  submissionDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  photos: [],
  videos: []
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
  console.log(`Sample projects loaded: ${projectsDatabase.length}`);
  console.log('API endpoints:');
  console.log('  GET /api/health - Health check');
  console.log('  GET /api/projects - Get all projects');
  console.log('  POST /api/projects - Create new project');
  console.log('  PATCH /api/projects/:id/status - Update project status');
});
