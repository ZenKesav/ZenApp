const express = require('express');
const router = express.Router();
const Stage08Controller = require('./stage08.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage08Controller.run);
router.post('/test', optionalAuth, Stage08Controller.submitTest);
router.post('/validate', optionalAuth, Stage08Controller.validatePair);
router.post('/seal', optionalAuth, Stage08Controller.submitSeal);
router.get('/records', optionalAuth, Stage08Controller.getRecords);
router.get('/:meterNo', optionalAuth, Stage08Controller.getStatus);

module.exports = router;
