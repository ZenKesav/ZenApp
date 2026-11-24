const { processBase64Upload } = require('../../core/middlewares/upload.middleware');
const fs = require('fs');
const path = require('path');
const uploadConfig = require('../../config/upload.config');

const UploadService = {

  async uploadBase64(base64Data, fileName, targetFolder = 'images') {
    return await processBase64Upload(base64Data, fileName, targetFolder);
  },


  async listFiles(subfolder = 'images') {
    const dir = path.join(uploadConfig.uploadDir, subfolder);
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = await fs.promises.readdir(dir);
    return files.map(file => ({
      fileName: file,
      url: `/api/v1/uploads/${subfolder}/${file}`
    }));
  }

};

module.exports = UploadService;
