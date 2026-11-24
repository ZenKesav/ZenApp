const express = require('express');
const router = express.Router();
const AnalysisController = require('./analysis.controller');
const { authMiddleware, optionalAuth } = require('../../core/middlewares/auth.middleware');

router.get('/production', optionalAuth, AnalysisController.getProductionReport);
router.get('/reports', optionalAuth, AnalysisController.getProductionReport);
router.get('/attendance/history', authMiddleware, AnalysisController.getAttendanceHistory);
router.get('/operator/analytics', authMiddleware, AnalysisController.getOperatorAnalytics);

// Default endpoint
router.get('/', optionalAuth, AnalysisController.getProductionReport);

module.exports = router;
