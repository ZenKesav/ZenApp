const fs = require('fs');
const path = require('path');
const uploadConfig = require('../../config/upload.config');

const sanitizeFileName = (fileName) => {
  return String(fileName || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
};

const deleteFiles = async (filePaths = []) => {
  const promises = filePaths.map(async (filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (e) {
      // Non-fatal cleanup warning
    }
  });
  await Promise.all(promises);
};

module.exports = {
  sanitizeFileName,
  deleteFiles
};
