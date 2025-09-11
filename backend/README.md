# Blue Carbon Backend API

This is the backend API for the Blue Carbon project data management system.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Install MongoDB**
   - Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud) by updating the MONGODB_URI in .env

3. **Create uploads directory**
   ```bash
   mkdir uploads
   ```

4. **Start the server**
   ```bash
   npm run dev  # For development with auto-reload
   # or
   npm start    # For production
   ```

## API Endpoints

- `GET /api/projects` - Get all project data (with optional filters)
- `GET /api/projects/:id` - Get single project data
- `POST /api/projects` - Create new project data
- `PATCH /api/projects/:id/status` - Update project status
- `DELETE /api/projects/:id` - Delete project data
- `GET /api/health` - Health check

## Environment Variables

- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string

## File Upload Support

The API supports photo and video uploads via multipart/form-data:
- Photos: max 5 files, 10MB each
- Videos: max 3 files, 10MB each
