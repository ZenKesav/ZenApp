const AuthService = require('./auth.service');
const { query } = require('../../core/database/connection');

const AuthController = {
  async login(req, res, next) {
    try {
      const { identifier, username, employee_id, email, password } = req.body || {};
      const loginTerm = identifier || username || employee_id || email;

      const result = await AuthService.login(loginTerm, password);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async me(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      const permissions = await AuthService.getPermissionsForRole(req.user.role);
      const currentShift = await AuthService.detectCurrentShift();

      let fullStageList = [];
      try {
        const allActiveStages = await query.all(
          `SELECT * FROM production_stages WHERE status = 'ACTIVE' OR status = 'true' OR status = '1' ORDER BY stage_number ASC`
        );
        const normRole = (req.user.role || '').toUpperCase().replace(/\s+/g, '_');
        const isFullAccess = normRole.includes('ADMIN') || normRole.includes('QC') || normRole.includes('REPORT') || normRole.includes('VIEWER') || normRole.includes('IT');

        if (isFullAccess) {
          fullStageList = (allActiveStages || []).map(stg => ({
            ...stg,
            assigned_by: 'System',
            assigned_at: new Date()
          }));
        } else if (req.user.assigned_stage || req.user.stage_id) {
          const stageNumSet = new Set();
          if (req.user.assigned_stage) {
            req.user.assigned_stage.split(',').forEach(part => {
              const m = part.trim().match(/^(\d+)/);
              if (m) stageNumSet.add(parseInt(m[1], 10));
            });
          }
          if (req.user.stage_id) {
            String(req.user.stage_id).split(',').forEach(s => {
              const n = parseInt(s.trim(), 10);
              if (!isNaN(n)) stageNumSet.add(n);
            });
          }
          fullStageList = (allActiveStages || [])
            .filter(stg => stageNumSet.has(Number(stg.stage_number)))
            .map(stg => ({
              ...stg,
              assigned_by: req.user.assigned_by || 'AdminIT (EMP001)',
              assigned_at: req.user.assigned_at,
              reassigned_by: req.user.reassigned_by || null,
              reassigned_at: req.user.reassigned_at || null
            }));
        }
      } catch (e) { }

      return res.status(200).json({
        success: true,
        user: {
          ...req.user,
          assignedStagesList: fullStageList
        },
        permissions,
        currentShift
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      if (req.user) {
        await AuthService.recordLogout(req.user.id, req.user.employee_id);
      }
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;
