const { getStageLogger } = require('../helpers/stageLogger.helper');

function stageLoggerMiddleware(req, res, next) {
  const stageHeader = req.headers['x-stage-id'] || req.params.stageId || req.body?.stageId || 1;
  const stageNumber = parseInt(stageHeader, 10) || 1;
  req.stageLogger = getStageLogger(stageNumber);
  next();
}

module.exports = stageLoggerMiddleware;
