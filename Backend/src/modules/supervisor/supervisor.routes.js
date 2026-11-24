const express = require('express');
const router = express.Router();
const SupervisorController = require('./supervisor.controller');
const { validateCreateSupervisorTest } = require('./supervisor.validation');
const { authMiddleware, optionalAuth } = require('../../core/middlewares/auth.middleware');

router.get('/', optionalAuth, SupervisorController.getTests);
router.post('/', optionalAuth, validateCreateSupervisorTest, SupervisorController.createTest);

module.exports = router;
