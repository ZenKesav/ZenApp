const express = require('express');
const router = express.Router();
const Stage10Controller = require('./stage10.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage10Controller.run);
router.post('/test', optionalAuth, Stage10Controller.submitTest);
router.post('/pack', optionalAuth, Stage10Controller.pack);
router.post('/print', optionalAuth, Stage10Controller.print);
router.get('/records', optionalAuth, Stage10Controller.getRecords);
router.get('/:cartonNo', optionalAuth, Stage10Controller.getStatus);

module.exports = router;
