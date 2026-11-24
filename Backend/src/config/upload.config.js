const path = require('path');

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

module.exports = {
  uploadDir: UPLOADS_ROOT,
  actualPrintDir: path.join(UPLOADS_ROOT, 'actual-print'),
  imagesDir: path.join(UPLOADS_ROOT, 'images'),
  pdfDir: path.join(UPLOADS_ROOT, 'pdf'),
  templatesDir: path.join(UPLOADS_ROOT, 'templates'),
  tempDir: path.join(UPLOADS_ROOT, 'temp'),
  maxFileSize: 25 * 1024 * 1024, // 25MB
  allowedMimeTypes: {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf'
  }
};
