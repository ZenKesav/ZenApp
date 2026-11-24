const express = require('express');
const router = express.Router();
const RoleManagementController = require('../controllers/roleManagement.controller');
const { authenticate } = require('../../../core/middlewares/auth.middleware');

router.use(authenticate);

router.get('/', RoleManagementController.getRoles);
router.post('/', RoleManagementController.createRole);
router.get('/:id', RoleManagementController.getRoleById);
router.put('/:id', RoleManagementController.updateRole);
router.put('/:id/status', RoleManagementController.updateRoleStatus);
router.patch('/:id/status', RoleManagementController.updateRoleStatus);
router.put('/:id/permissions', RoleManagementController.updateRolePermissions);
router.delete('/:id', RoleManagementController.deleteRole);

module.exports = router;
