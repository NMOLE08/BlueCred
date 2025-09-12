const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Media = require('../models/Media');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images and videos
  const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Only image and video files are allowed!');
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: fileFilter,
});

// @route   POST api/media/upload
// @desc    Upload a file
// @access  Private
router.post('/upload', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const { originalname, mimetype, filename, size, path: filePath } = req.file;
    
    // Determine media type
    let mediaType = 'document';
    if (mimetype.startsWith('image/')) {
      mediaType = 'photo';
    } else if (mimetype.startsWith('video/')) {
      mediaType = 'video';
    }

    const media = new Media({
      filename,
      originalName: originalname,
      mimeType: mimetype,
      size,
      path: filePath,
      url: `/uploads/${filename}`,
      mediaType,
      uploadedBy: req.user.id,
      metadata: {
        originalName: originalname,
        mimeType: mimetype,
        size,
      },
    });

    await media.save();
    res.json(media);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/media
// @desc    Get all media for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const media = await Media.find({ uploadedBy: req.user.id })
      .sort({ createdAt: -1 });
    res.json(media);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/media/:id
// @desc    Get media by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ msg: 'Media not found' });
    }

    // Check if user has access to the media
    if (media.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(media);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Media not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/media/:id
// @desc    Delete media
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({ msg: 'Media not found' });
    }

    // Check if user has access to the media
    if (media.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', media.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await media.remove();
    res.json({ msg: 'Media removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Media not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
