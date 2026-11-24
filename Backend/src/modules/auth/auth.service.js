const { query } = require('../../core/database/connection');
const { comparePassword, generateToken } = require('../../core/helpers/crypto.helper');

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim().toUpperCase();
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

const AuthService = {

  async findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const cleanId = String(identifier).trim();
    return await query.get(
      `SELECT * FROM users 
       WHERE LOWER(employee_id) = LOWER(?) 
          OR LOWER(user_name) = LOWER(?) 
          OR LOWER(email) = LOWER(?)`,
      [cleanId, cleanId, cleanId]
    );
  },


  async getPermissionsForRole(roleName) {
    const defaultAdminPerms = [
      'DASHBOARD_VIEW', 'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'ROLE_MANAGE',
      'METER_VIEW', 'TRACEABILITY_VIEW', 'STAGE_VIEW', 'STAGE_ASSIGN', 'STAGE_EXECUTE',
      'TEST_RESULT_CREATE', 'QC_VIEW', 'QC_INSPECT', 'QC_APPROVE', 'QC_REPORT_VIEW',
      'REPORT_VIEW', 'SYSTEM_SETTINGS'
    ];

    if (!roleName) return defaultAdminPerms;
    const norm = roleName.toUpperCase();
    if (norm === 'ADMIN' || norm === 'ADMINISTRATOR') return defaultAdminPerms;

    try {
      const rows = await query.all(
        `SELECT permission_code FROM role_permissions WHERE UPPER(role_name) = UPPER(?)`,
        [roleName]
      );
      if (rows && rows.length > 0) {
        return rows.map(r => r.permission_code);
      }
      return defaultAdminPerms;
    } catch (err) {
      return defaultAdminPerms;
    }
  },


  async recordAttendance(userId, employeeId, userName, name, attendanceDate, shiftId, shiftName, shiftTime) {
    try {
      await query.run(
        `INSERT INTO user_attendance_history (user_id, employee_id, user_name, name, attendance_date, shift_id, shift_name, shift_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'LOGGED_IN')`,
        [userId, employeeId, userName, name, attendanceDate, shiftId, shiftName, shiftTime]
      );
    } catch (e) {
      // Non-fatal attendance logging
    }
  },


  async recordLogout(userId, employeeId) {
    try {
      await query.run(
        `UPDATE user_attendance_history 
         SET logout_time = CURRENT_TIMESTAMP, status = 'LOGGED_OUT'
         WHERE user_id = ? AND status = 'LOGGED_IN'`,
        [userId]
      );
    } catch (e) { }
  },


  async detectCurrentShift() {
    try {
      const activeShifts = await query.all(
        "SELECT * FROM shifts WHERE status = 'true' OR status = 'ACTIVE' OR status = '1'"
      );

      if (!activeShifts || activeShifts.length === 0) {
        return {
          id: 0,
          shift_name: 'General Shift',
          start_time: '09:00 AM',
          end_time: '06:00 PM',
          shift_type: 'General Shift',
          shift_time: '09:00 AM - 06:00 PM',
          duration_hours: 9
        };
      }

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      let matchedShift = null;

      for (const s of activeShifts) {
        const startMins = parseTimeToMinutes(s.start_time);
        const endMins = parseTimeToMinutes(s.end_time);

        if (startMins <= endMins) {
          if (currentMins >= startMins && currentMins <= endMins) {
            matchedShift = s;
            break;
          }
        } else {
          if (currentMins >= startMins || currentMins <= endMins) {
            matchedShift = s;
            break;
          }
        }
      }

      if (!matchedShift) {
        const generalShift = activeShifts.find(s =>
          (s.shift_name || '').toLowerCase().includes('general') ||
          (s.shift_name || '').toLowerCase().includes('day')
        );
        matchedShift = generalShift || activeShifts[0];
      }

      const sStart = matchedShift.start_time || '09:00 AM';
      const sEnd = matchedShift.end_time || '06:00 PM';

      return {
        id: matchedShift.id,
        shift_name: matchedShift.shift_name || 'General Shift',
        start_time: sStart,
        end_time: sEnd,
        shift_type: matchedShift.shift_type || 'General Shift',
        shift_time: `${sStart} - ${sEnd}`,
        duration_hours: matchedShift.duration_hours || 9
      };
    } catch (err) {
      return {
        id: 0,
        shift_name: 'General Shift',
        start_time: '09:00 AM',
        end_time: '06:00 PM',
        shift_type: 'General Shift',
        shift_time: '09:00 AM - 06:00 PM',
        duration_hours: 9
      };
    }
  },


  async login(identifier, password) {
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      throw new Error('Invalid Employee ID, Username, or Email.');
    }

    if (user.status === 'INACTIVE') {
      throw new Error(`Account '${user.employee_id || user.user_name}' is INACTIVE. Please contact system admin.`);
    }

    let isMatch = false;
    if (user.password_hash) {
      isMatch = await comparePassword(password, user.password_hash);
    }
    if (!isMatch && user.raw_password && user.raw_password === password) {
      isMatch = true;
    }

    if (!isMatch) {
      throw new Error('Invalid Password.');
    }

    const userRole = user.role || 'ADMIN';
    const roleId = user.role_id || (userRole === 'ADMIN' ? 1 : 3);
    const permissions = await this.getPermissionsForRole(userRole);
    const currentShift = await this.detectCurrentShift();
    const todayDate = new Date().toISOString().split('T')[0];

    await this.recordAttendance(
      user.id,
      user.employee_id || '',
      user.user_name || '',
      user.name || '',
      todayDate,
      currentShift.id,
      currentShift.shift_name,
      currentShift.shift_time
    );

    const token = generateToken(user);

    let fullStageList = [];
    try {
      const allActiveStages = await query.all(
        `SELECT * FROM production_stages WHERE status = 'ACTIVE' OR status = 'true' OR status = '1' ORDER BY stage_number ASC`
      );
      const normRole = (userRole || '').toUpperCase().replace(/\s+/g, '_');
      const isFullAccess = normRole.includes('ADMIN') || normRole.includes('QC') || normRole.includes('REPORT') || normRole.includes('VIEWER') || normRole.includes('IT');

      if (isFullAccess) {
        fullStageList = (allActiveStages || []).map(stg => ({
          ...stg,
          assigned_by: 'System',
          assigned_at: new Date()
        }));
      } else if (user.assigned_stage || user.stage_id) {
        const stageNumSet = new Set();
        if (user.assigned_stage) {
          user.assigned_stage.split(',').forEach(part => {
            const m = part.trim().match(/^(\d+)/);
            if (m) stageNumSet.add(parseInt(m[1], 10));
          });
        }
        if (user.stage_id) {
          String(user.stage_id).split(',').forEach(s => {
            const n = parseInt(s.trim(), 10);
            if (!isNaN(n)) stageNumSet.add(n);
          });
        }
        fullStageList = (allActiveStages || [])
          .filter(stg => stageNumSet.has(Number(stg.stage_number)))
          .map(stg => ({
            ...stg,
            assigned_by: user.assigned_by || 'AdminIT (EMP001)',
            assigned_at: user.assigned_at,
            reassigned_by: user.reassigned_by || null,
            reassigned_at: user.reassigned_at || null
          }));
      }
    } catch (e) { }

    return {
      success: true,
      user: {
        id: user.id,
        employee_id: user.employee_id || '',
        user_name: user.user_name || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role_id: roleId,
        role: userRole,
        stage_id: user.stage_id,
        assigned_stage: user.assigned_stage,
        assigned_by: user.assigned_by,
        assigned_at: user.assigned_at,
        reassigned_by: user.reassigned_by,
        reassigned_at: user.reassigned_at,
        assignedStagesList: fullStageList,
        avatar: user.avatar
      },
      permissions,
      currentShift,
      token
    };
  }

};

module.exports = AuthService;
