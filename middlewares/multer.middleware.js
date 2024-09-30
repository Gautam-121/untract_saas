const multer = require("multer");
const path = require("path")

// Storage configuration for videos
const videoStorage  = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null , "./public/temp/video")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});

// Storage configuration for thumbnails
const thumbnailStorage  = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null , "./public/temp/thumbnails")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});

const adminConfigStorage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null , "./public/temp/admin")
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
})

exports.uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {

    // Allowed image file extensions and MIME types
    const allowedExtensions = /\.(jpg|jpeg|png)$/i;
    const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
      // Check file extension
      const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
      // Check MIME type
      const mimetype = allowedMimeTypes.includes(file.mimetype);

      if (extname && mimetype) {
          return cb(null, true);
      } else {
          cb(new Error('Invalid file type. Only JPG, JPEG, and PNG formats are allowed.'));
      }
  }
})

exports.uploadVideos = multer({ 
  storage: videoStorage,
  limits: {fileSize: 100 * 1024 * 1024},
  fileFilter: function (req, file, cb) {
    const allowedExtensions = /mp4|mov|webm|mpeg|avi/i;
    // Check file extension
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    // Check MIME type
    const mimetype = allowedExtensions.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only MP4, MOV, WEBM, MPEG, and AVI video formats are allowed!'));
    }
}
})

exports.uploadAdminConfig = multer({
  storage: adminConfigStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Allowed file extensions and MIME types
    const allowedExtensions = [".jpg", ".jpeg", ".png"];
    const allowedMimeTypes = ["image/jpeg", "image/png"];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    if (allowedExtensions.includes(fileExtension) && allowedMimeTypes.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, JPEG, and PNG formats are allowed."));
    }
  },
});

// Middleware to handle Multer errors
exports.handleMulterError = function (err, req, res, next){
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: `Too many files uploaded for ${err.field}. Only ${err.field === 'logo' ? '1 logo' : '1 cover image'} is allowed.`
        });
      } else if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5 MB.'
        });
      }
    } else if (err.message === 'Invalid file type. Only jpg, jpeg, and png are allowed.') {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next(err);
}

// Middleware to handle video upload and error handling
exports.uploadVideMiddleware = function(err, req, res, next){
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: `Too many files uploaded for ${err.field}. Only 1 file is allowed.`
      });
    }
    else if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 100 MB.'
      });
    }
  } else if (err.message === 'Only MP4, MOV, WEBM, MPEG, and AVI video formats are allowed!') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next(err);
}

// Middleware to handle thumbnail upload and error handling
exports.handleThumbnailMiddleware = function(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: `Too many files uploaded for ${err.field}. Only 1 file is allowed.`
      });
    }
    else if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10 MB.'
      });
    }
  } else if (err.message === 'Invalid file type. Only JPG, JPEG, and PNG formats are allowed.') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next(err);
}


