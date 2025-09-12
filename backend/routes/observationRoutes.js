const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Observation = require('../models/Observation');
const Project = require('../models/Project');

// @route   POST api/observations
// @desc    Create an observation
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('project', 'Project ID is required').not().isEmpty(),
      check('mangroveSpecies', 'Mangrove species is required').not().isEmpty(),
      check('treeHeight', 'Tree height is required').isNumeric(),
      check('dbh', 'DBH is required').isNumeric(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if project exists
      const project = await Project.findById(req.body.project);
      if (!project) {
        return res.status(404).json({ msg: 'Project not found' });
      }

      // Check if user has access to the project
      if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Not authorized' });
      }

      const observation = new Observation({
        ...req.body,
        recordedBy: req.user.id,
      });

      await observation.save();
      res.status(201).json(observation);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/observations
// @desc    Get all observations for a project
// @access  Private
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    // Check if project exists and user has access
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const observations = await Observation.find({ project: req.params.projectId })
      .populate('recordedBy', 'name email')
      .sort({ observationDate: -1 });

    res.json(observations);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Project not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/observations/:id
// @desc    Get observation by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id)
      .populate('recordedBy', 'name email')
      .populate('verifiedBy', 'name email');

    if (!observation) {
      return res.status(404).json({ msg: 'Observation not found' });
    }

    // Check if user has access to the project
    const project = await Project.findById(observation.project);
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(observation);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Observation not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PATCH api/observations/:id/verify
// @desc    Verify an observation
// @access  Private (Admin only)
router.patch('/:id/verify', auth, async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({ msg: 'Observation not found' });
    }

    // Only admin can verify observations
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    observation.status = 'verified';
    observation.verifiedBy = req.user.id;
    observation.verificationNotes = req.body.notes || '';

    await observation.save();
    res.json(observation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/observations/:id
// @desc    Delete an observation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({ msg: 'Observation not found' });
    }

    // Check if user is the creator or admin
    if (observation.recordedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await observation.remove();
    res.json({ msg: 'Observation removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Observation not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
