const express = require('express');
const router = express.Router();
const RoleManagementController = require('../controllers/roleManagement.controller');
const ShiftManagementController = require('../controllers/shiftManagement.controller');
const StageManagementController = require('../controllers/stageManagement.controller');
const SystemSettingsController = require('../controllers/systemSettings.controller');
const { authMiddleware } = require('../../../core/middlewares/auth.middleware');

router.use(authMiddleware);

// Roles
router.get('/roles', RoleManagementController.getRoles);
router.post('/roles', RoleManagementController.createRole);
router.get('/roles/:id', RoleManagementController.getRoleById);
router.put('/roles/:id', RoleManagementController.updateRole);
router.patch('/roles/:id/status', RoleManagementController.updateRoleStatus);
router.delete('/roles/:id', RoleManagementController.deleteRole);
router.get('/permissions', RoleManagementController.getPermissions);

// Shifts
router.get('/shifts', ShiftManagementController.getShifts);
router.post('/shifts', ShiftManagementController.createShift);
router.get('/shifts/:id', ShiftManagementController.getShiftById);
router.put('/shifts/:id', ShiftManagementController.updateShift);
router.put('/shifts/:id/status', ShiftManagementController.updateStatus);
router.patch('/shifts/:id/status', ShiftManagementController.updateStatus);
router.delete('/shifts/:id', ShiftManagementController.deleteShift);

// Stage Management
router.get('/stages', StageManagementController.getStages);
router.post('/stages', StageManagementController.createStage);
router.put('/stages/:id', StageManagementController.updateStage);
router.delete('/stages/:id', StageManagementController.deleteStage);

// Work Forms
router.get('/work-forms', StageManagementController.getWorkForms);
router.post('/work-forms', StageManagementController.createWorkForm);

// System Settings
router.get('/settings', SystemSettingsController.getSettings);

module.exports = router;
