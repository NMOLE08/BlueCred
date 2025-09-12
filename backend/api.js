const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data store (temporary, will be replaced with database)
const users = [
  { id: 1, email: 'user@example.com', password: 'password123' },
  // Add more test users as needed
];

const projects = [
  { id: 'proj_123', name: 'Mangrove Restoration Project' },
  { id: 'proj_456', name: 'Seagrass Conservation Initiative' },
  { id: 'proj_789', name: 'Coastal Wetlands Protection' },
];

// 1. User Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Find user by email (in a real app, this would query a database)
  const user = users.find(u => u.email === email);
  
  // Check if user exists and password matches
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // In a real app, generate a JWT token here
  const token = 'sample-jwt-token';
  
  // Return success response with user data (excluding password)
  const { password: _, ...userData } = user;
  res.json({ 
    message: 'Login successful', 
    user: userData,
    token 
  });
});

// 2. Get all projects
app.get('/api/projects', (req, res) => {
  // In a real app, this would query a database
  res.json(projects);
});

// 3. Add data to a project
app.post('/api/projects/:projectId/data', (req, res) => {
  const { projectId } = req.params;
  const data = req.body.data;
  
  // Basic validation
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  // Check if project exists
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // TODO: Database Integration
  // This is where you would save the data to your database
  // Example:
  // await db.collection('projectData').insertOne({
  //   projectId,
  //   data,
  //   timestamp: new Date()
  // });
  
  // TODO: Blockchain Integration
  // This is where you would add the data to the blockchain
  // Example:
  // await blockchainService.addBlock({
  //   projectId,
  //   data,
  //   timestamp: new Date().toISOString()
  // });
  
  console.log(`Received data for project ${projectId}:`, data);
  
  res.status(201).json({ 
    message: 'Data received successfully',
    projectId,
    data
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

module.exports = app;
