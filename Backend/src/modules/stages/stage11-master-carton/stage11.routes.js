const express = require('express');
const router = express.Router();
const Stage11Controller = require('./stage11.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.post('/run', optionalAuth, Stage11Controller.run);
router.post('/test', optionalAuth, Stage11Controller.submitTest);
router.post('/pack', optionalAuth, Stage11Controller.pack);
router.post('/print', optionalAuth, Stage11Controller.print);
router.get('/records', optionalAuth, Stage11Controller.getRecords);
router.get('/:masterNo', optionalAuth, Stage11Controller.getStatus);

module.exports = router;
