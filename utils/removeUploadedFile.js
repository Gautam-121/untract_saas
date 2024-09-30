const fs = require("fs");

// Function to remove uploaded files
function removeUploadedFiles(files) {
  if (!files) return;

  // Remove logo file
  if (files.logo && files.logo.length > 0) {
    try {
      if (fs.existsSync(files.logo?.[0]?.path)) {
        fs.unlinkSync(files.logo?.[0]?.path); // Remove file synchronously
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  }

  if (files.coverImage && files.coverImage.length > 0) {
    try {
      if (fs.existsSync(files.coverImage?.[0]?.path)) {
        fs.unlinkSync(files.coverImage?.[0]?.path); // Remove file synchronously
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  }
}

module.exports = removeUploadedFiles