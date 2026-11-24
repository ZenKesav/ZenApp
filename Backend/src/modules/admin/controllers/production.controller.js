const AnalysisService = require('../../analysis/analysis.service');

const ProductionController = {
  async getOverview(req, res, next) {
    try {
      const overview = await AnalysisService.getProductionReport(req.query);
      return res.status(200).json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = ProductionController;
