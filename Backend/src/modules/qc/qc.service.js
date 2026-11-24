const QcInspectionModel = require('./models/QcInspection.model');
const { broadcast } = require('../../core/services/socket.service');
const redisClient = require('../../core/cache/redisClient');

const QcService = {

  async getQueue() {
    return await QcInspectionModel.getQueue();
  },


  async inspect(meterNo, inspectorId, status, remarks) {
    const id = await QcInspectionModel.inspect(meterNo, inspectorId, status, remarks);
    await redisClient.del(`meter:${meterNo}`);

    broadcast('QC_INSPECTION_COMPLETED', {
      meterNo,
      inspectorId,
      status,
      remarks,
      timestamp: new Date().toISOString()
    });

    return id;
  },


  async getQcTests(filters) {
    return await QcInspectionModel.getQcTests(filters);
  },


  async saveQcTest(payload) {
    return await QcInspectionModel.saveQcTest(payload);
  }

};

module.exports = QcService;
