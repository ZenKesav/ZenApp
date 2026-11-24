const express = require('express');
const router = express.Router();
const Stage01Controller = require('./stage01.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage01Controller.run);
router.post('/test', optionalAuth, Stage01Controller.submitTest);
router.post('/flash', optionalAuth, Stage01Controller.flashMcu);
router.post('/verify', optionalAuth, Stage01Controller.verifyChecksum);
router.get('/records', optionalAuth, Stage01Controller.getRecords);
router.get('/:meterNo', optionalAuth, Stage01Controller.getStatus);

module.exports = router;
