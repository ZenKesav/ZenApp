const express = require('express');
const router = express.Router();
const Stage06Controller = require('./stage06.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage06Controller.run);
router.post('/test', optionalAuth, Stage06Controller.submitTest);
router.post('/calibrate', optionalAuth, Stage06Controller.calibrate);
router.post('/stop', optionalAuth, Stage06Controller.stop);
router.get('/records', optionalAuth, Stage06Controller.getRecords);
router.get('/:meterNo', optionalAuth, Stage06Controller.getStatus);

module.exports = router;
