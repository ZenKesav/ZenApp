const fs = require('fs');
const path = require('path');
const uploadConfig = require('../../config/upload.config');
const { sanitizeFileName } = require('../helpers/file.helper');

/**
 * Handles Base64 Image/PDF payload decoding and disk storage
 */
async function processBase64Upload(base64Data, originalFileName, targetSubdir = 'images') {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Invalid base64 payload provided.');
  }

  const match = base64Data.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Unsupported or malformed base64 file data string.');
  }

  const mimeType = match[1].toLowerCase();
  const fileExtension = uploadConfig.allowedMimeTypes[mimeType];
  if (!fileExtension) {
    throw new Error(`MIME type '${mimeType}' is not allowed. Allowed types: JPG, PNG, PDF.`);
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > uploadConfig.maxFileSize) {
    throw new Error(`File size exceeds limit of ${uploadConfig.maxFileSize / (1024 * 1024)}MB.`);
  }

  const targetDir = path.join(uploadConfig.uploadDir, targetSubdir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const safeBase = sanitizeFileName(path.parse(originalFileName || 'upload').name);
  const uniqueName = `${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
  const diskPath = path.join(targetDir, uniqueName);

  await fs.promises.writeFile(diskPath, buffer);

  const fileUrl = `/api/v1/uploads/${targetSubdir}/${uniqueName}`;
  return {
    fileName: uniqueName,
    diskPath,
    fileUrl,
    fileSize: buffer.length,
    mimeType
  };
}

module.exports = {
  processBase64Upload
};
