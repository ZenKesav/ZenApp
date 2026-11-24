const express = require('express');
const router = express.Router();
const MeterController = require('../controllers/meter.controller');
const { authenticate } = require('../../../core/middlewares/auth.middleware');

router.use(authenticate);

router.get('/', MeterController.getMeters);
router.post('/', MeterController.createMeter);
router.get('/:meterNo', MeterController.getMeterByNo);
router.get('/:meterNo/traceability', MeterController.getTraceability);

module.exports = router;
