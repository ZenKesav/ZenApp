const express = require('express');
const router = express.Router();
const StageManagementController = require('../controllers/stageManagement.controller');
const StageFormController = require('../controllers/stageForm.controller');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

router.use(optionalAuth);

// Stage Work Forms / Work Orders
router.post('/upload-actual-print', StageFormController.uploadActualPrintFile);
router.get('/forms/active', StageFormController.getActiveForm);
router.get('/forms', StageFormController.getForms);
router.post('/forms', StageFormController.createForm);
router.put('/forms/:id/assign', StageFormController.assignForm);
router.put('/forms/:id', StageFormController.updateForm);
router.delete('/forms/:id', StageFormController.deleteForm);

// Stage Master CRUD
router.get('/', StageManagementController.getStages);
router.post('/', StageManagementController.createStage);
router.put('/:id', StageManagementController.updateStage);
router.delete('/:id', StageManagementController.deleteStage);

module.exports = router;
