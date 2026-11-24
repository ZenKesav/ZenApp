const { query } = require('../../../core/database/connection');
const logger = require('../../../config/logger.config');

const StageInterlockService = {

  /**
   * Allowed sequential active stages in production line:
   * 1: PCB Code Loading Test
   * 2: NIC Card PCB Test
   * 4: NIC Card Inside Print
   * 6: Calibration & Accuracy
   * 7: Final Functional Validation
   * 8: PVC Seal (Tag)
   * 9: Meter Box Body Print
   * 10: Meter Carton Box Print
   * 11: Master Box Carton Print
   */
  getSequentialStageOrder() {
    return [1, 2, 4, 6, 7, 8, 9, 10, 11];
  },


  /**
   * Validate whether a meter is eligible to enter the requested stage
   */
  async validateStageProgression(meterNo, targetStageId, options = {}) {
    if (!meterNo) {
      return { allowed: false, message: 'Meter number is required for stage interlock validation.' };
    }

    // Configurable bypass for development / multi-developer independent stage testing
    const interlockEnabled = process.env.ENABLE_STAGE_INTERLOCK !== 'false' && 
                             process.env.STAGE_INTERLOCK_ENABLED !== 'false' &&
                             !options.bypass_interlock;
    if (!interlockEnabled) {
      return { allowed: true };
    }

    const order = this.getSequentialStageOrder();
    const targetIdx = order.indexOf(Number(targetStageId));

    if (targetIdx === -1) {
      return { allowed: false, message: `Stage ID ${targetStageId} is not a valid active sequential production stage.` };
    }

    // Stage 1 (First Stage) is always open for initial entry
    if (targetIdx === 0) {
      return { allowed: true };
    }

    // Interlock rule: Meter must have successfully passed the immediately preceding active stage
    const requiredPrevStageId = order[targetIdx - 1];

    const prevResult = await query.get(
      `SELECT status FROM stage_results 
       WHERE meter_no = ? AND stage_id = ? 
       ORDER BY id DESC LIMIT 1`,
      [meterNo, requiredPrevStageId]
    );

    if (!prevResult || prevResult.status !== 'PASS') {
      logger.warn(`[Stage Interlock Violation] Meter '${meterNo}' attempted Stage ${targetStageId} without PASS status on required Stage ${requiredPrevStageId}.`);
      return {
        allowed: false,
        message: `Stage Interlock Blocked: Meter '${meterNo}' must successfully PASS Stage #${requiredPrevStageId} before advancing to Stage #${targetStageId}.`
      };
    }

    return { allowed: true };
  }

};

module.exports = StageInterlockService;
