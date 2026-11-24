const express = require('express');
const router = express.Router();
const QcController = require('./qc.controller');
const { validateQcTest, validateInspect } = require('./qc.validation');
const { optionalAuth } = require('../../core/middlewares/auth.middleware');

router.get('/queue', optionalAuth, QcController.getQueue);
router.post('/inspect', optionalAuth, validateInspect, QcController.inspect);

router.get('/', optionalAuth, QcController.getTests);
router.post('/', optionalAuth, validateQcTest, QcController.createTest);

module.exports = router;
