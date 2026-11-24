const express = require('express');
const router = express.Router();

const StageEngineService = require('../../../core/services/stageEngine.service');
const stageManagementRoutes = require('../../admin/routes/stageManagement.routes');

// Dedicated vertical slice sub-routers
const stage01Routes = require('../stage01-pcb-code-loading/stage01.routes');
const stage02Routes = require('../stage02-nic-pcb-test/stage02.routes');
const stage04Routes = require('../stage04-nic-inside-print/stage04.routes');
const stage06Routes = require('../stage06-calibration/stage06.routes');
const stage07Routes = require('../stage07-final-validation/stage07.routes');
const stage08Routes = require('../stage08-pvc-seal-tag/stage08.routes');
const stage09Routes = require('../stage09-meter-box-print/stage09.routes');
const stage10Routes = require('../stage10-carton-print/stage10.routes');
const stage11Routes = require('../stage11-master-carton/stage11.routes');

const { optionalAuth } = require('../../../core/middlewares/auth.middleware');

// Stage Management & Work Forms (Managed under Admin module)
router.use('/management', stageManagementRoutes);

// Stage 04 Jig hardware routes (backward-compatible mounting under /stages/jig)
router.use('/jig', stage04Routes);

// Individual Stage Vertical Slice Sub-routers (with standard and shorthand aliases)
router.use('/stage01', stage01Routes);
router.use('/stage1', stage01Routes);
router.use('/1', stage01Routes);

router.use('/stage02', stage02Routes);
router.use('/stage2', stage02Routes);
router.use('/2', stage02Routes);

router.use('/stage04', stage04Routes);
router.use('/stage4', stage04Routes);
router.use('/4', stage04Routes);

router.use('/stage06', stage06Routes);
router.use('/stage6', stage06Routes);
router.use('/6', stage06Routes);

router.use('/stage07', stage07Routes);
router.use('/stage7', stage07Routes);
router.use('/7', stage07Routes);

router.use('/stage08', stage08Routes);
router.use('/stage8', stage08Routes);
router.use('/8', stage08Routes);

router.use('/stage09', stage09Routes);
router.use('/stage9', stage09Routes);
router.use('/9', stage09Routes);

router.use('/stage10', stage10Routes);
router.use('/10', stage10Routes);

router.use('/stage11', stage11Routes);
router.use('/11', stage11Routes);

// Production Pipeline Run Stage
router.post('/start', optionalAuth, async (req, res, next) => {
  try {
    const { meter_no, stage_id, operator_id, station_id, status } = req.body || {};
    if (!meter_no || !stage_id) {
      return res.status(400).json({ success: false, message: 'meter_no and stage_id are required' });
    }
    const operator = operator_id || req.user?.id || 1;
    const result = await StageEngineService.runStage(meter_no, Number(stage_id), operator, station_id, status);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
