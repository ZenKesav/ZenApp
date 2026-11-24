const express = require('express');
const router = express.Router();
const Stage02Controller = require('./stage02.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage02Controller.run);
router.post('/test', optionalAuth, Stage02Controller.submitTest);
router.post('/test-rf', optionalAuth, Stage02Controller.testRf);
router.get('/records', optionalAuth, Stage02Controller.getRecords);
router.get('/:meterNo', optionalAuth, Stage02Controller.getStatus);

module.exports = router;
