const express = require('express');
const router = express.Router();
const Stage04Controller = require('./stage04.controller');
const { validateJigSave } = require('./stage04.validation');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

// Optical Port Scanning & Connection (supports /ports and /usb-ports)
router.get('/ports', Stage04Controller.getPorts);
router.post('/ports', Stage04Controller.getPorts);
router.get('/usb-ports', Stage04Controller.getUsbPorts);
router.post('/usb-ports', Stage04Controller.getUsbPorts);

router.post('/connect', Stage04Controller.jigConnect);
router.post('/disconnect', Stage04Controller.disconnect);
router.get('/status', Stage04Controller.getStatus);

// Hardware Protocol Execution (supports /start and /run-test)
router.post('/start', optionalAuth, Stage04Controller.start);
router.post('/run-test', optionalAuth, Stage04Controller.jigRunTest);

// Database Transaction Save & Record Retrieval (supports /save and /save-db)
router.post('/save', optionalAuth, validateJigSave, Stage04Controller.save);
router.post('/save-db', optionalAuth, Stage04Controller.jigSaveDb);
router.get('/records', optionalAuth, Stage04Controller.getRecords);

// Duplicate IMEI Check
router.post('/check-duplicates', Stage04Controller.checkDuplicates);

// Laser / Thermal Printer Payload Dispatch
router.post('/print', optionalAuth, Stage04Controller.printPayload);

// Reset State
router.post('/reset', Stage04Controller.reset);

// Stage Pipeline Runner & Generic Test Submission
router.post('/run', optionalAuth, Stage04Controller.run);
router.post('/test', optionalAuth, Stage04Controller.submitTest);
router.get('/:meterNo', optionalAuth, Stage04Controller.getStatusByMeter);

module.exports = router;
