const { body ,query , param } = require('express-validator');


// Recursive validation function for `subVideo`
const validateSubVideoRecursively = (subVideo) => {
  // Validate the current level of `subVideo`
  if (subVideo === null || typeof subVideo !== 'object') {
    throw new Error('subVideo must be an object');
  }
  if (!subVideo?.id || subVideo?.id.trim() === '' || typeof subVideo?.id !== 'string') {
    throw new Error('subVideo id is required and must be a non-empty string');
  }
  if (!subVideo?.videoSrc || subVideo?.videoSrc.trim() === '' || typeof subVideo?.videoSrc !== 'string') {
    throw new Error('subVideo videoSrc is required and must be a non-empty string');
  }
  // Check if videoSrc is a valid URL
  const urlPattern = /^https?:\/\/.*/;
  if (!urlPattern.test(subVideo?.videoSrc)) {
    throw new Error('Invalid subVideo videoSrc URL');
  }

  if(!subVideo?.thumbnail || typeof subVideo?.thumbnail !== "object"){
    throw new Error("subVideo thumbnail is required and must be object")
  }

  if (!subVideo?.thumbnail?.url || !subVideo?.thumbnail?.url.trim() == '' || typeof subVideo?.thumbnail?.url !== 'string' ) {
    throw new Error('subVideo thumbanil url is required and must be a non-empty string');
  }

  if (!urlPattern.test(subVideo?.thumbnail?.url)) {
    throw new Error('Invalid subVideo thumbnail URL');
  }

  if (!subVideo?.thumbnail?.timestamp || !subVideo?.thumbnail?.timestamp.trim() !== '' || typeof subVideo?.thumbnail?.timestamp !== 'string'  ) {
    throw new Error('subVideo thumbanil timestamp is required and must be a non-empty string');
  }

  if (!/^(?:[0-5][0-9]):(?:[0-5][0-9])$/.test(subVideo?.thumbnail?.timestamp)) {
    throw new Error('Invalid timestamp format, must be MM:SS with MM and SS in valid ranges');
  }
  if (!subVideo?.name  || subVideo?.name.trim() === '' ||  typeof subVideo.name !== 'string') {
    throw new Error('SubVideo name must be a non-empty string');
  }
  if (!subVideo?.thumbnails  || Array.isArray(subVideo?.thumbnails)) {
    throw new Error('subVideo thumbnails must be an Array');
  }
    // Validate each thumbnail in the array
  subVideo.thumbnails.forEach((thumbnail, index) => {
      if (typeof thumbnail !== 'object' || thumbnail === null) {
        throw new Error(`Thumbnail at index ${index} must be an object`);
      }
      if (!thumbnail?.time || typeof thumbnail?.time !== 'number') {
        throw new Error(`Thumbnail at index ${index} must have a valid time field`);
      }
      if (!thumbnail?.time || typeof thumbnail?.url !== 'string') {
        throw new Error(`Thumbnail at index ${index} must be string and required`);
      }
      if(!urlPattern.test(thumbnail?.url)){
        throw new Error(`Thumbnail at index ${index} must be valid url`)
      }
  });

  // Recursively validate nested `questions` and `answers` with their `subVideo`
  if (typeof subVideo.questions === 'object' && subVideo.questions !== null) {
    for (let question of Object.values(subVideo.questions)) {
      if (typeof question.answers === 'object' && question.answers !== null) {
        for (let answer of Object.values(question.answers)) {
          if (typeof answer.subVideo === 'object' && answer.subVideo !== null) {
            validateSubVideoRecursively(answer.subVideo); // Recursive call
          }
        }
      }
    }
  }
};

exports.create = [
      body('title')
        .notEmpty().withMessage('Title field is required')
        .isString().withMessage('Title must be a string'),
      
      // body('videoFileUrl')
      //   .optional()
      //   .isArray().withMessage('videoFileUrl must be an array')
      //   .custom((urls) => urls.every(url => typeof url === 'string' && url.trim()!== ''))
      //   .withMessage('All video file URLs must be non-empty strings'),
      
      body('videoData')
        .notEmpty().withMessage('VideoData field is required')
        .isArray().withMessage('videoData must be an array')
        .custom(videoData => videoData.every(video => (
          typeof video.id === 'string' &&
          typeof video.videoSrc === 'string' &&
          typeof video.thumbnail.url === 'string' &&
          typeof video.thumbnail.timestamp === 'string' &&
          typeof video.name === 'string' &&
          Array.isArray(video.thumbnails)
        ))).withMessage('Invalid videoData format'),
      
      body('videoData.*.id')
        .notEmpty().withMessage('id field is required')
        .isString().withMessage('VideoData id must be a string'),

      body('videoData.*.videoSrc')
        .notEmpty().withMessage('Videosrc field is required')
        .isURL().withMessage('Invalid videoSrc URL'),

        body('videoData.*.thumbnail')
        .notEmpty().withMessage('Thumbnail fields is required')
        .isObject().withMessage('Thumbnail must be an object')
        .custom(thumbnail => {
            // Check that thumbnail is a non-empty object
            if (!thumbnail || typeof thumbnail !== 'object' || Array.isArray(thumbnail)) {
                throw new Error('Thumbnail must be a valid object');
            }
    
            // Check for the presence of required properties
            if (!thumbnail.hasOwnProperty('url') || !thumbnail.hasOwnProperty('timestamp')) {
                throw new Error('Thumbnail must contain both url and timestamp properties');
            }
    
            return true;
        }),
      
      body('videoData.*.thumbnail.url')
        .isURL().withMessage('Invalid thumbnail URL'),
      
      body('videoData.*.thumbnail.timestamp')
        .matches(/^(?:[0-5][0-9]):(?:[0-5][0-9])$/).withMessage('Invalid timestamp format, must be MM:SS with MM and SS in valid ranges'),
      
      body('videoData.*.name')
        .notEmpty().withMessage('Name field is required')
        .isString().withMessage('Name must be a string'),
      
        body('videoData.*.thumbnails')
        .notEmpty().withMessage("Thumbanails field is required")
        .isArray().withMessage('Thumbnails must be an array')
        .custom(thumbnails => {
          if (!Array.isArray(thumbnails)) {
            throw new Error('Thumbnails must be an array');
          }
          thumbnails.forEach((thumbnail, index) => {
            if (typeof thumbnail !== 'object' || thumbnail === null) {
              throw new Error(`Thumbnail at index ${index} must be an object`);
            }
            if (typeof thumbnail.time !== 'number') {
              throw new Error(`Thumbnail at index ${index} must be an number`);
            }
            if (typeof thumbnail.url !== 'string') {
              throw new Error(`Thumbnail at index ${index} must be an string`);
            }
            try {
              new URL(thumbnail.url); // This will throw if the URL is invalid
            } catch {
              throw new Error(`Thumbnail at index ${index} has an invalid URL format`);
            }
          });
          return true;
        }).withMessage('Invalid thumbnails format'),
    
    // Validate videoData.questions only if it exists and has length > 0
    body('videoData')
      .custom(videoData => {
      if (videoData.questions && videoData.questions.length > 0) {
        return true; // Valid, proceed to check conditions inside the questions array
      }
      return true; // No need to validate questions if they don't exist or are empty
    }),

    // // Validate questions if they exist
    // body('videoData.*.questions')
    //   .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
    //   .isArray().withMessage('Questions must be an array')
    //   .custom(questions => {
    //     if (questions.length === 0) {
    //       throw new Error('Questions array must not be empty');
    //     }
    //   return true;
    // }),

    // Validate individual question properties
    body('videoData.*.questions.*.id')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .notEmpty().withMessage('Question id field is required')
      .isString().withMessage('Question id must be a string'),

    body('videoData.*.questions.*.question')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .notEmpty().withMessage('Question field is required')
      .isString().withMessage('Question must be a string'),

    body('videoData.*.questions.*.answers')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .notEmpty().withMessage('Answers field is required')
      .isArray().withMessage('Answers must be an array')
      .custom(answers => answers.every(answer => (
          typeof answer.answer === 'string' &&
          typeof answer.id === 'string'
    ))).withMessage('Invalid answers format'),

    body('videoData.*.questions.*.multiple')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .notEmpty().withMessage('Multiple field is required')
      .isBoolean().withMessage('Multiple must be a boolean'),

    body('videoData.*.questions.*.skip')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .notEmpty().withMessage('Skip field is required')
      .isBoolean().withMessage('Skip must be a boolean'),

    body('videoData.*.questions.*.time')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .notEmpty().withMessage('Time field is required')
      .isFloat().withMessage('Time must be a valid number'),

    // Apply recursive validation for subVideo
    body('videoData.*.questions.*.answers.*.subVideo')
      .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
      .custom(subVideo => {
        try {
          validateSubVideoRecursively(subVideo);
        } catch (error) {
          throw new Error(error.message);
        }
        return true;
    }),
      
      body('videoSelectedFile')
          .notEmpty().withMessage('Selected video file is required')
          .isObject().withMessage('Selected video file must be a JSON object'),
      
        body('videoLength')
          .notEmpty().withMessage('Video length is required')
          .isInt({ min: 0 }).withMessage('Video length must be a non-negative integer'),
      
        body('isShared')
          .optional()
          .isBoolean().withMessage('isShared must be a boolean'),
      
]

exports.update = [

  param("id")
    .notEmpty().withMessage("Missing id")
    .isUUID().withMessage("Must be valid UUID"),
    
  body('title')
    .notEmpty().withMessage('Title field is required')
    .isString().withMessage('Title must be a string'),
  
  // body('videoFileUrl')
  //   .optional()
  //   .isArray().withMessage('videoFileUrl must be an array')
  //   .custom((urls) => urls.every(url => typeof url === 'string' && url.trim()!== ''))
  //   .withMessage('All video file URLs must be non-empty strings'),
  
  body('videoData')
    .notEmpty().withMessage('VideoData field is required')
    .isArray().withMessage('videoData must be an array')
    .custom(videoData => videoData.every(video => (
      typeof video.id === 'string' &&
      typeof video.videoSrc === 'string' &&
      typeof video.thumbnail.url === 'string' &&
      typeof video.thumbnail.timestamp === 'string' &&
      typeof video.name === 'string' &&
      Array.isArray(video.thumbnails)
    ))).withMessage('Invalid videoData format'),
  
  body('videoData.*.id')
    .notEmpty().withMessage('id field is required')
    .isString().withMessage('VideoData id must be a string'),

  body('videoData.*.videoSrc')
    .notEmpty().withMessage('Videosrc field is required')
    .isURL().withMessage('Invalid videoSrc URL'),

    body('videoData.*.thumbnail')
    .notEmpty().withMessage('Thumbnail fields is required')
    .isObject().withMessage('Thumbnail must be an object')
    .custom(thumbnail => {
        // Check that thumbnail is a non-empty object
        if (!thumbnail || typeof thumbnail !== 'object' || Array.isArray(thumbnail)) {
            throw new Error('Thumbnail must be a valid object');
        }

        // Check for the presence of required properties
        if (!thumbnail.hasOwnProperty('url') || !thumbnail.hasOwnProperty('timestamp')) {
            throw new Error('Thumbnail must contain both url and timestamp properties');
        }

        return true;
    }),
  
  body('videoData.*.thumbnail.url')
    .isURL().withMessage('Invalid thumbnail URL'),
  
  body('videoData.*.thumbnail.timestamp')
    .matches(/^(?:[0-5][0-9]):(?:[0-5][0-9])$/).withMessage('Invalid timestamp format, must be MM:SS with MM and SS in valid ranges'),
  
  body('videoData.*.name')
    .notEmpty().withMessage('Name field is required')
    .isString().withMessage('Name must be a string'),
  
    body('videoData.*.thumbnails')
    .notEmpty().withMessage("Thumbanails field is required")
    .isArray().withMessage('Thumbnails must be an array')
    .custom(thumbnails => {
      if (!Array.isArray(thumbnails)) {
        throw new Error('Thumbnails must be an array');
      }
      thumbnails.forEach((thumbnail, index) => {
        if (typeof thumbnail !== 'object' || thumbnail === null) {
          throw new Error(`Thumbnail at index ${index} must be an object`);
        }
        if (typeof thumbnail.time !== 'number') {
          throw new Error(`Thumbnail at index ${index} must be an number`);
        }
        if (typeof thumbnail.url !== 'string') {
          throw new Error(`Thumbnail at index ${index} must be an string`);
        }
        try {
          new URL(thumbnail.url); // This will throw if the URL is invalid
        } catch {
          throw new Error(`Thumbnail at index ${index} has an invalid URL format`);
        }
      });
      return true;
    }).withMessage('Invalid thumbnails format'),

// Validate videoData.questions only if it exists and has length > 0
body('videoData')
  .custom(videoData => {
  if (videoData.questions && videoData.questions.length > 0) {
    return true; // Valid, proceed to check conditions inside the questions array
  }
  return true; // No need to validate questions if they don't exist or are empty
}),

// // Validate questions if they exist
// body('videoData.*.questions')
//   .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
//   .isArray().withMessage('Questions must be an array')
//   .custom(questions => {
//     if (questions.length === 0) {
//       throw new Error('Questions array must not be empty');
//     }
//   return true;
// }),

// Validate individual question properties
body('videoData.*.questions.*.id')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .notEmpty().withMessage('Question id field is required')
  .isString().withMessage('Question id must be a string'),

body('videoData.*.questions.*.question')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .notEmpty().withMessage('Question field is required')
  .isString().withMessage('Question must be a string'),

body('videoData.*.questions.*.answers')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .notEmpty().withMessage('Answers field is required')
  .isArray().withMessage('Answers must be an array')
  .custom(answers => answers.every(answer => (
      typeof answer.answer === 'string' &&
      typeof answer.id === 'string'
))).withMessage('Invalid answers format'),

body('videoData.*.questions.*.multiple')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .notEmpty().withMessage('Multiple field is required')
  .isBoolean().withMessage('Multiple must be a boolean'),

body('videoData.*.questions.*.skip')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .notEmpty().withMessage('Skip field is required')
  .isBoolean().withMessage('Skip must be a boolean'),

body('videoData.*.questions.*.time')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .notEmpty().withMessage('Time field is required')
  .isFloat().withMessage('Time must be a valid number'),

// Apply recursive validation for subVideo
body('videoData.*.questions.*.answers.*.subVideo')
  .if(body('videoData.*.questions').exists().withMessage('Questions field is required'))
  .custom(subVideo => {
    try {
      validateSubVideoRecursively(subVideo);
    } catch (error) {
      throw new Error(error.message);
    }
    return true;
}),
  
  body('videoSelectedFile')
      .notEmpty().withMessage('Selected video file is required')
      .isObject().withMessage('Selected video file must be a JSON object'),
  
    body('videoLength')
      .notEmpty().withMessage('Video length is required')
      .isInt({ min: 0 }).withMessage('Video length must be a non-negative integer'),
  
    body('isShared')
      .optional()
      .isBoolean().withMessage('isShared must be a boolean'),
  
]

exports.getAll = [
  // Validate 'page' parameter
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  // Validate 'pageSize' parameter
  query('pageSize')
    .optional()
    .isInt({ min: 1 }).withMessage('PageSize must be a positive integer'),
]

exports.getById = [
    // Validate 'id' parameter
    param("id")
      .notEmpty().withMessage("Missing Id")
      .isUUID()
      .withMessage("Must be valid UUID")
]

exports.delete = [
    // Validate 'id' parameter
    param("id")
      .notEmpty().withMessage("Missing Id")
      .isUUID()
      .withMessage("Must be valid UUID")
]

exports.updateShared = [
  param('id')
    .notEmpty().withMessage('Missing Id')
    .isUUID().withMessage('Must be a valid UUID'),
  
  body('isShared')
    .notEmpty().withMessage('shared Field is required')
    .isBoolean().withMessage('shared Field must be of boolean type')
    .custom(value => value === true).withMessage('shared Field must be true'),
];

exports.getAnalytic = [
  param('id')
    .notEmpty().withMessage('Missing Id')
    .isUUID().withMessage('Must be a valid UUID'),
]

exports.summery = [
  param('id')
    .notEmpty().withMessage('Missing Id')
    .isUUID().withMessage('Must be a valid UUID'),
]
