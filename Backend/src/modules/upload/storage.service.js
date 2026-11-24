const fs = require('fs');
const path = require('path');
const uploadConfig = require('../../config/upload.config');

const StorageService = {

  getDiskPath(subfolder, fileName) {
    return path.join(uploadConfig.uploadDir, subfolder, fileName);
  },


  async saveFile(subfolder, fileName, buffer) {
    const targetFolder = path.join(uploadConfig.uploadDir, subfolder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    const fullPath = path.join(targetFolder, fileName);
    await fs.promises.writeFile(fullPath, buffer);
    return `/api/v1/uploads/${subfolder}/${fileName}`;
  },


  async deleteFile(subfolder, fileName) {
    const fullPath = path.join(uploadConfig.uploadDir, subfolder, fileName);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

};

module.exports = StorageService;
