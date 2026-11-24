const express = require('express');
const router = express.Router();
const ShiftManagementController = require('../controllers/shiftManagement.controller');
const { authenticate } = require('../../../core/middlewares/auth.middleware');

router.use(authenticate);

router.get('/', ShiftManagementController.getShifts);
router.post('/', ShiftManagementController.createShift);
router.get('/:id', ShiftManagementController.getShiftById);
router.put('/:id', ShiftManagementController.updateShift);
router.put('/:id/status', ShiftManagementController.updateStatus);
router.patch('/:id/status', ShiftManagementController.updateStatus);
router.delete('/:id', ShiftManagementController.deleteShift);

module.exports = router;
