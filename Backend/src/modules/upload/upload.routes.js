const express = require('express');
const router = express.Router();
const UploadController = require('./upload.controller');
const { optionalAuth } = require('../../core/middlewares/auth.middleware');

router.post('/', optionalAuth, UploadController.upload);
router.get('/', optionalAuth, UploadController.list);

module.exports = router;
