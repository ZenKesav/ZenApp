export const ALL_STAGE_MODULES = [
  {
    id: 1,
    stage_number: 1,
    name: 'PCB Code Loading Test',
    shortName: 'PCB Code Loading Test',
    icon: 'ti-code',
    badge: '1-Stage',
    description: 'Power & boot test, Code loading, serial no., UID, firmware update',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-01'
  },
  {
    id: 2,
    stage_number: 2,
    name: 'NIC Card PCB Test',
    shortName: 'NIC Card PCB Test',
    icon: 'ti-cpu',
    badge: '2-Stage',
    description: 'Power-on & signal test, Modem function, IMEI, Store to DB',
    lineType: 'NIC Card Preparation Line',
    hardwareStation: 'Station-02'
  },
  {
    id: 3,
    stage_number: 3,
    name: 'NIC Card Box Assembly',
    shortName: 'NIC Card Box Assembly',
    icon: 'ti-box',
    badge: '3-Stage',
    description: 'NIC Module mounting & casing assembly check',
    lineType: 'NIC Card Preparation Line',
    hardwareStation: 'Station-03'
  },
  {
    id: 4,
    stage_number: 4,
    name: 'NIC Card Inside Print',
    shortName: 'NIC Card Inside Print',
    icon: 'ti-tools',
    badge: '4-Stage',
    description: 'Modem function, IMEI, Store to DB, Laser print',
    lineType: 'NIC Card Preparation Line',
    hardwareStation: 'Station-04'
  },
  {
    id: 5,
    stage_number: 5,
    name: 'Meter PCB Box Assembly',
    shortName: 'Meter PCB Box Assembly',
    icon: 'ti-package',
    badge: '5-Stage',
    description: 'Base plate & PCB mounting into meter enclosure',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-05'
  },
  {
    id: 6,
    stage_number: 6,
    name: 'Calibration & Accuracy',
    shortName: 'Calibration & Accuracy',
    icon: 'ti-bolt',
    badge: '6-Stage',
    description: 'Voltage / modem data, Error lock check, active power calibration',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-06'
  },
  {
    id: 7,
    stage_number: 7,
    name: 'Final Functional Validation',
    shortName: 'Final Functional Validation',
    icon: 'ti-shield-check',
    badge: '7-Stage',
    description: 'Firmware update, IP address check, complete QA validation',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-07'
  },
  {
    id: 8,
    stage_number: 8,
    name: 'PVC Seal (Tag)',
    shortName: 'PVC Seal (Tag)',
    icon: 'ti-tag',
    badge: '8-Stage',
    description: 'Tamper-proof seal, security wire tagging & registration',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-08'
  },
  {
    id: 9,
    stage_number: 9,
    name: 'Meter Box Body Print',
    shortName: 'Meter Box Body Print',
    icon: 'ti-barcode',
    badge: '9-Stage',
    description: 'Front full print, laser marking, barcode generation',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-09'
  },
  {
    id: 10,
    stage_number: 10,
    name: 'Meter Carton Box Print',
    shortName: 'Meter Carton Box Print',
    icon: 'ti-printer',
    badge: '10-Stage',
    description: 'Single unit box barcode printing & packaging',
    lineType: 'Packaging Line',
    hardwareStation: 'Station-10'
  },
  {
    id: 11,
    stage_number: 11,
    name: 'Master Box Carton Print',
    shortName: 'Master Box Carton Print',
    icon: 'ti-box-seam',
    badge: '11-Stage',
    description: 'Bulk master carton aggregation & dispatch label print',
    lineType: 'Packaging Line',
    hardwareStation: 'Station-11'
  },
  {
    id: 12,
    stage_number: 12,
    name: 'QR Validation and testing',
    shortName: 'QR Validation and testing',
    icon: 'ti-qrcode',
    badge: '12-Stage',
    description: 'QR code scanner, Meter full details – stagewise (Pass/Fail/Hold)',
    lineType: 'Main Meter Assembly Line',
    hardwareStation: 'Station-12'
  }
];

export function isSupervisorUser(user) {
  if (!user) return false;
  const normRole = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  return normRole === 'SUPERVISOR' || normRole.includes('SUPERVISOR');
}

export function isFullAccessUser(user) {
  if (!user) return true;
  const normRole = (user.role || '').toUpperCase().replace(/\s+/g, '_');
  // System administrators, IT Admins, and Super Admins have full access to all factory stages
  // Supervisors and Operators are scoped to their assigned stages!
  return (
    normRole.includes('ADMIN') ||
    normRole.includes('IT')
  );
}

export function stripStagePrefix(stageName) {
  return String(stageName || '').replace(/^(?:Stage\s*\d+\s*:\s*)+/i, '').trim();
}

export function formatStageDisplay(stageId, stageName, fallbackName = '') {
  const stgNum = Number(stageId || 0);
  const meta = stgNum ? ALL_STAGE_MODULES.find(m => m.id === stgNum) : null;
  const cleanTitle = stripStagePrefix(stageName) || meta?.name || stripStagePrefix(fallbackName);
  if (stgNum) {
    const padded = String(stgNum).padStart(2, '0');
    return cleanTitle ? `Stage ${padded}: ${cleanTitle}` : `Stage ${padded}`;
  }
  return cleanTitle || 'Production Stage';
}

export function isStageActive(stg) {
  if (!stg) return false;
  return stg.status === true || stg.status === 'true' || stg.status === 'ACTIVE' || stg.status === 1 || stg.status === '1';
}

export function formatStageFromDb(stg) {
  if (!stg) return null;
  const sNum = Number(stg.stage_number || stg.stage_id || stg.id || 1);
  const matched = ALL_STAGE_MODULES.find(m => m.id === sNum);
  return {
    ...stg,
    id: sNum,
    stage_number: sNum,
    status: stg.status,
    name: stripStagePrefix(stg.stage_name || stg.name) || (matched?.name) || `Stage ${sNum}`,
    shortName: stripStagePrefix(stg.stage_name || stg.name) || (matched?.shortName) || `Stage ${sNum}`,
    icon: matched?.icon || 'ti-cpu',
    badge: `${sNum}-Stage`,
    description: stg.description || matched?.description || '',
    lineType: stg.line_type || stg.lineType || matched?.lineType || 'Main Meter Assembly Line',
    hardwareStation: stg.hardware_station || stg.hardwareStation || matched?.hardwareStation || `Station-${String(sNum).padStart(2, '0')}`,
  };
}

export function getUserAssignedStages(user) {
  if (!user) return [];

  // 1. If assignedStagesList is provided from backend (authoritative DB list)
  if (Array.isArray(user.assignedStagesList) && user.assignedStagesList.length > 0) {
    const activeList = user.assignedStagesList.filter(isStageActive);
    if (activeList.length > 0) {
      return activeList.map(formatStageFromDb).sort((a, b) => a.id - b.id);
    }
  }

  // 2. If stageDetailsList is provided
  if (Array.isArray(user.stageDetailsList) && user.stageDetailsList.length > 0) {
    const activeList = user.stageDetailsList.filter(isStageActive);
    if (activeList.length > 0) {
      return activeList.map(formatStageFromDb).sort((a, b) => a.id - b.id);
    }
  }

  if (isFullAccessUser(user)) {
    return ALL_STAGE_MODULES;
  }

  const stageMap = new Map();

  // 3. Parse user.assigned_stage string (strictly extract stage numbers, no fuzzy name substring collisions)
  if (user.assigned_stage && typeof user.assigned_stage === 'string') {
    const parts = user.assigned_stage.split(',');
    parts.forEach(part => {
      const raw = part.trim();
      if (!raw) return;

      const numMatch = raw.match(/^(\d+)/) || raw.match(/(\d+)\s*stage/i) || raw.match(/(\d+)/);
      if (numMatch) {
        const sNum = Number(numMatch[1]);
        const matched = ALL_STAGE_MODULES.find(m => m.id === sNum || m.stage_number === sNum);
        if (matched && !stageMap.has(matched.id)) {
          stageMap.set(matched.id, matched);
        }
      }
    });
  }

  // 4. Parse user.stage_id (supports comma-separated string e.g. "4, 9" or single number)
  if (user.stage_id) {
    const ids = String(user.stage_id)
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
    ids.forEach(sNum => {
      const matched = ALL_STAGE_MODULES.find(m => m.id === sNum || m.stage_number === sNum);
      if (matched && !stageMap.has(matched.id)) {
        stageMap.set(matched.id, matched);
      }
    });
  }

  return Array.from(stageMap.values()).sort((a, b) => a.id - b.id);
}

export function getSavedStageForUser(user) {
  if (!user) return null;
  const userKey = user.id || user.employee_id || user.email || 'user';
  return localStorage.getItem(`zenmeter_saved_stage_${userKey}`);
}

export function saveStageForUser(user, stageId) {
  if (!user) return;
  const userKey = user.id || user.employee_id || user.email || 'user';
  localStorage.setItem(`zenmeter_saved_stage_${userKey}`, String(stageId));
  sessionStorage.setItem('zenmeter_selected_stage_id', String(stageId));
}

export function clearSavedStageForUser(user) {
  if (!user) return;
  const userKey = user.id || user.employee_id || user.email || 'user';
  localStorage.removeItem(`zenmeter_saved_stage_${userKey}`);
}

export function getPostLoginRedirectPath(user) {
  if (!user) return '/login';

  // Supervisors and Full Access Users always go directly to Dashboard
  if (isFullAccessUser(user) || isSupervisorUser(user)) {
    return '/dashboard';
  }

  const assigned = getUserAssignedStages(user);

  if (assigned.length === 0) {
    return '/dashboard';
  }

  if (assigned.length === 1) {
    return `/stages/${assigned[0].id}`;
  }

  // Operators with multiple assigned stages:
  const savedStage = getSavedStageForUser(user);

  if (savedStage && savedStage !== 'null' && savedStage !== 'undefined') {
    if (savedStage === 'all') {
      return '/dashboard';
    }
    const stageNum = Number(savedStage);
    const isValidStage = assigned.some(s => s.id === stageNum || s.stage_number === stageNum);
    if (isValidStage) {
      return `/stages/${savedStage}`;
    }
  }

  return '/select-stage';
}
