const SerialManager = require('./serialManager');

const JigService = {

  async startJigProcess(stageId, meterNo) {
    return await SerialManager.executeJigTestProtocol(meterNo, stageId);
  }

};

module.exports = JigService;
