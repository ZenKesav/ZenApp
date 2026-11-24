const logger = require('../../config/logger.config');

const getStageLogger = (stageNumber) => {
  return {
    info: (msg, meta) => logger.stage(stageNumber, `[INFO] ${msg}`, meta),
    warn: (msg, meta) => logger.stage(stageNumber, `[WARN] ${msg}`, meta),
    error: (msg, meta) => logger.stage(stageNumber, `[ERROR] ${msg}`, meta),
    debug: (msg, meta) => logger.stage(stageNumber, `[DEBUG] ${msg}`, meta)
  };
};

module.exports = {
  getStageLogger
};
