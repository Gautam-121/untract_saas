const { body } = require('express-validator');

exports.create = [
    // Validate brandName
    body('brandName')
        .trim()
        .notEmpty().withMessage('Brand name is required')
        .isString().withMessage('Brand name must be a string'),

    // Validate description
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isString().withMessage('Description must be a string')
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    // Validate url (optional)
    body('url')
        .optional()
        .isURL().withMessage('URL must be a valid URL')
];

exports.update = [
    // Validate brandName (optional)
    body('brandName')
        .optional()
        .trim()
        .notEmpty().withMessage('Brand name is required')
        .isString().withMessage('Brand name must be a string'),
  
    // Validate description (optional)
    body('description')
      .optional()
      .isString().withMessage('Description must be a string')
      .trim()
      .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
    // Validate URL (optional)
    body('url')
      .optional()
      .isURL().withMessage('URL must be a valid URL'),
  
    // Ensure at least one field is provided
    body().custom((value, { req }) => {
      const { brandName, description, url } = req.body;
      if (!brandName && !description && !url) {
        throw new Error('Please provide at least one field: brandName, description, or url');
      }
      return true;
    })
];
  

