const express = require('express');
const router = express.Router();
const Stage07Controller = require('./stage07.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage07Controller.run);
router.post('/test', optionalAuth, Stage07Controller.submitTest);
router.post('/relay', optionalAuth, Stage07Controller.relay);
router.get('/records', optionalAuth, Stage07Controller.getRecords);
router.get('/:meterNo', optionalAuth, Stage07Controller.getStatus);

module.exports = router;
