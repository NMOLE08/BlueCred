const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Organization = require('../models/Organization');

// @route   POST api/organizations
// @desc    Create an organization
// @access  Private (Admin only)
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('contactEmail', 'Please include a valid email').isEmail(),
    ],
  ],
  async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if organization already exists
      let organization = await Organization.findOne({ name: req.body.name });
      if (organization) {
        return res.status(400).json({ msg: 'Organization already exists' });
      }

      organization = new Organization({
        ...req.body,
        createdBy: req.user.id,
      });

      await organization.save();
      res.status(201).json(organization);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/organizations
// @desc    Get all organizations
// @access  Public
router.get('/', async (req, res) => {
  try {
    const organizations = await Organization.find().select('-settings');
    res.json(organizations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/organizations/:id
// @desc    Get organization by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).select('-settings');
    
    if (!organization) {
      return res.status(404).json({ msg: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Organization not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PATCH api/organizations/:id
// @desc    Update an organization
// @access  Private (Admin only)
router.patch('/:id', auth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  const updates = Object.keys(req.body);
  const allowedUpdates = [
    'name',
    'description',
    'website',
    'logo',
    'contactEmail',
    'contactPhone',
    'address',
    'isActive',
    'settings',
  ];
  
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).send();
    }

    updates.forEach((update) => (organization[update] = req.body[update]));
    await organization.save();

    res.json(organization);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Organization not found' });
    }
    res.status(400).send(err);
  }
});

// @route   DELETE api/organizations/:id
// @desc    Delete an organization
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({ msg: 'Organization not found' });
    }

    // TODO: Check if there are any users or projects associated with this organization
    // If yes, prevent deletion or handle cascading delete

    await organization.remove();
    res.json({ msg: 'Organization removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Organization not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
