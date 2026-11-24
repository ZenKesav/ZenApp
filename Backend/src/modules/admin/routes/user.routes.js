const express = require('express');
const router = express.Router();
const UserManagementController = require('../controllers/userManagement.controller');
const { authMiddleware } = require('../../../core/middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', UserManagementController.getUsers);
router.put('/profile', UserManagementController.updateOwnProfile);
router.get('/:id', UserManagementController.getUserById);
router.post('/', UserManagementController.createUser);
router.put('/:id', UserManagementController.updateUser);
router.delete('/:id', UserManagementController.deleteUser);

module.exports = router;
