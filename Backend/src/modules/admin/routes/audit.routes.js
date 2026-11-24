const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const { authenticate } = require('../../../core/middlewares/auth.middleware');

router.use(authenticate);

router.get('/', AuditController.getAuditLogs);

module.exports = router;
