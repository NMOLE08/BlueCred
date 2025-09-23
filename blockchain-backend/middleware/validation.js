const mongoose = require('mongoose');

// Validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format.'
    });
  }
  
  next();
};

// Validate project data
const validateProjectData = (req, res, next) => {
  const {
    projectName,
    projectDescription,
    projectLocation,
    projectType,
    ngoId
  } = req.body;

  const errors = [];

  if (!projectName || projectName.trim().length < 3) {
    errors.push('Project name must be at least 3 characters long.');
  }

  if (!projectDescription || projectDescription.trim().length < 10) {
    errors.push('Project description must be at least 10 characters long.');
  }

  if (!projectLocation || projectLocation.trim().length < 3) {
    errors.push('Project location is required.');
  }

  if (!projectType || !['mangrove', 'seagrass', 'saltmarsh', 'other'].includes(projectType)) {
    errors.push('Project type must be one of: mangrove, seagrass, saltmarsh, other.');
  }

  if (!ngoId || !mongoose.Types.ObjectId.isValid(ngoId)) {
    errors.push('Valid NGO ID is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors
    });
  }

  next();
};

// Validate ML analysis data
const validateMLAnalysis = (req, res, next) => {
  const {
    carbonCreditsCalculated,
    confidenceScore,
    modelVersion
  } = req.body;

  const errors = [];

  if (carbonCreditsCalculated === undefined || carbonCreditsCalculated === null) {
    errors.push('Carbon credits calculated is required.');
  } else if (typeof carbonCreditsCalculated !== 'number' || carbonCreditsCalculated <= 0) {
    errors.push('Carbon credits calculated must be a positive number.');
  }

  if (confidenceScore === undefined || confidenceScore === null) {
    errors.push('Confidence score is required.');
  } else if (typeof confidenceScore !== 'number' || confidenceScore < 0 || confidenceScore > 1) {
    errors.push('Confidence score must be a number between 0 and 1.');
  }

  if (!modelVersion || typeof modelVersion !== 'string') {
    errors.push('Model version is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'ML analysis validation failed.',
      errors
    });
  }

  next();
};

// Validate verification data
const validateVerificationData = (req, res, next) => {
  const {
    verificationAction,
    approvedCredits,
    comments
  } = req.body;

  const errors = [];

  if (!verificationAction || !['approved', 'rejected', 'requested_changes'].includes(verificationAction)) {
    errors.push('Verification action must be one of: approved, rejected, requested_changes.');
  }

  if (verificationAction === 'approved') {
    if (approvedCredits === undefined || approvedCredits === null) {
      errors.push('Approved credits amount is required for approval.');
    } else if (typeof approvedCredits !== 'number' || approvedCredits <= 0) {
      errors.push('Approved credits must be a positive number.');
    }
  }

  if (!comments || comments.trim().length < 10) {
    errors.push('Comments must be at least 10 characters long.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Verification validation failed.',
      errors
    });
  }

  next();
};

// Validate NGO data
const validateNGOData = (req, res, next) => {
  const {
    appAccountId,
    organizationName,
    email,
    contactPerson,
    phone,
    address,
    registrationNumber
  } = req.body;

  const errors = [];

  if (!appAccountId || appAccountId.trim().length < 3) {
    errors.push('App account ID must be at least 3 characters long.');
  }

  if (!organizationName || organizationName.trim().length < 3) {
    errors.push('Organization name must be at least 3 characters long.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email address is required.');
  }

  if (!contactPerson || contactPerson.trim().length < 2) {
    errors.push('Contact person name is required.');
  }

  if (!phone || phone.trim().length < 10) {
    errors.push('Valid phone number is required.');
  }

  if (!address || address.trim().length < 10) {
    errors.push('Complete address is required.');
  }

  if (!registrationNumber || registrationNumber.trim().length < 5) {
    errors.push('Registration number is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'NGO validation failed.',
      errors
    });
  }

  next();
};

module.exports = {
  validateObjectId,
  validateProjectData,
  validateMLAnalysis,
  validateVerificationData,
  validateNGOData
};
