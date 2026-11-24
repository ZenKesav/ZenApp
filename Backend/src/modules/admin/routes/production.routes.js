const express = require('express');
const router = express.Router();
const ProductionController = require('../controllers/production.controller');
const { authenticate } = require('../../../core/middlewares/auth.middleware');

router.use(authenticate);

router.get('/overview', ProductionController.getOverview);

module.exports = router;
