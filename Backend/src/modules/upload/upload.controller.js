const UploadService = require('./upload.service');

const UploadController = {
  async upload(req, res, next) {
    try {
      const { fileData, base64, fileName, targetFolder } = req.body || {};
      const payloadData = fileData || base64;
      if (!payloadData) {
        return res.status(400).json({ success: false, message: 'fileData / base64 is required' });
      }

      const result = await UploadService.uploadBase64(payloadData, fileName || 'file', targetFolder || 'images');
      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async list(req, res, next) {
    try {
      const folder = req.query.folder || 'images';
      const files = await UploadService.listFiles(folder);
      return res.status(200).json({ success: true, count: files.length, data: files });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UploadController;
