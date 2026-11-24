const express = require('express');
const router = express.Router();
const AssignmentController = require('../controllers/assignment.controller');
const { authenticate } = require('../../../core/middlewares/auth.middleware');

router.use(authenticate);

router.get('/', AssignmentController.getAssignments);
router.post('/', AssignmentController.assignStage);

module.exports = router;
