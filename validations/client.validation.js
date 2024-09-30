const { body , param } = require('express-validator');

exports.register = [
    // Validate brandName
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail()
        .withMessage("Must be valid Email"),

    param("id")
        .notEmpty().withMessage("missing param id")
        .isUUID()
        .withMessage("Must be valid UUID")
];

exports.verifyOtp = [
    // Validate email
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail()
        .withMessage("Must be valid email"),
    
    // Validate otp
    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isString()
        .withMessage("OTP must be in string"),

    param("id")
        .notEmpty().withMessage("missing param id")
        .isUUID()
        .withMessage("Must be valid UUID")
];

exports.socialLogin = [
    // Validate email
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail()
        .withMessage("Must be valid Email"),

    param("id")
        .notEmpty().withMessage("missing param id")
        .isUUID()
        .withMessage("Must be valid UUID")
];

exports.getBranding = [
    param("id")
        .notEmpty().withMessage("missing param id")
        .isUUID()
        .withMessage("Must be valid UUID")
]

exports.getCampaign = [
    param("id")
        .notEmpty().withMessage("missing param id")
        .isUUID()
        .withMessage("Must be valid UUID")
]

exports.getFeedBack = [
    param("id")
        .notEmpty().withMessage("missing param id")
        .isUUID()
        .withMessage("Must be valid UUID")
]


  

