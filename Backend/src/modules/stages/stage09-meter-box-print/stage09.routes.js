const express = require('express');
const router = express.Router();
const Stage09Controller = require('./stage09.controller');
const { validateSaveMeter } = require('./stage09.validation');
const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

// Optical Probe Endpoints
router.get('/optical-status', optionalAuth, Stage09Controller.checkOpticalCable);
router.post('/optical-connect', optionalAuth, Stage09Controller.connectOpticalCable);
router.post('/optical-disconnect', optionalAuth, Stage09Controller.disconnectOpticalCable);

// Laser Machine Endpoints
router.get('/laser-status', optionalAuth, Stage09Controller.checkLaserStatus);
router.post('/laser-connect', optionalAuth, Stage09Controller.connectLaserPort);
router.post('/laser-disconnect', optionalAuth, Stage09Controller.disconnectLaserPort);
router.post('/laser-start', optionalAuth, Stage09Controller.startLaserSession);
router.post('/laser-stop', optionalAuth, Stage09Controller.stopLaserSession);
router.get('/laser-session-status', optionalAuth, Stage09Controller.getLaserSessionStatus);
router.post('/laser-simulate-ask', optionalAuth, Stage09Controller.simulateLaserAsk);

// Meter Optical DLMS Reading & Printing
router.post('/read-meter', optionalAuth, Stage09Controller.readMeter);
router.post('/save-meter', optionalAuth, validateSaveMeter, Stage09Controller.saveMeter);
router.put('/record/:id', optionalAuth, Stage09Controller.updateMeter);
router.post('/print-meter', optionalAuth, Stage09Controller.printMeter);
router.get('/record/:id', optionalAuth, Stage09Controller.getRecordById);
router.get('/records', optionalAuth, Stage09Controller.getRecords);
router.get('/records/:workId', optionalAuth, Stage09Controller.getRecords);

// Stage 09 Pipeline Runner & Tests
router.post('/run', optionalAuth, Stage09Controller.run);
router.post('/test', optionalAuth, Stage09Controller.submitTest);
router.get('/:meterNo', optionalAuth, Stage09Controller.getStatus);

module.exports = router;
