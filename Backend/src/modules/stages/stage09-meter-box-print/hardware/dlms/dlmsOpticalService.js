const db = require('../../../../../core/database/connection');
const getPool = () => db.pool;
const logger = require('../../../../../config/logger.config');
const env = require('../../../../../config/app.config');

function sanitizeDbText(val) {
  if (val === undefined || val === null) return null;
  const cleaned = String(val)
    .replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeJsonValue(obj) {
  if (obj === undefined || obj === null) return null;
  if (typeof obj === 'string') {
    return obj.replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeJsonValue(item));
  }
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeJsonValue(v);
    }
    return out;
  }
  return obj;
}

let SerialPort;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) {
  SerialPort = null;
}

let guruxDlms;
try {
  guruxDlms = require('@bubblyworld/gurux-dlms-ts');
} catch (e) {
  guruxDlms = null;
}

let activeOpticalConnectedPort = null;

const pad = (n, len = 2) => String(n).padStart(len, '0');
const formatTimestamp = (d = new Date()) => {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

/**
 * Helper to extract string or array of strings from Gurux DlmsValue (returned by client.getReplyValue())
 */
function extractFromDlmsValue(val) {
  if (!val || typeof val !== 'object') return null;

  if (val.type === 'string') {
    const rawStr = (val.value || '').replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '').trim();
    return rawStr;
  }

  if (val.type === 'octet-string') {
    const hex = val.hex || '';
    if (!hex) return '';
    const buf = Buffer.from(hex, 'hex');
    const ascii = buf.toString('ascii').replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '').trim();
    if (ascii && /^[A-Za-z0-9_\-\.\:\/ ]+$/.test(ascii)) {
      return ascii;
    }
    return hex.toUpperCase();
  }

  if (val.type === 'array' || val.type === 'structure') {
    return (val.items || []).map(item => extractFromDlmsValue(item));
  }

  if (val.type === 'integer' || val.type === 'float' || val.type === 'enum') {
    return String(val.value);
  }

  if (val.type === 'bcd') {
    return String(val.digits);
  }

  return null;
}

/**
 * Helper to read a DLMS Object attribute using Gurux client.getData() + client.getReplyValue()
 * Supports multi-frame / block transfer and AES-GCM encrypted responses automatically.
 */
async function readDlmsAttribute(client, portInstance, obisCode, attributeIndex = 2, addLog = null, label = '') {
  const obj = new guruxDlms.DlmsObject(client.getModule(), guruxDlms.ObjectType.DATA, obisCode);
  try {
    const reqFrames = client.read(obj, attributeIndex);
    let lastReplyValue = null;

    for (const frame of reqFrames) {
      const txBuf = Buffer.from(frame);
      if (addLog) {
        addLog(`[TX GET] ${txBuf.toString('hex').toUpperCase()} (OBIS: ${obisCode}${label ? ` - ${label}` : ''})`, 'INFO');
      }

      let rxBuf = await exchangeHdlcFrame(portInstance, txBuf, 3500);
      if (!rxBuf || rxBuf.length === 0) {
        return null;
      }

      if (addLog) {
        addLog(`[RX DATA] ${rxBuf.toString('hex').toUpperCase()}`, 'SUCCESS');
      }

      let status = client.getData(new Uint8Array(rxBuf));

      // Handle multi-frame / HDLC segmented or block transfer if moreData != 0
      let guard = 0;
      while (!status.complete && status.moreData !== 0 && guard < 12) {
        guard++;
        const rrFrames = client.receiverReady(status.moreData);
        if (!rrFrames || rrFrames.length === 0) break;
        const rrTx = Buffer.from(rrFrames[0]);
        if (addLog) {
          addLog(`[TX RR] ${rrTx.toString('hex').toUpperCase()}`, 'INFO');
        }
        const nextRx = await exchangeHdlcFrame(portInstance, rrTx, 3500);
        if (!nextRx || nextRx.length === 0) break;
        if (addLog) {
          addLog(`[RX DATA] ${nextRx.toString('hex').toUpperCase()}`, 'SUCCESS');
        }
        status = client.getData(new Uint8Array(nextRx));
      }

      if (status.complete) {
        try {
          const dlmsVal = client.getReplyValue();
          lastReplyValue = extractFromDlmsValue(dlmsVal);
        } catch (valErr) {
          // Fallback to raw PDU parser for unencrypted responses
          lastReplyValue = parseDlmsPdu(rxBuf);
        }
        try {
          client.updateValue(obj, attributeIndex, new Uint8Array(rxBuf));
        } catch (e) { }
      } else {
        // Fallback to raw PDU parser if unencrypted frame
        lastReplyValue = parseDlmsPdu(rxBuf);
      }
    }

    return lastReplyValue;
  } finally {
    try { obj.free(); } catch (e) { }
  }
}
/**
 * Helper to parse a DLMS PDU (Get-Response-Normal) to extract VisibleString, OctetString, or Array
 */
function parseDlmsPdu(buf) {
  if (!buf || buf.length === 0) return null;

  // Search for Get-Response-Normal (0xC4 0x01)
  const getRespIdx = buf.indexOf(Buffer.from([0xc4, 0x01]));
  if (getRespIdx < 0) return null;

  let offset = getRespIdx + 2; // skip tag 0xC4 0x01
  const invokeId = buf[offset++];
  const result = buf[offset++];

  if (result !== 0) {
    throw new Error(`Meter returned DLMS error code: ${result}`);
  }

  function parseElement(pos) {
    if (pos >= buf.length) return { val: null, next: pos };
    const tag = buf[pos++];

    if (tag === 0x0A) { // VisibleString
      const len = buf[pos++];
      const str = buf.slice(pos, pos + len).toString('ascii').trim();
      return { val: str, next: pos + len };
    }

    if (tag === 0x09) { // OctetString
      const len = buf[pos++];
      const raw = buf.slice(pos, pos + len);
      const str = raw.toString('ascii').trim();
      const isAscii = /^[A-Za-z0-9_\-\.\:\/ ]+$/.test(str);
      return { val: isAscii ? str : raw.toString('hex').toUpperCase(), next: pos + len };
    }

    if (tag === 0x01 || tag === 0x02) { // Array or Structure
      const count = buf[pos++];
      const arr = [];
      let cur = pos;
      for (let i = 0; i < count; i++) {
        const elem = parseElement(cur);
        arr.push(elem.val);
        cur = elem.next;
      }
      return { val: arr, next: cur };
    }

    if (tag === 0x11 || tag === 0x12) { // unsigned or integer
      const val = buf[pos++];
      return { val, next: pos };
    }

    return { val: buf.slice(pos).toString('hex'), next: buf.length };
  }

  return parseElement(offset).val;
}

/**
 * Safely close a SerialPort instance and wait for the OS handle to release
 */
async function safeClosePort(portInstance) {
  if (!portInstance) return;
  return new Promise((resolve) => {
    try {
      portInstance.removeAllListeners('data');
    } catch (e) { }
    // If it is a client Web Serial tunnel, keep the browser connection open for subsequent meter reads!
    if (portInstance.isTunnel) {
      return resolve();
    }
    if (!portInstance.isOpen) {
      return resolve();
    }
    try {
      portInstance.close(() => {
        setTimeout(resolve, 150);
      });
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Robust HDLC frame exchange that manages full frame bounding and Renesas optical transceiver flushing
 */
async function exchangeHdlcFrame(portInstance, txFrame, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    let rx = Buffer.alloc(0);
    let timer = null;
    let pollInterval = null;
    let settled = false;

    const cleanup = () => {
      settled = true;
      if (timer) { clearTimeout(timer); timer = null; }
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      try { portInstance.removeListener('data', onData); } catch (e) { }
    };

    const onData = (chunk) => {
      if (settled) return;
      rx = Buffer.concat([rx, chunk]);
      const start = rx.indexOf(0x7E);
      if (start >= 0 && rx.length >= start + 3) {
        const frameFormat = (rx[start + 1] << 8) | rx[start + 2];
        const len = frameFormat & 0x07FF; // 11-bit HDLC length
        const total = len + 2;            // includes opening and closing 0x7E
        if (rx.length >= start + total && rx[start + total - 1] === 0x7E) {
          cleanup();
          resolve(rx.slice(start, start + total));
        }
      }
    };

    portInstance.on('data', onData);

    timer = setTimeout(() => {
      if (settled) return;
      cleanup();
      resolve(rx.length > 0 ? rx : null);
    }, timeoutMs);

    if (portInstance && portInstance.isOpen) {
      portInstance.write(txFrame, (err) => {
        if (err && !settled) {
          cleanup();
          reject(err);
        }
      });
    } else {
      cleanup();
      reject(new Error('Serial port is not open'));
      return;
    }

    // Optical pulse keep-alive to trigger Renesas UART TX buffer
    pollInterval = setInterval(() => {
      if (settled || !timer || !portInstance || !portInstance.isOpen) {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        return;
      }
      if (rx.length > 0 && rx[rx.length - 1] !== 0x7E) {
        try {
          if (portInstance.isOpen) {
            portInstance.write(Buffer.from([0x00]), () => { });
          }
        } catch (e) { }
      }
    }, 150);
  });
}

class DlmsOpticalService {
  /**
   * Check optical cable connection status across available serial ports in Windows Device Manager.
   * Filters out motherboard COM1 and only accepts real USB Serial / Optical Probe cables (e.g. FTDI Optical Port COM3).
   * Also checks if a client laptop is connected via Web Serial tunnel with device isolation.
   */
  static async checkOpticalCable(options = {}) {
    try {
      const { tunnelId, deviceId, isLocalhost = false, allowServerPort = false } =
        typeof options === 'object' && options ? options : {};
      const { getOpticalTunnel } = require('../../../../../core/services/socket.service');

      // 1. If a specific client tunnelId is requested, verify ownership and status
      if (tunnelId) {
        const activeTunnel = getOpticalTunnel(tunnelId, deviceId);
        if (activeTunnel && activeTunnel.isOpen) {
          return {
            connected: true,
            port: activeTunnel.portName || 'Optical Port',
            friendlyName: `${activeTunnel.portName || 'Optical Port'} (Personal Laptop)`,
            source: 'client_tunnel',
            tunnelId: activeTunnel.tunnelId,
            deviceId: activeTunnel.deviceId,
            baudRate: 9600,
            ports: [{ path: activeTunnel.tunnelId, friendlyName: `${activeTunnel.portName || 'Optical Port'} (Personal Laptop)` }]
          };
        }
        return {
          connected: false,
          port: null,
          friendlyName: null,
          baudRate: 9600,
          ports: [],
          message: 'Client optical tunnel is disconnected or belongs to another device.'
        };
      }

      // 2. If no tunnelId is provided and request is from a remote client (e.g. personal laptop),
      // DO NOT automatically connect or expose server hardware COM ports to other devices!
      if (!isLocalhost && !allowServerPort) {
        return {
          connected: false,
          port: null,
          friendlyName: null,
          baudRate: 9600,
          ports: [],
          source: 'client_disconnected',
          message: 'No optical cable connected to this workstation. Please plug USB optical cable directly into your laptop.'
        };
      }

      // 3. Physical server COM port check (only for local server host or explicit server port check)
      if (!SerialPort) {
        return {
          connected: false,
          port: null,
          friendlyName: null,
          baudRate: 9600,
          ports: [],
          message: 'SerialPort driver unavailable.'
        };
      }

      const rawPorts = await SerialPort.list();
      const opticalPorts = rawPorts
        .map(p => {
          const path = (p.path || '').trim();
          let friendly = (p.friendlyName || p.path || '').trim();
          const isUsb = Boolean(p.vendorId || p.productId || /usb|ftdi/i.test(p.manufacturer) || /usb/i.test(friendly)) && path.toUpperCase() !== 'COM1';
          return {
            path,
            friendlyName: friendly,
            manufacturer: p.manufacturer || 'Serial Port',
            vendorId: p.vendorId || null,
            productId: p.productId || null,
            pnpId: p.pnpId || null,
            isUsb
          };
        })
        .sort((a, b) => {
          const numA = parseInt((a.path || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt((b.path || '').replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });

      const isDetected = opticalPorts.length > 0;
      const primary = isDetected ? opticalPorts[0] : null;

      // Check if previously connected optical port is still physically present in Device Manager
      let isConnected = false;
      let connectedPortObj = null;
      if (activeOpticalConnectedPort) {
        const cleanActive = (activeOpticalConnectedPort.match(/COM\d+/i)?.[0] || activeOpticalConnectedPort).toUpperCase();
        connectedPortObj = opticalPorts.find(p => {
          const cleanP = (p.path.match(/COM\d+/i)?.[0] || p.path).toUpperCase();
          return cleanP === cleanActive;
        });
        if (connectedPortObj) {
          isConnected = true;
        } else {
          // Port was physically unplugged from system
          logger.warn(`[DlmsOpticalService] Active port ${activeOpticalConnectedPort} physically removed from system.`);
          activeOpticalConnectedPort = null;
          isConnected = false;
        }
      }

      return {
        connected: isConnected,
        detected: isDetected,
        port: isConnected ? activeOpticalConnectedPort : (primary ? primary.path : null),
        friendlyName: isConnected && connectedPortObj ? connectedPortObj.friendlyName : (primary ? primary.friendlyName : null),
        manufacturer: isConnected && connectedPortObj ? connectedPortObj.manufacturer : (primary ? primary.manufacturer : null),
        source: 'server',
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        ports: opticalPorts,
        message: isConnected
          ? `Optical Cable connected on ${activeOpticalConnectedPort}`
          : (isDetected ? `Ports detected: ${opticalPorts.map(p => p.friendlyName || p.path).join(', ')}. Ready to connect.` : 'No serial port detected.')
      };
    } catch (err) {
      logger.error('[DlmsOpticalService] Error checking optical cable:', err);
      return {
        connected: false,
        detected: false,
        port: null,
        friendlyName: null,
        baudRate: 9600,
        ports: [],
        error: err.message,
        message: 'Optical Cable Not Detected: ' + err.message
      };
    }
  }

  /**
   * Connect and verify physical communication with the optical cable on the specified COM port
   */
  static async connectOpticalPort(portName = null, options = {}) {
    if (!SerialPort) {
      return {
        success: false,
        connected: false,
        ports: [],
        message: 'SerialPort driver unavailable.'
      };
    }

    const opts = typeof options === 'object' && options !== null ? options : {};
    const baudRate = Number(opts.baudRate) || 9600;
    const dataBits = Number(opts.dataBits) || 8;
    const parity = (opts.parity || 'none').toLowerCase();
    const stopBits = Number(opts.stopBits) || 1;

    try {
      const rawPorts = await SerialPort.list();
      const opticalPorts = rawPorts
        .map(p => {
          const path = (p.path || '').trim();
          let friendly = (p.friendlyName || p.path || '').trim();
          const isUsb = Boolean(p.vendorId || p.productId || /usb|ftdi/i.test(p.manufacturer) || /usb/i.test(friendly)) && path.toUpperCase() !== 'COM1';
          return {
            path,
            friendlyName: friendly,
            manufacturer: p.manufacturer || 'Serial Port',
            vendorId: p.vendorId || null,
            productId: p.productId || null,
            pnpId: p.pnpId || null,
            isUsb
          };
        })
        .sort((a, b) => {
          const numA = parseInt((a.path || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt((b.path || '').replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });

      if (opticalPorts.length === 0 && !portName) {
        return {
          success: false,
          connected: false,
          ports: [],
          message: 'No serial port detected. Please check physical cable connection.'
        };
      }

      const target = portName
        ? (opticalPorts.find(p => p.path.toLowerCase() === portName.toLowerCase()) ||
          opticalPorts.find(p => p.friendlyName.toLowerCase().includes(portName.toLowerCase()) || portName.toLowerCase().includes(p.path.toLowerCase())) ||
          { path: portName, friendlyName: portName })
        : opticalPorts[0];

      if (!target) {
        return {
          success: false,
          connected: false,
          ports: opticalPorts,
          message: `Port Not Detected on ${portName || 'selected port'}. Please check physical connection.`
        };
      }

      // If already connected to this target port, return success immediately
      const activeClean = activeOpticalConnectedPort ? (activeOpticalConnectedPort.match(/COM\d+/i)?.[0] || activeOpticalConnectedPort).toUpperCase() : null;
      const targetClean = (target.path.match(/COM\d+/i)?.[0] || target.path).toUpperCase();
      if (activeClean && activeClean === targetClean) {
        return {
          success: true,
          connected: true,
          port: target.path,
          friendlyName: target.friendlyName,
          baudRate: 9600,
          ports: opticalPorts,
          message: `Already connected to ${target.friendlyName}.`
        };
      }

      // Mutual exclusion check: Check if Laser Serial Service is currently using this port
      try {
        const laserSerialService = require('../laser/laserSerialService');
        if (laserSerialService && laserSerialService.isPortInUse(target.path)) {
          return {
            success: false,
            connected: false,
            ports: opticalPorts,
            message: `Port ${target.path} is currently connected to Laser Port. Please select a different COM port or disconnect Laser Port first.`
          };
        }
      } catch (_) { }

      // Establish physical communication with selected COM port
      return await new Promise((resolve) => {
        let tempPort = null;
        try {
          tempPort = new SerialPort({
            path: target.path,
            baudRate,
            dataBits,
            parity,
            stopBits,
            autoOpen: false
          });

          tempPort.open((err) => {
            if (err) {
              logger.warn(`[DlmsOpticalService] Failed to open port ${target.path}:`, err.message);
              return resolve({
                success: false,
                connected: false,
                ports: opticalPorts,
                message: `Optical Cable Not Detected: Unable to communicate with ${target.path} (${err.message})`
              });
            }

            // Power optical probe transceiver via DTR/RTS control lines
            tempPort.set({ dtr: true, rts: true }, (setErr) => {
              if (setErr) {
                logger.warn(`[DlmsOpticalService] Warning setting control signals on ${target.path}:`, setErr.message);
              }
              // Close test port handle cleanly so subsequent DLMS reader can open it without conflict
              tempPort.close(() => {
                activeOpticalConnectedPort = target.path;
                resolve({
                  success: true,
                  connected: true,
                  port: target.path,
                  friendlyName: target.friendlyName,
                  baudRate: 9600,
                  ports: opticalPorts,
                  message: `Optical Cable connected successfully on ${target.friendlyName}.`
                });
              });
            });
          });
        } catch (ex) {
          logger.error(`[DlmsOpticalService] Error testing optical port ${target.path}:`, ex);
          if (tempPort && tempPort.isOpen) {
            try { tempPort.close(); } catch (e) { }
          }
          resolve({
            success: false,
            connected: false,
            ports: opticalPorts,
            message: `Optical Cable Not Detected: ${ex.message}`
          });
        }
      });
    } catch (err) {
      logger.error('[DlmsOpticalService] Error connecting optical port:', err);
      return {
        success: false,
        connected: false,
        ports: [],
        message: 'Optical Cable Not Detected: ' + err.message
      };
    }
  }

  /**
   * Release and disconnect any active connection/handle to the specified optical port
   */
  static async releaseOpticalPort(portName = null) {
    try {
      activeOpticalConnectedPort = null;
      logger.info(`[DlmsOpticalService] Optical port ${portName || 'all'} released.`);
      return {
        success: true,
        connected: false,
        port: portName,
        message: `Optical port ${portName || ''} released successfully.`
      };
    } catch (err) {
      activeOpticalConnectedPort = null;
      return {
        success: true,
        connected: false,
        port: portName,
        message: err.message
      };
    }
  }

  static isPortInUse(portPath) {
    if (!activeOpticalConnectedPort || !portPath) return false;
    const p1 = String(activeOpticalConnectedPort).trim().toUpperCase();
    const p2 = String(portPath).trim().toUpperCase();
    const m1 = p1.match(/COM\d+/i)?.[0] || p1;
    const m2 = p2.match(/COM\d+/i)?.[0] || p2;
    return m1 === m2;
  }

  static getConnectedPort() {
    return activeOpticalConnectedPort;
  }

  /**
   * Dynamically resolve stage_id (and stage_name) from stage_work_forms for a given work_id
   */
  static async resolveStageIdForWorkId(work_id, providedStageId = null, dbClient = null) {
    if (providedStageId !== undefined && providedStageId !== null && !isNaN(Number(providedStageId))) {
      return Number(providedStageId);
    }
    const runner = dbClient || getPool();
    if (runner && work_id) {
      try {
        const res = await runner.query(
          `SELECT stage_number FROM stage_work_forms WHERE form_id = $1 LIMIT 1`,
          [work_id]
        );
        if (res.rows.length > 0 && res.rows[0].stage_number !== undefined && res.rows[0].stage_number !== null) {
          return Number(res.rows[0].stage_number);
        }
      } catch (e) {
        logger.warn('[DlmsOpticalService] Could not query stage_work_forms for stage_id:', e.message);
      }
    }
    if (work_id) {
      const match = String(work_id).match(/STG(\d+)/i);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Normalize role string into 'OPERATOR', 'SUPERVISOR', or 'QC'
   */
  static normalizeRoleType(rawRole) {
    const r = String(rawRole || '').toUpperCase();
    if (r.includes('SUPERVISOR')) return 'SUPERVISOR';
    if (r.includes('QC') || r.includes('QUALITY')) return 'QC';
    return 'OPERATOR';
  }

  /**
   * Resolve operator role and display name from users table if not explicitly provided
   */
  static async resolveUserMeta(operator_id, providedRole = null, providedName = null, dbClient = null) {
    let resolvedRole = providedRole;
    let resolvedName = providedName;
    const runner = dbClient || getPool();
    if (runner && operator_id) {
      try {
        const res = await runner.query(
          `SELECT employee_id, name, user_name, role FROM users 
           WHERE LOWER(employee_id) = LOWER($1) OR LOWER(user_name) = LOWER($1) OR LOWER(name) = LOWER($1) OR CAST(id AS TEXT) = $1
           LIMIT 1`,
          [String(operator_id).trim()]
        );
        if (res.rows.length > 0) {
          const u = res.rows[0];
          if (!resolvedRole && u.role) resolvedRole = u.role;
          if (!resolvedName && (u.name || u.user_name)) resolvedName = u.name || u.user_name;
        }
      } catch (e) { }
    }
    return {
      user_role: this.normalizeRoleType(resolvedRole),
      raw_role: resolvedRole || 'OPERATOR',
      operator_name: resolvedName || null
    };
  }

  /**
   * Read real meter data (Serial No, Device No, IMEI No, NIC Sr.No) via DLMS library and OBIS codes.
   * Supports both server-side physical COM ports (node-serialport) and client laptop Web Serial tunnels.
   */
  static async readMeterData({
    port = null,
    work_id = null,
    stage_id = null,
    operator_id = 'OPERATOR',
    operator_name = null,
    user_role = null,
    tunnel_id = null,
    tunnelId = null,
    device_id = null,
    deviceId = null
  }) {
    const logs = [];
    const addLog = (msg, status = 'INFO') => {
      const time = formatTimestamp();
      logs.push({ id: Date.now() + Math.random(), time, msg, status });
    };

    const baudRate = env.DLMS_BAUD_RATE;
    const obisMeterSerial = env.DLMS_OBIS_METER_SERIAL;
    const obisDeviceNo = env.DLMS_OBIS_DEVICE_NO;
    const obisImei = env.DLMS_OBIS_IMEI;
    const obisNicSr = env.DLMS_OBIS_NIC_SR;

    addLog('Initiating real DLMS optical communication probe sequence...', 'INFO');

    if (work_id) {
      try {
        await this.assertWorkFormTargetNotReached({ work_id, stage_id, operator_id, user_role });
      } catch (limitErr) {
        addLog(limitErr.message, 'ERROR');
        throw limitErr;
      }
    }

    // 1. Resolve COM port or Client Tunnel with device isolation
    const effectiveTunnelId = tunnel_id || tunnelId;
    const effectiveDeviceId = device_id || deviceId;
    let tunnelInstance = null;
    const { getOpticalTunnel } = require('../../../../../core/services/socket.service');

    if (effectiveTunnelId) {
      tunnelInstance = getOpticalTunnel(effectiveTunnelId, effectiveDeviceId);
      if (!tunnelInstance || !tunnelInstance.isOpen) {
        addLog(`Optical tunnel ${effectiveTunnelId} is not active. Checking local server optical port...`, 'WARNING');
      }
    }

    let targetPort = port;
    if (tunnelInstance && tunnelInstance.isOpen) {
      targetPort = tunnelInstance.portName || 'Optical Port';
    } else {
      // If no active client tunnel was supplied, check server hardware ports
      const cableStatus = await this.checkOpticalCable({ isLocalhost: true, allowServerPort: true });
      if (targetPort && !targetPort.startsWith('opt_tunnel_')) {
        let matched = cableStatus.ports.find(p => p.path.toLowerCase() === targetPort.toLowerCase());
        if (!matched) {
          matched = cableStatus.ports.find(p =>
            (p.friendlyName && p.friendlyName.toLowerCase().includes(targetPort.toLowerCase())) ||
            (targetPort.toLowerCase().includes(p.path.toLowerCase()))
          );
        }
        if (matched) {
          targetPort = matched.path;
        } else if (cableStatus.port) {
          targetPort = cableStatus.port;
        } else if (!cableStatus.detected && !cableStatus.connected) {
          addLog(`Requested port ${targetPort} is not a valid connected USB optical cable on server.`, 'ERROR');
          throw new Error('Optical cable is not connected on server. Please plug USB optical cable directly into your device.');
        }
      } else {
        if ((!cableStatus.detected && !cableStatus.connected) || !cableStatus.port) {
          addLog('No USB optical cable detected on server.', 'ERROR');
          throw new Error('Optical cable is not connected. Please connect USB Optical Cable and click Connect.');
        }
        targetPort = cableStatus.port;
      }
    }

    addLog(`Target optical interface: ${targetPort} ${tunnelInstance ? '(Client Web Serial Tunnel)' : ''} @ ${baudRate} Baud (8N1 DLMS/COSEM HDLC)`, 'INFO');

    if (!guruxDlms) {
      throw new Error('DLMS protocol library (@bubblyworld/gurux-dlms-ts) is not installed.');
    }
    if (!tunnelInstance && !SerialPort) {
      throw new Error('SerialPort module is not installed.');
    }

    // 2. Initialize Gurux DLMS Client from environment configuration
    const clientAddress = env.DLMS_CLIENT_ADDRESS;
    const serverAddress = env.DLMS_SERVER_ADDRESS;
    const dlmsAuthLevel = env.DLMS_AUTH_LEVEL;
    const dlmsSecurityLevel = env.DLMS_SECURITY_LEVEL;
    const dlmsPassword = env.DLMS_PASSWORD;
    const dlmsSystemTitle = env.DLMS_SYSTEM_TITLE;
    const dlmsBlockCipherKey = env.DLMS_BLOCK_CIPHER_KEY;
    const dlmsAuthKey = env.DLMS_AUTH_KEY;

    let client = await guruxDlms.DlmsClient.create({
      clientAddress,
      serverAddress,
      password: dlmsPassword,
      interfaceType: guruxDlms.InterfaceType.HDLC
    });
    client.setInt('authentication', dlmsAuthLevel);
    client.setInt('security', dlmsSecurityLevel);
    client.setStr('systemTitle', dlmsSystemTitle);
    client.setStr('password', dlmsPassword);
    client.setStr('blockCipherKey', dlmsBlockCipherKey);
    client.setStr('authenticationKey', dlmsAuthKey);

    addLog(`Gurux DLMS client initialized (Client SAP 0x${clientAddress.toString(16).toUpperCase()}, Server SAP ${serverAddress}, Auth ${dlmsAuthLevel}, Security 0x${dlmsSecurityLevel.toString(16).toUpperCase()})`, 'SUCCESS');

    let portInstance = null;
    let readSerialVal = null;
    let readImeiVal = null;
    let readDeviceVal = null;
    let readNicVal = null;

    try {
      if (tunnelInstance) {
        portInstance = tunnelInstance;
        // Set DTR/RTS signals on client Web Serial to power optical probe
        await new Promise((resolve) => {
          portInstance.set({ dtr: true, rts: true }, (err) => {
            if (err) logger.warn('[DlmsOpticalService] Error setting DTR/RTS on tunnel:', err.message);
            resolve();
          });
        });
        addLog(`Client Web Serial port (${targetPort}) ready with DTR/RTS powered. Initiating HDLC Link Layer...`, 'SUCCESS');
      } else {
        addLog(`Opening ${targetPort} at ${baudRate} Baud, 8N1...`, 'INFO');
        portInstance = new SerialPort({
          path: targetPort,
          baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          autoOpen: false
        });

        portInstance.on('error', (err) => {
          logger.warn('[DlmsOpticalService] SerialPort async event:', err.message);
        });

        await new Promise((resolve, reject) => {
          portInstance.open((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // CRUCIAL: Set DTR and RTS to supply optical probe LED transmitter power
        await new Promise((resolve) => {
          portInstance.set({ dtr: true, rts: true }, (err) => {
            if (err) logger.warn('[DlmsOpticalService] Error setting DTR/RTS:', err.message);
            resolve();
          });
        });

        addLog(`Port ${targetPort} opened with DTR/RTS powered. Initiating HDLC Link Layer...`, 'SUCCESS');
      }

      // Optical Wake-up pulse
      portInstance.write(Buffer.from([0x00, 0x00, 0x00]));
      await new Promise(r => setTimeout(r, 200));

      // STEP 1: Send SNRM Frame
      let snrmFrame = Buffer.from(client.snrmRequest()[0]);
      addLog(`[TX SNRM] ${snrmFrame.toString('hex').toUpperCase()}`, 'INFO');

      let rxUa = await exchangeHdlcFrame(portInstance, snrmFrame, 3000);
      if (!rxUa || rxUa.length < 10) {
        addLog(`Waking up meter infrared detector on ${targetPort}...`, 'WARNING');
        rxUa = await exchangeHdlcFrame(portInstance, snrmFrame, 3500);
      }

      if (!rxUa || rxUa.length < 10) {
        throw new Error(`Meter did not respond on optical interface ${targetPort}. Please verify that the optical probe is firmly seated on the meter's optical port and the meter is powered on.`);
      }

      addLog(`[RX UA] ${rxUa.toString('hex').toUpperCase()}`, 'SUCCESS');
      client.parseUaResponse(new Uint8Array(rxUa));
      // Ensure maxInfoTX/RX are valid (>128) in case meter returns short UA frame
      if (client.getInt('maxInfoTX') < 128) client.setInt('maxInfoTX', 128);
      if (client.getInt('maxInfoRX') < 128) client.setInt('maxInfoRX', 128);
      addLog('HDLC Connection Established. Establishing Application Association (AARQ)...', 'SUCCESS');

      // STEP 2: Send AARQ Frame
      let aarqFrame = Buffer.from(client.aarqRequest()[0]);
      addLog(`[TX AARQ] ${aarqFrame.toString('hex').toUpperCase()}`, 'INFO');

      let rxAare = await exchangeHdlcFrame(portInstance, aarqFrame, 4000);
      let associationOk = false;

      if (rxAare && rxAare.length >= 10) {
        addLog(`[RX AARE] ${rxAare.toString('hex').toUpperCase()}`, 'SUCCESS');
        try {
          client.parseAareResponse(new Uint8Array(rxAare));
          associationOk = true;
          addLog(`Application Association Established (Client 0x${clientAddress.toString(16).toUpperCase()} Accepted)! Querying Meter OBIS objects...`, 'SUCCESS');
        } catch (aareErr) {
          addLog(`MR Association note (${aareErr.message}), retrying Public Client 0x10...`, 'WARNING');
        }
      }

      // Fallback to Public Client (0x10, Auth: None) if MR association was not accepted
      if (!associationOk) {
        try { client.free(); } catch (e) { }
        client = await guruxDlms.DlmsClient.create({
          clientAddress: 0x10,
          serverAddress,
          interfaceType: guruxDlms.InterfaceType.HDLC
        });
        client.setInt('authentication', 0);

        const pubSnrm = Buffer.from('7EA0070321930F017E', 'hex');
        addLog(`[TX SNRM] ${pubSnrm.toString('hex').toUpperCase()}`, 'INFO');
        const pubUa = await exchangeHdlcFrame(portInstance, pubSnrm, 3000);
        if (!pubUa || pubUa.length < 10) {
          throw new Error('Meter rejected Application Association and did not respond to Public Client.');
        }
        client.parseUaResponse(new Uint8Array(pubUa));
        if (client.getInt('maxInfoTX') < 128) client.setInt('maxInfoTX', 128);
        if (client.getInt('maxInfoRX') < 128) client.setInt('maxInfoRX', 128);

        const pubAarq = Buffer.from(client.aarqRequest()[0]);
        addLog(`[TX AARQ] ${pubAarq.toString('hex').toUpperCase()}`, 'INFO');
        const pubAare = await exchangeHdlcFrame(portInstance, pubAarq, 4000);
        if (!pubAare || pubAare.length < 10) {
          throw new Error('Meter rejected Application Association (no AARE response received).');
        }
        addLog(`[RX AARE] ${pubAare.toString('hex').toUpperCase()}`, 'SUCCESS');
        client.parseAareResponse(new Uint8Array(pubAare));
        addLog('Application Association Established (Public Client 0x10)! Querying Meter OBIS objects...', 'SUCCESS');
      }

      // STEP 3: Read Meter Serial Number (env.DLMS_OBIS_METER_SERIAL)
      try {
        const parsedSerial = await readDlmsAttribute(
          client,
          portInstance,
          obisMeterSerial,
          2,
          addLog,
          'Meter Serial Number'
        );
        if (parsedSerial && typeof parsedSerial === 'string') {
          readSerialVal = sanitizeDbText(parsedSerial);
        } else if (Array.isArray(parsedSerial) && parsedSerial.length > 0) {
          readSerialVal = sanitizeDbText(parsedSerial[0]);
        }
      } catch (e) {
        addLog(`Serial decode note: ${e.message}`, 'WARNING');
      }

      if (!readSerialVal) {
        throw new Error(`Failed to read Meter Serial Number from OBIS ${obisMeterSerial} on meter.`);
      }
      addLog(`Meter Serial Number Read: "${readSerialVal}" (OBIS ${obisMeterSerial})`, 'SUCCESS');

      // STEP 4: Query Manufacturer-Specific Data / Modem IMEI (env.DLMS_OBIS_IMEI)
      try {
        const parsedMfr = await readDlmsAttribute(
          client,
          portInstance,
          obisImei,
          2,
          addLog,
          'Manufacturer Specific Data / IMEI'
        );

        if (Array.isArray(parsedMfr)) {
          addLog(`OBIS ${obisImei} Array Read: ${JSON.stringify(parsedMfr)}`, 'SUCCESS');
          const imeiMatch = parsedMfr.find(item => typeof item === 'string' && /^\d{14,17}$/.test(sanitizeDbText(item) || ''));
          const fourthItem = parsedMfr[3] ? sanitizeDbText(parsedMfr[3]) : null;
          readImeiVal = (imeiMatch ? sanitizeDbText(imeiMatch) : null) || fourthItem || null;
          if (readImeiVal) {
            addLog(`Meter Modem IMEI Read: "${readImeiVal}" (OBIS ${obisImei})`, 'SUCCESS');
          }
        } else if (typeof parsedMfr === 'string' && sanitizeDbText(parsedMfr)) {
          readImeiVal = sanitizeDbText(parsedMfr);
          addLog(`Meter Modem IMEI Read: "${readImeiVal}" (OBIS ${obisImei})`, 'SUCCESS');
        }
      } catch (e) {
        addLog(`OBIS ${obisImei} read note: ${e.message}`, 'WARNING');
      }

      // STEP 5: Query Device ID (env.DLMS_OBIS_DEVICE_NO)
      try {
        const parsedDev = await readDlmsAttribute(
          client,
          portInstance,
          obisDeviceNo,
          2,
          null,
          'Device ID'
        );
        if (parsedDev && typeof parsedDev === 'string') {
          const cleanDev = sanitizeDbText(parsedDev);
          if (cleanDev && /^[A-Za-z0-9_\-\.\:\/ ]+$/.test(cleanDev)) {
            readDeviceVal = cleanDev;
          }
        }
      } catch (e) { }

      // STEP 6: Query NIC Sr.No (env.DLMS_OBIS_NIC_SR)
      try {
        const parsedNic = await readDlmsAttribute(
          client,
          portInstance,
          obisNicSr,
          2,
          null,
          'NIC Serial Number'
        );
        if (parsedNic && typeof parsedNic === 'string') {
          const cleanNic = sanitizeDbText(parsedNic);
          // Ignore all-zero placeholder strings if meter has no NIC serial programmed
          if (cleanNic && !/^0+$/.test(cleanNic) && /^[A-Za-z0-9_\-\.\:\/ ]+$/.test(cleanNic)) {
            readNicVal = cleanNic;
          }
        } else if (Array.isArray(parsedNic)) {
          const validStr = parsedNic
            .map(x => (typeof x === 'string' ? sanitizeDbText(x) : null))
            .find(x => x && !/^0+$/.test(x) && /^[A-Za-z0-9_\-\.\:\/ ]+$/.test(x));
          if (validStr) readNicVal = validStr;
        }
      } catch (e) { }

      // Send Disconnect (DISC) frame
      try {
        const discFrames = client.disconnectRequest();
        if (discFrames && discFrames.length > 0) {
          await exchangeHdlcFrame(portInstance, Buffer.from(discFrames[0]), 800);
        }
      } catch (e) { }

      try { client.free(); } catch (e) { }
      await safeClosePort(portInstance);
    } catch (err) {
      try { if (client) client.free(); } catch (e) { }
      await safeClosePort(portInstance);
      addLog(`DLMS Communication Failed: ${err.message}`, 'ERROR');
      throw err;
    }

    // Lookup existing database records for IMEI/NIC if protected from public DLMS client
    if (!readImeiVal && readSerialVal) {
      try {
        const pool = getPool();
        if (pool) {
          const existing = await pool.query(
            `SELECT imei_no, nic_sr_no, device_no FROM stage09_meter_records WHERE meter_serial_no = $1 AND imei_no IS NOT NULL AND imei_no <> '' ORDER BY id DESC LIMIT 1`,
            [readSerialVal]
          );
          if (existing.rows.length > 0 && existing.rows[0].imei_no) {
            readImeiVal = sanitizeDbText(existing.rows[0].imei_no);
            if (!readDeviceVal && existing.rows[0].device_no) readDeviceVal = sanitizeDbText(existing.rows[0].device_no);
            if (!readNicVal && existing.rows[0].nic_sr_no && !String(existing.rows[0].nic_sr_no).startsWith('NIC-ZG')) {
              readNicVal = sanitizeDbText(existing.rows[0].nic_sr_no);
            }
          }
        }
      } catch (e) { }
    }

    const meterValues = {
      serialNo: sanitizeDbText(readSerialVal),
      deviceNo: sanitizeDbText(readDeviceVal),
      imeiNo: sanitizeDbText(readImeiVal),
      nicSrNo: sanitizeDbText(readNicVal)
    };

    addLog(`Real Meter Values Successfully Read from Physical Meter:`, 'SUCCESS');
    addLog(`-> Serial No: ${meterValues.serialNo || '-'}`, meterValues.serialNo ? 'SUCCESS' : 'WARNING');
    addLog(`-> IMEI No: ${meterValues.imeiNo || '-'}`, meterValues.imeiNo ? 'SUCCESS' : 'WARNING');
    addLog(`-> NIC Sr.No: ${meterValues.nicSrNo || '-'}`, meterValues.nicSrNo ? 'SUCCESS' : 'WARNING');

    // Strict validation: Serial No, IMEI No, and NIC Sr.No MUST ALL be present to save to database
    const isValMissing = (v) => !v || String(v).trim().length === 0 || String(v).trim() === '-' || String(v).trim().toLowerCase() === 'null' || String(v).trim().toLowerCase() === 'undefined' || /^0+$/.test(String(v).trim());
    const missingFields = [];
    if (isValMissing(meterValues.serialNo)) missingFields.push('Serial No');
    if (isValMissing(meterValues.imeiNo)) missingFields.push('IMEI No');
    if (isValMissing(meterValues.nicSrNo) || (meterValues.serialNo && (meterValues.nicSrNo === `NIC-${meterValues.serialNo}` || meterValues.nicSrNo === `NIC-ZG-${meterValues.serialNo}`))) {
      missingFields.push('NIC Sr.No');
    }

    const isIncomplete = missingFields.length > 0;
    const dynamicStageId = await this.resolveStageIdForWorkId(work_id, stage_id);

    // IF any 1, 2, or 3 fields are missing -> DO NOT save to PostgreSQL database!
    if (isIncomplete) {
      const receivedSummary = `Serial No: ${meterValues.serialNo || 'MISSING'}, IMEI No: ${meterValues.imeiNo || 'MISSING'}, NIC Sr.No: ${meterValues.nicSrNo || 'MISSING'}`;
      const failReason = `Data read from physical meter: (${receivedSummary}). Database save rejected because [${missingFields.join(', ')}] is missing. All 3 fields (Serial No, IMEI No, and NIC Sr.No) are required from the meter before saving to the database.`;

      addLog(`[METER READ COMPLETE] Received from optical probe -> ${receivedSummary}`, 'INFO');
      addLog(`[DB SAVE BLOCKED] Missing required fields: ${missingFields.join(', ')}`, 'ERROR');
      addLog(`[WHY NOT SAVED TO DB] ${failReason}`, 'ERROR');

      let operatorCompletedCount = null;
      let batchCompletedCount = null;
      let targetQuantity = null;
      if (work_id) {
        try {
          const progress = await this.getWorkFormOperatorProgress(work_id, operator_id, null, false, dynamicStageId);
          targetQuantity = progress.targetQuantity;
          batchCompletedCount = progress.batchCompletedCount;
          const normalizedRole = this.normalizeRoleType(user_role);
          operatorCompletedCount = normalizedRole === 'OPERATOR'
            ? progress.operatorCompletedCount
            : await this.getStage09RecordCount(work_id, { operator_id, stage_id: dynamicStageId, role_type: normalizedRole });
        } catch (_) { }
      }

      return {
        success: true,
        savedToDb: false,
        isIncomplete: true,
        missingFields,
        reason: failReason,
        message: `Incomplete Meter Data: Missing ${missingFields.join(', ')}. Data retrieved from meter: (${receivedSummary}). Record was NOT saved to database.`,
        meterData: meterValues,
        savedRecord: null,
        port: targetPort,
        stage_id: dynamicStageId,
        work_id,
        operator_completed_count: operatorCompletedCount,
        batch_completed_count: batchCompletedCount,
        target_quantity: targetQuantity,
        logs
      };
    }

    // 5. All 3 numbers present -> Save to PostgreSQL database
    let savedRecord = null;
    try {
      savedRecord = await this.saveMeterRecordToDb({
        work_id,
        stage_id: dynamicStageId,
        meter_serial_no: meterValues.serialNo,
        device_no: meterValues.deviceNo,
        imei_no: meterValues.imeiNo,
        nic_sr_no: meterValues.nicSrNo,
        operator_id,
        operator_name,
        user_role,
        raw_dlms_data: {
          meter_serial_obis: obisMeterSerial,
          device_no_obis: obisDeviceNo,
          imei_obis: obisImei,
          nic_sr_obis: obisNicSr,
          port: targetPort,
          baudRate,
          captured_time: new Date().toISOString()
        }
      });
      addLog(`[DB SAVE] Record successfully persisted in PostgreSQL under Work ID: ${work_id} (Stage #${savedRecord.stage_id}, Role: ${savedRecord.user_role || 'OPERATOR'}, Record #${savedRecord.id})`, 'SUCCESS');
    } catch (dbErr) {
      if (dbErr.isDuplicate || dbErr.isValidationConflict || dbErr.isTargetLimitError || dbErr.isValidationError) {
        addLog(`[VALIDATION BLOCKED] ${dbErr.message}`, 'ERROR');
        throw dbErr;
      }
      addLog(`[DB SAVE WARNING] Could not persist to DB: ${dbErr.message}`, 'WARNING');
      logger.error('[DlmsOpticalService] Error saving to DB:', dbErr);
    }

    let operatorCompletedCount = null;
    let batchCompletedCount = null;
    let targetQuantity = null;
    if (work_id) {
      const progress = await this.getWorkFormOperatorProgress(work_id, operator_id, null, false, savedRecord?.stage_id || dynamicStageId);
      targetQuantity = progress.targetQuantity;
      batchCompletedCount = progress.batchCompletedCount;
      const normalizedRole = this.normalizeRoleType(savedRecord?.user_role || user_role);
      operatorCompletedCount = normalizedRole === 'OPERATOR'
        ? progress.operatorCompletedCount
        : await this.getStage09RecordCount(work_id, { operator_id, stage_id: savedRecord?.stage_id || dynamicStageId, role_type: normalizedRole });
    }

    const isAlreadyPrinted = Boolean(
      savedRecord?.isPrinted ||
      savedRecord?.record?.print === 'printed' ||
      savedRecord?.record?.print === 'PRINTED' ||
      savedRecord?.print === 'printed' ||
      savedRecord?.print === 'PRINTED'
    );

    return {
      success: true,
      savedToDb: true,
      isIncomplete: false,
      missingFields: [],
      port: targetPort,
      stage_id: savedRecord?.stage_id || dynamicStageId,
      action: savedRecord?.action || 'CREATED',
      isUpdated: Boolean(savedRecord?.isUpdated),
      isAlreadyPrinted,
      message: isAlreadyPrinted
        ? `Duplicate Meter: Meter ${meterValues.serialNo} is already registered and was laser printed on ${savedRecord?.print_at || savedRecord?.record?.print_at ? new Date(savedRecord?.print_at || savedRecord?.record?.print_at).toLocaleString() : 'record'}.`
        : savedRecord?.message || 'Meter read & saved successfully. Ready for Laser Print.',
      meterData: meterValues,
      savedRecord: savedRecord?.record || savedRecord,
      work_id,
      operator_completed_count: operatorCompletedCount,
      batch_completed_count: batchCompletedCount,
      target_quantity: targetQuantity,
      logs
    };
  }

  /**
   * Validate Serial No, IMEI No, and NIC Sr. No against existing database records:
   * 1. Check all three numbers against existing records in stage09_meter_records.
   * 2. If all three numbers are already the same as an existing meter:
   *    -> Throws Error("Duplicate Meter Detected! This meter is already registered.")
   * 3. If any two numbers are the same but the third number is different:
   *    -> Returns { status: 'UPDATE', targetRecord: existingRecord }
   * 4. If all three numbers are different:
   *    -> Returns { status: 'NEW' }
   */
  static async validateMeterNumbers({
    serial_no,
    imei_no,
    nic_sr_no,
    excludeRecordId = null,
    dbClient = null,
    user_role = 'OPERATOR'
  }) {
    // Duplicate checks apply ONLY for user_role === 'OPERATOR'
    const isOperator = String(user_role || '').trim().toUpperCase() === 'OPERATOR';
    if (!isOperator) {
      return { status: 'NEW' };
    }

    const cleanSerial = sanitizeDbText(serial_no);
    const cleanImei = sanitizeDbText(imei_no);
    const cleanNic = sanitizeDbText(nic_sr_no);

    if (!cleanSerial) {
      throw new Error('Meter Serial No is required.');
    }

    const runner = dbClient || getPool();
    if (!runner) {
      throw new Error('Database pool not connected.');
    }

    const isEq = (a, b) => {
      const sa = sanitizeDbText(a);
      const sb = sanitizeDbText(b);
      if (!sa || !sb) return false;
      return sa.toLowerCase() === sb.toLowerCase();
    };

    // Query existing records matching any of the 3 numbers
    const queryText = `
      SELECT id, work_id, stage_id, meter_serial_no, device_no, imei_no, nic_sr_no, print, print_at, operator_id, user_role, created_at, updated_at
      FROM stage09_meter_records
      WHERE LOWER(meter_serial_no) = LOWER($1)
         OR ($2::text IS NOT NULL AND $2::text <> '' AND LOWER(imei_no) = LOWER($2))
         OR ($3::text IS NOT NULL AND $3::text <> '' AND LOWER(nic_sr_no) = LOWER($3))
      ORDER BY id DESC
    `;
    const queryRes = await runner.query(queryText, [cleanSerial, cleanImei || '', cleanNic || '']);
    let matches = queryRes.rows || [];

    if (excludeRecordId) {
      matches = matches.filter(r => String(r.id) !== String(excludeRecordId));
    }

    if (matches.length === 0) {
      return { status: 'NEW' };
    }

    // 1. Check if all 3 numbers match an existing record
    const exactMatch = matches.find(r => {
      return isEq(cleanSerial, r.meter_serial_no) &&
        isEq(cleanImei, r.imei_no) &&
        isEq(cleanNic, r.nic_sr_no);
    });

    if (exactMatch) {
      const isPrinted = exactMatch.print === 'printed' || exactMatch.print === 'PRINTED';
      if (isPrinted) {
        const printTime = exactMatch.print_at ? new Date(exactMatch.print_at).toLocaleString() : 'record';
        const dupErr = new Error(`Duplicate Meter Detected! Meter ${cleanSerial} is already registered and was laser printed on ${printTime}.`);
        dupErr.isDuplicate = true;
        dupErr.isAlreadyPrinted = true;
        dupErr.statusCode = 409;
        dupErr.existingRecord = exactMatch;
        throw dupErr;
      }

      // If all 3 numbers are in database and NOT printed yet, return status 'EXISTS' with isPrinted: false
      return {
        status: 'EXISTS',
        targetRecord: exactMatch,
        isPrinted: false,
        isDuplicate: true,
        reason: 'Meter already stored in database (Not Printed)'
      };
    }

    // 2. Check if ANY ONE number matches a record that was ALREADY printed
    const printedMatch = matches.find(r => r.print === 'printed' || r.print === 'PRINTED');
    if (printedMatch) {
      const matchedField = isEq(cleanSerial, printedMatch.meter_serial_no)
        ? `Serial No '${cleanSerial}'`
        : (cleanImei && isEq(cleanImei, printedMatch.imei_no))
          ? `IMEI No '${cleanImei}'`
          : `NIC Sr. No '${cleanNic}'`;
      const printTime = printedMatch.print_at ? new Date(printedMatch.print_at).toLocaleString() : 'record';
      const dupErr = new Error(`Duplicate Meter Detected! ${matchedField} already exists in database and was laser printed on ${printTime}.`);
      dupErr.isDuplicate = true;
      dupErr.isAlreadyPrinted = true;
      dupErr.statusCode = 409;
      dupErr.existingRecord = printedMatch;
      throw dupErr;
    }

    // 3. Any two numbers are the same but the third number is different
    const twoMatchCandidate = matches.find(r => {
      const sMatch = isEq(cleanSerial, r.meter_serial_no);
      const iMatch = isEq(cleanImei, r.imei_no);
      const nMatch = isEq(cleanNic, r.nic_sr_no);
      const count = (sMatch ? 1 : 0) + (iMatch ? 1 : 0) + (nMatch ? 1 : 0);
      return count === 2;
    });

    if (twoMatchCandidate) {
      const target = twoMatchCandidate;
      const sMatch = isEq(cleanSerial, target.meter_serial_no);
      const iMatch = isEq(cleanImei, target.imei_no);
      const nMatch = isEq(cleanNic, target.nic_sr_no);

      if (sMatch && iMatch && !nMatch) {
        return {
          status: 'UPDATE',
          targetRecord: target,
          isPrinted: target.print === 'printed' || target.print === 'PRINTED',
          isDuplicate: true,
          reason: 'NIC Sr. No updated',
          diffField: 'nic_sr_no',
          oldValue: target.nic_sr_no,
          newValue: cleanNic
        };
      }

      if (sMatch && nMatch && !iMatch) {
        return {
          status: 'UPDATE',
          targetRecord: target,
          isPrinted: target.print === 'printed' || target.print === 'PRINTED',
          isDuplicate: true,
          reason: 'IMEI No updated',
          diffField: 'imei_no',
          oldValue: target.imei_no,
          newValue: cleanImei
        };
      }

      if (iMatch && nMatch && !sMatch) {
        return {
          status: 'UPDATE',
          targetRecord: target,
          isPrinted: target.print === 'printed' || target.print === 'PRINTED',
          isDuplicate: true,
          reason: 'Serial No updated',
          diffField: 'meter_serial_no',
          oldValue: target.meter_serial_no,
          newValue: cleanSerial
        };
      }
    }

    // 4. Check if Serial already exists on a record that had empty/missing values
    const serialMatch = matches.find(r => isEq(cleanSerial, r.meter_serial_no));
    if (serialMatch) {
      return {
        status: 'UPDATE',
        targetRecord: serialMatch,
        isPrinted: serialMatch.print === 'printed' || serialMatch.print === 'PRINTED',
        isDuplicate: true,
        reason: 'Meter details updated for Serial ' + cleanSerial
      };
    }

    // Unrelated 1-number conflict with another meter:
    const anyMatch = matches[0];
    const matchedField = isEq(cleanSerial, anyMatch.meter_serial_no)
      ? `Serial No '${cleanSerial}'`
      : (cleanImei && isEq(cleanImei, anyMatch.imei_no))
        ? `IMEI No '${cleanImei}'`
        : `NIC Sr. No '${cleanNic}'`;
    const dupErr = new Error(`Duplicate Meter Detected! ${matchedField} already exists in database (Meter: ${anyMatch.meter_serial_no}).`);
    dupErr.isDuplicate = true;
    dupErr.isAlreadyPrinted = Boolean(anyMatch.print === 'printed' || anyMatch.print === 'PRINTED');
    dupErr.statusCode = 409;
    dupErr.existingRecord = anyMatch;
    throw dupErr;

    // RULE 4: All three numbers are different
    return { status: 'NEW' };
  }

  /**
   * Save or update meter data in PostgreSQL database with duplicate validation
   */
  static async saveMeterRecordToDb({
    work_id,
    stage_id = null,
    meter_serial_no,
    device_no,
    imei_no,
    nic_sr_no,
    operator_id = 'OPERATOR',
    operator_name = null,
    user_role = null,
    raw_dlms_data = {}
  }) {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database pool not connected.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Ensure table and print / role columns exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS stage09_meter_records (
          id SERIAL PRIMARY KEY,
          work_id VARCHAR(50) NOT NULL,
          stage_id INT,
          meter_serial_no VARCHAR(100) NOT NULL,
          device_no VARCHAR(100),
          imei_no VARCHAR(100),
          nic_sr_no VARCHAR(100),
          raw_dlms_data JSONB,
          operator_id VARCHAR(50),
          operator_name VARCHAR(100),
          user_role VARCHAR(50) DEFAULT 'OPERATOR',
          status VARCHAR(50) DEFAULT 'PASS',
          print VARCHAR(50) DEFAULT NULL,
          print_at TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print VARCHAR(50) DEFAULT NULL;`);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print_at TIMESTAMP DEFAULT NULL;`);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS operator_name VARCHAR(100) DEFAULT NULL;`);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT NULL;`);

      // Dynamically resolve stage_id from stage_work_forms using work_id
      const effectiveWorkId = sanitizeDbText(work_id);
      if (!effectiveWorkId) {
        throw new Error('work_id is required to save meter record.');
      }

      const resolvedStageId = await this.resolveStageIdForWorkId(effectiveWorkId, stage_id, client);
      const cleanSerial = sanitizeDbText(meter_serial_no);
      const cleanDevice = sanitizeDbText(device_no);
      const cleanImei = sanitizeDbText(imei_no);
      const cleanNic = sanitizeDbText(nic_sr_no);
      const cleanOperator = sanitizeDbText(operator_id) || 'OPERATOR';
      const userMeta = await this.resolveUserMeta(cleanOperator, user_role, operator_name, client);
      const cleanOperatorName = sanitizeDbText(userMeta.operator_name);
      const cleanUserRole = userMeta.user_role || 'OPERATOR';
      const cleanRawDlms = sanitizeJsonValue(raw_dlms_data || {});

      // Validate that all 3 numbers are present before saving to DB
      const isMissingVal = (val) => !val || String(val).trim().length === 0 || String(val).trim() === '-' || String(val).trim().toLowerCase() === 'null' || String(val).trim().toLowerCase() === 'undefined' || /^0+$/.test(String(val).trim());
      const missingRequired = [];
      if (isMissingVal(cleanSerial)) missingRequired.push('Serial No');
      if (isMissingVal(cleanImei)) missingRequired.push('IMEI No');
      if (isMissingVal(cleanNic) || (cleanSerial && (cleanNic === `NIC-${cleanSerial}` || cleanNic === `NIC-ZG-${cleanSerial}`))) {
        missingRequired.push('NIC Sr.No');
      }

      if (missingRequired.length > 0) {
        const valErr = new Error(`Cannot save meter record to database. All 3 fields (Serial No, IMEI No, and NIC Sr.No) are required from the meter. Missing: ${missingRequired.join(', ')}.`);
        valErr.isValidationError = true;
        valErr.missingFields = missingRequired;
        valErr.statusCode = 400;
        throw valErr;
      }

      // 1. Validate Serial No, IMEI No, and NIC Sr. No against existing records
      const validation = await this.validateMeterNumbers({
        serial_no: cleanSerial,
        imei_no: cleanImei,
        nic_sr_no: cleanNic,
        dbClient: client,
        user_role: cleanUserRole
      });

      let saved = null;
      let isUpdate = false;

      if (validation.status === 'EXISTS') {
        const target = validation.targetRecord;
        const isPrinted = target.print === 'printed' || target.print === 'PRINTED';
        await client.query('COMMIT');
        try {
          const LaserSerialService = require('../laser/laserSerialService');
          LaserSerialService.setActiveMeter({
            serialNo: target.meter_serial_no || cleanSerial,
            imeiNo: target.imei_no || cleanImei,
            nicSrNo: target.nic_sr_no || cleanNic,
            recordId: target.id || null
          });
        } catch (_) { }
        return {
          action: 'EXISTING',
          isUpdated: false,
          isPrinted,
          record: target,
          id: target.id,
          stage_id: target.stage_id || resolvedStageId,
          user_role: target.user_role || cleanUserRole,
          message: isPrinted
            ? `Meter ${cleanSerial} has already been laser printed.`
            : `Meter ${cleanSerial} found in database. Print status is pending — Ready for Laser Print.`
        };
      }

      if (validation.status === 'UPDATE') {
        isUpdate = true;
        const targetId = validation.targetRecord.id;
        const oldSerial = validation.targetRecord.meter_serial_no;

        const updateRes = await client.query(
          `UPDATE stage09_meter_records 
           SET work_id = $1,
               stage_id = COALESCE($2, stage_id),
               meter_serial_no = $3,
               device_no = COALESCE($4, device_no),
               imei_no = $5,
               nic_sr_no = $6,
               raw_dlms_data = COALESCE($7, raw_dlms_data),
               operator_id = $8,
               operator_name = $9,
               user_role = $10,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $11
           RETURNING *`,
          [
            effectiveWorkId,
            resolvedStageId,
            cleanSerial,
            cleanDevice,
            cleanImei,
            cleanNic,
            JSON.stringify(cleanRawDlms),
            cleanOperator,
            cleanOperatorName,
            cleanUserRole,
            targetId
          ]
        );
        saved = updateRes.rows[0];

        // Also update meters table
        if (resolvedStageId) {
          await client.query(`SAVEPOINT sp_meters_upd`);
          try {
            await client.query(
              `UPDATE meters 
               SET meter_no = $1, serial_no = $1, batch_no = $2, current_stage = COALESCE($3, current_stage), updated_at = CURRENT_TIMESTAMP
               WHERE serial_no = $4 OR serial_no = $1`,
              [cleanSerial, effectiveWorkId, resolvedStageId, oldSerial]
            );
            await client.query(`RELEASE SAVEPOINT sp_meters_upd`);
          } catch (mErr) {
            await client.query(`ROLLBACK TO SAVEPOINT sp_meters_upd`);
            logger.warn('[DlmsOpticalService] Notice updating meters on update:', mErr.message);
          }
        }
      } else {
        // Assert target limit only when adding a NEW meter
        await this.assertWorkFormTargetNotReached({
          work_id: effectiveWorkId,
          stage_id: resolvedStageId,
          operator_id: cleanOperator,
          user_role: cleanUserRole,
          raw_role: userMeta.raw_role,
          dbClient: client,
          lockWorkForm: true
        });

        // 2. Insert into stage09_meter_records with print = NULL and print_at = NULL on initial meter read
        const insertRes = await client.query(
          `INSERT INTO stage09_meter_records 
            (work_id, stage_id, meter_serial_no, device_no, imei_no, nic_sr_no, raw_dlms_data, operator_id, operator_name, user_role, status, print, print_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PASS', NULL, NULL)
           RETURNING *`,
          [
            effectiveWorkId,
            resolvedStageId,
            cleanSerial,
            cleanDevice,
            cleanImei,
            cleanNic,
            JSON.stringify(cleanRawDlms),
            cleanOperator,
            cleanOperatorName,
            cleanUserRole
          ]
        );

        saved = insertRes.rows[0];

        // 3. Update meters table with dynamic stage_id
        if (resolvedStageId) {
          await client.query(`SAVEPOINT sp_meters`);
          try {
            await client.query(
              `INSERT INTO meters (meter_no, serial_no, batch_no, current_stage, status, updated_at)
               VALUES ($1, $1, $2, $3, 'IN_PRODUCTION', CURRENT_TIMESTAMP)
               ON CONFLICT (serial_no) 
               DO UPDATE SET current_stage = $3, updated_at = CURRENT_TIMESTAMP`,
              [cleanSerial, effectiveWorkId, resolvedStageId]
            );
            await client.query(`RELEASE SAVEPOINT sp_meters`);
          } catch (mErr) {
            await client.query(`ROLLBACK TO SAVEPOINT sp_meters`);
            logger.warn('[DlmsOpticalService] Notice updating meters:', mErr.message);
          }
        }
      }

      // 4. Insert audit log / stage result dynamically
      if (resolvedStageId) {
        await client.query(`SAVEPOINT sp_stage_results`);
        try {
          await client.query(
            `INSERT INTO stage_results 
              (test_session_id, meter_no, stage_id, stage_name, status, measurements, hardware_logs, operator_id, created_at)
             VALUES ($1, $2, $3, $4, 'PASS', $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              `SESS-STG${resolvedStageId}-${Date.now()}`,
              cleanSerial,
              resolvedStageId,
              `Stage ${String(resolvedStageId).padStart(2, '0')}: Meter Optical DLMS Read`,
              JSON.stringify({ serialNo: cleanSerial, deviceNo: cleanDevice, imei: cleanImei, nicSrNo: cleanNic, print: null, printAt: null, userRole: cleanUserRole }),
              JSON.stringify(cleanRawDlms),
              cleanOperator
            ]
          );
          await client.query(`RELEASE SAVEPOINT sp_stage_results`);
        } catch (e) {
          await client.query(`ROLLBACK TO SAVEPOINT sp_stage_results`);
          logger.warn('[DlmsOpticalService] Notice logging to stage_results:', e.message);
        }
      }

      // 5. Also persist to supervisor_tests or qc_tests when executed by Supervisor or QC (using SAVEPOINT so stage09_meter_records never rolls back!)
      const stgNum = resolvedStageId || 9;
      const stgName = `Stage ${String(stgNum).padStart(2, '0')}: Meter Box Body Print`;
      const payloadJson = JSON.stringify({
        record_id: saved.id,
        work_id: effectiveWorkId,
        meter_serial_no: cleanSerial,
        device_no: cleanDevice,
        imei_no: cleanImei,
        nic_sr_no: cleanNic,
        print: null,
        print_at: null,
        user_role: cleanUserRole
      });

      if (cleanUserRole === 'SUPERVISOR') {
        await client.query(`SAVEPOINT sp_supervisor_tests`);
        try {
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS test_data TEXT DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS test_details TEXT DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS user_name VARCHAR(100) DEFAULT NULL;`);
          try { await client.query(`ALTER TABLE supervisor_tests ALTER COLUMN user_id DROP NOT NULL;`); } catch (e) { }
          try { await client.query(`ALTER TABLE supervisor_tests ALTER COLUMN user_name DROP NOT NULL;`); } catch (e) { }

          await client.query(
            `INSERT INTO supervisor_tests 
              (stage_id, stage_name, supervisor_id, supervisor_name, user_id, user_name, meter_no, serial_no, batch_no, status, remarks, test_data, test_details, created_at)
             VALUES ($1, $2, $3, $4, $3, $4, $5, $5, $6, 'PASS', $7, $8, $8, CURRENT_TIMESTAMP)`,
            [
              stgNum,
              stgName,
              cleanOperator,
              cleanOperatorName || cleanOperator,
              cleanSerial,
              effectiveWorkId,
              `Work ID: ${effectiveWorkId} | Meter S/N: ${cleanSerial} | IMEI: ${cleanImei || '-'} | NIC: ${cleanNic || '-'}`,
              payloadJson
            ]
          );
          await client.query(`RELEASE SAVEPOINT sp_supervisor_tests`);
        } catch (supErr) {
          await client.query(`ROLLBACK TO SAVEPOINT sp_supervisor_tests`);
          logger.warn('[DlmsOpticalService] Notice saving to supervisor_tests:', supErr.message);
        }
      } else if (cleanUserRole === 'QC') {
        await client.query(`SAVEPOINT sp_qc_tests`);
        try {
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS inspection_data TEXT DEFAULT NULL;`);
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS test_details TEXT DEFAULT NULL;`);

          await client.query(
            `INSERT INTO qc_tests 
              (stage_id, stage_name, qc_id, qc_name, meter_no, serial_no, batch_no, status, remarks, inspection_data, test_details, created_at)
             VALUES ($1, $2, $3, $4, $5, $5, $6, 'PASS', $7, $8, $8, CURRENT_TIMESTAMP)`,
            [
              stgNum,
              stgName,
              cleanOperator,
              cleanOperatorName || cleanOperator,
              cleanSerial,
              effectiveWorkId,
              `Work ID: ${effectiveWorkId} | Meter S/N: ${cleanSerial} | IMEI: ${cleanImei || '-'} | NIC: ${cleanNic || '-'}`,
              payloadJson
            ]
          );
          await client.query(`RELEASE SAVEPOINT sp_qc_tests`);
        } catch (qcErr) {
          await client.query(`ROLLBACK TO SAVEPOINT sp_qc_tests`);
          logger.warn('[DlmsOpticalService] Notice saving to qc_tests:', qcErr.message);
        }
      }

      if (cleanUserRole === 'OPERATOR' && !String(userMeta.raw_role || user_role || '').toUpperCase().includes('ADMIN')) {
        await client.query(`SAVEPOINT sp_sync_work_form`);
        try {
          await this.syncWorkFormCompletedQuantity(client, effectiveWorkId);
          await client.query(`RELEASE SAVEPOINT sp_sync_work_form`);
        } catch (syncErr) {
          await client.query(`ROLLBACK TO SAVEPOINT sp_sync_work_form`);
          logger.warn('[DlmsOpticalService] Notice syncing work form quantity:', syncErr.message);
        }
      }

      await client.query('COMMIT');
      try {
        const LaserSerialService = require('../laser/laserSerialService');
        LaserSerialService.setActiveMeter({
          serialNo: saved.meter_serial_no || cleanSerial,
          imeiNo: saved.imei_no || cleanImei,
          nicSrNo: saved.nic_sr_no || cleanNic,
          recordId: saved.id || null
        });
      } catch (_) { }
      return {
        ...saved,
        action: isUpdate ? 'UPDATED' : 'CREATED',
        isUpdated: isUpdate,
        message: isUpdate
          ? 'Meter details updated successfully with new value.'
          : 'Meter details saved successfully as a new record.',
        record: saved
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update existing meter record by ID with full duplicate validation
   */
  static async updateMeterRecordInDb(recordId, {
    meter_serial_no,
    imei_no,
    nic_sr_no,
    device_no,
    operator_id = 'OPERATOR',
    operator_name = null,
    user_role = null,
    work_id = null,
    stage_id = null
  }) {
    const pool = getPool();
    if (!pool) throw new Error('Database pool not connected.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM stage09_meter_records WHERE id = $1 FOR UPDATE', [recordId]);
      if (existing.rows.length === 0) {
        throw new Error(`Meter record with ID #${recordId} not found.`);
      }
      const current = existing.rows[0];

      const cleanSerial = sanitizeDbText(meter_serial_no) || current.meter_serial_no;
      const cleanImei = sanitizeDbText(imei_no) !== null ? sanitizeDbText(imei_no) : current.imei_no;
      const cleanNic = sanitizeDbText(nic_sr_no) !== null ? sanitizeDbText(nic_sr_no) : current.nic_sr_no;
      const cleanDevice = sanitizeDbText(device_no) !== null ? sanitizeDbText(device_no) : current.device_no;
      const effectiveWorkId = sanitizeDbText(work_id) || current.work_id;
      const resolvedStageId = stage_id || current.stage_id;

      // Validate against all other records in DB
      await this.validateMeterNumbers({
        serial_no: cleanSerial,
        imei_no: cleanImei,
        nic_sr_no: cleanNic,
        excludeRecordId: recordId,
        dbClient: client
      });

      const updateRes = await client.query(
        `UPDATE stage09_meter_records
         SET work_id = $1,
             stage_id = $2,
             meter_serial_no = $3,
             device_no = $4,
             imei_no = $5,
             nic_sr_no = $6,
             operator_id = COALESCE($7, operator_id),
             operator_name = COALESCE($8, operator_name),
             user_role = COALESCE($9, user_role),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
         RETURNING *`,
        [
          effectiveWorkId,
          resolvedStageId,
          cleanSerial,
          cleanDevice,
          cleanImei,
          cleanNic,
          sanitizeDbText(operator_id),
          sanitizeDbText(operator_name),
          user_role,
          recordId
        ]
      );

      const updated = updateRes.rows[0];

      // Update meters table
      try {
        await client.query(
          `UPDATE meters
           SET meter_no = $1, serial_no = $1, batch_no = $2, current_stage = $3, updated_at = CURRENT_TIMESTAMP
           WHERE serial_no = $4 OR serial_no = $1`,
          [cleanSerial, effectiveWorkId, resolvedStageId, current.meter_serial_no]
        );
      } catch (mErr) {
        logger.warn('[DlmsOpticalService] Notice updating meters on updateMeterRecordInDb:', mErr.message);
      }

      await client.query('COMMIT');
      try {
        const LaserSerialService = require('../laser/laserSerialService');
        LaserSerialService.setActiveMeter({
          serialNo: updated.meter_serial_no || cleanSerial,
          imeiNo: updated.imei_no || cleanImei,
          nicSrNo: updated.nic_sr_no || cleanNic,
          recordId: updated.id || recordId
        });
      } catch (_) { }
      return {
        ...updated,
        action: 'UPDATED',
        isUpdated: true,
        message: 'Meter details updated successfully with new value.',
        record: updated
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Execute Laser Print via USB / Hardware ACK and update stage09_meter_records:
   * Sets print = 'printed' and print_at = CURRENT_TIMESTAMP once USB ACK is received.
   */
  static async executeLaserPrintWithUsbAck({
    id,
    work_id,
    stage_id = null,
    meter_serial_no,
    imei_no,
    nic_sr_no,
    port,
    laser_source = 'server',
    client_webserial = false,
    alreadyTransmitted = false,
    operator_id = 'OPERATOR',
    operator_name = null,
    user_role = null
  }) {
    const logs = [];
    const addLog = (msg, status = 'INFO') => {
      logs.push({
        id: Date.now() + Math.random(),
        time: formatTimestamp(),
        msg,
        status
      });
    };

    const effectiveWorkId = sanitizeDbText(work_id);
    if (!effectiveWorkId) {
      throw new Error('work_id is required to execute laser print.');
    }

    const cleanSerial = sanitizeDbText(meter_serial_no);
    const cleanImei = sanitizeDbText(imei_no);
    const cleanNic = sanitizeDbText(nic_sr_no);

    const missingFields = [];
    const isEmpty = (v) => !v || v === '-' || v.toLowerCase() === 'null';
    if (isEmpty(cleanSerial)) missingFields.push('Serial No');
    if (isEmpty(cleanImei)) missingFields.push('IMEI No');
    if (isEmpty(cleanNic)) missingFields.push('NIC Sr. No');

    if (missingFields.length > 0) {
      throw new Error(`Cannot execute Laser Print: ${missingFields.join(', ')} is missing. Please re-update meter details before printing.`);
    }

    const pool = getPool();
    const isOperator = String(user_role || '').trim().toUpperCase() === 'OPERATOR';
    if (pool && cleanSerial && isOperator) {
      const checkRes = await pool.query(
        `SELECT id, meter_serial_no, print, print_at FROM stage09_meter_records
         WHERE (id = $1 OR LOWER(meter_serial_no) = LOWER($2) OR ($3::text IS NOT NULL AND LOWER(imei_no) = LOWER($3)) OR ($4::text IS NOT NULL AND LOWER(nic_sr_no) = LOWER($4)))
           AND (print = 'printed' OR print = 'PRINTED')
         LIMIT 1`,
        [id || 0, cleanSerial, cleanImei || '', cleanNic || '']
      );
      if (checkRes.rows.length > 0) {
        const alreadyPrinted = checkRes.rows[0];
        const timeStr = alreadyPrinted.print_at ? new Date(alreadyPrinted.print_at).toLocaleString() : 'record';
        throw new Error(`Duplicate meter: Record (${cleanSerial}) is already registered and was laser printed on ${timeStr}. Duplicate printing is prohibited.`);
      }
    }

    addLog(`Initiating Laser Print command for Meter S/N: ${cleanSerial || 'LATEST'} (Work ID: ${effectiveWorkId})...`, 'INFO');

    // 1. Communicate with Laser Machine Serial Port (F3: Meter Serial, F2: NIC Serial, F1: IMEI)
    if (client_webserial || laser_source === 'client_webserial' || alreadyTransmitted) {
      addLog(`[LASER HANDSHAKE] Serial handshake confirmed (F1: IMEI, F2: NIC, F3: Serial sent to Laser Machine).`, 'SUCCESS');
    } else {
      const LaserSerialService = require('../laser/laserSerialService');
      const laserResult = await LaserSerialService.executeLaserPrint({
        meter_serial_no: cleanSerial,
        imei_no: cleanImei,
        nic_sr_no: cleanNic,
        port: port || null,
        timeoutMs: 30000
      });

      if (Array.isArray(laserResult.logs) && laserResult.logs.length > 0) {
        logs.push(...laserResult.logs);
      }
    }

    // 2. Update PostgreSQL stage09_meter_records: print = 'printed', print_at = CURRENT_TIMESTAMP
    if (!pool) {
      throw new Error('Database pool not connected.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print VARCHAR(50) DEFAULT NULL;`);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print_at TIMESTAMP DEFAULT NULL;`);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS operator_name VARCHAR(100) DEFAULT NULL;`);
      await client.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT NULL;`);

      const resolvedStageId = await this.resolveStageIdForWorkId(effectiveWorkId, stage_id, client);
      const cleanOperator = sanitizeDbText(operator_id) || 'OPERATOR';
      const userMeta = await this.resolveUserMeta(cleanOperator, user_role, operator_name, client);
      const cleanOperatorName = sanitizeDbText(userMeta.operator_name);
      const cleanUserRole = userMeta.user_role || 'OPERATOR';
      let targetRecord = null;

      if (id) {
        const resById = await client.query(
          `UPDATE stage09_meter_records
           SET print = 'printed', print_at = CURRENT_TIMESTAMP, stage_id = COALESCE(stage_id, $2),
               operator_name = COALESCE(operator_name, $3), user_role = COALESCE(user_role, $4), updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id, resolvedStageId, cleanOperatorName, cleanUserRole]
        );
        targetRecord = resById.rows[0] || null;
      }

      if (!targetRecord && meter_serial_no) {
        const resBySerial = await client.query(
          `UPDATE stage09_meter_records
           SET print = 'printed', print_at = CURRENT_TIMESTAMP, stage_id = COALESCE(stage_id, $3),
               operator_name = COALESCE(operator_name, $4), user_role = COALESCE(user_role, $5), updated_at = CURRENT_TIMESTAMP
           WHERE id = (
             SELECT id FROM stage09_meter_records
             WHERE work_id = $1 AND meter_serial_no = $2
             ORDER BY (print IS NULL) DESC, id DESC
             LIMIT 1
           )
           RETURNING *`,
          [effectiveWorkId, sanitizeDbText(meter_serial_no), resolvedStageId, cleanOperatorName, cleanUserRole]
        );
        targetRecord = resBySerial.rows[0] || null;
      }

      if (!targetRecord) {
        const resLatest = await client.query(
          `UPDATE stage09_meter_records
           SET print = 'printed', print_at = CURRENT_TIMESTAMP, stage_id = COALESCE(stage_id, $2),
               operator_name = COALESCE(operator_name, $3), user_role = COALESCE(user_role, $4), updated_at = CURRENT_TIMESTAMP
           WHERE id = (
             SELECT id FROM stage09_meter_records
             WHERE work_id = $1
             ORDER BY (print IS NULL) DESC, id DESC
             LIMIT 1
           )
           RETURNING *`,
          [effectiveWorkId, resolvedStageId, cleanOperatorName, cleanUserRole]
        );
        targetRecord = resLatest.rows[0] || null;
      }

      if (!targetRecord) {
        throw new Error(`No meter record found under Work ID '${effectiveWorkId}' to mark as printed. Please read a meter first.`);
      }

      // Sync print status to supervisor_tests or qc_tests if this record belongs to Supervisor or QC
      const effectiveRole = this.normalizeRoleType(targetRecord.user_role || cleanUserRole);
      const effectiveStageId = targetRecord.stage_id || resolvedStageId || 9;
      const stgName = `Stage ${String(effectiveStageId).padStart(2, '0')}: Meter Box Body Print`;
      const updatedPayloadJson = JSON.stringify({
        record_id: targetRecord.id,
        work_id: effectiveWorkId,
        meter_serial_no: targetRecord.meter_serial_no,
        device_no: targetRecord.device_no,
        imei_no: targetRecord.imei_no,
        nic_sr_no: targetRecord.nic_sr_no,
        print: targetRecord.print,
        print_at: targetRecord.print_at,
        user_role: effectiveRole
      });

      if (effectiveRole === 'SUPERVISOR') {
        await client.query(`SAVEPOINT sp_print_sup`);
        try {
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS test_data TEXT DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS test_details TEXT DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) DEFAULT NULL;`);
          await client.query(`ALTER TABLE supervisor_tests ADD COLUMN IF NOT EXISTS user_name VARCHAR(100) DEFAULT NULL;`);
          try { await client.query(`ALTER TABLE supervisor_tests ALTER COLUMN user_id DROP NOT NULL;`); } catch (e) { }
          try { await client.query(`ALTER TABLE supervisor_tests ALTER COLUMN user_name DROP NOT NULL;`); } catch (e) { }

          const updSup = await client.query(
            `UPDATE supervisor_tests
             SET test_data = $1, test_details = $1, remarks = $2
             WHERE COALESCE(test_data, test_details, '') LIKE $3
             RETURNING *`,
            [
              updatedPayloadJson,
              `Work ID: ${effectiveWorkId} | Meter S/N: ${targetRecord.meter_serial_no} | Printed at ${new Date(targetRecord.print_at).toLocaleString()}`,
              `%"record_id":${targetRecord.id}%`
            ]
          );
          if (updSup.rowCount === 0) {
            await client.query(
              `INSERT INTO supervisor_tests 
                (stage_id, stage_name, supervisor_id, supervisor_name, user_id, user_name, meter_no, serial_no, batch_no, status, remarks, test_data, test_details, created_at)
               VALUES ($1, $2, $3, $4, $3, $4, $5, $5, $6, 'PASS', $7, $8, $8, CURRENT_TIMESTAMP)`,
              [
                effectiveStageId,
                stgName,
                cleanOperator,
                cleanOperatorName || cleanOperator,
                targetRecord.meter_serial_no,
                effectiveWorkId,
                `Work ID: ${effectiveWorkId} | Meter S/N: ${targetRecord.meter_serial_no} | Printed at ${new Date(targetRecord.print_at).toLocaleString()}`,
                updatedPayloadJson
              ]
            );
          }
          await client.query(`RELEASE SAVEPOINT sp_print_sup`);
        } catch (supErr) {
          await client.query(`ROLLBACK TO SAVEPOINT sp_print_sup`);
          logger.warn('[DlmsOpticalService] Notice updating supervisor_tests on print:', supErr.message);
        }
      } else if (effectiveRole === 'QC') {
        await client.query(`SAVEPOINT sp_print_qc`);
        try {
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS serial_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT NULL;`);
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS inspection_data TEXT DEFAULT NULL;`);
          await client.query(`ALTER TABLE qc_tests ADD COLUMN IF NOT EXISTS test_details TEXT DEFAULT NULL;`);

          const updQc = await client.query(
            `UPDATE qc_tests
             SET inspection_data = $1, test_details = $1, remarks = $2
             WHERE COALESCE(inspection_data, test_details, '') LIKE $3
             RETURNING *`,
            [
              updatedPayloadJson,
              `Work ID: ${effectiveWorkId} | Meter S/N: ${targetRecord.meter_serial_no} | Printed at ${new Date(targetRecord.print_at).toLocaleString()}`,
              `%"record_id":${targetRecord.id}%`
            ]
          );
          if (updQc.rowCount === 0) {
            await client.query(
              `INSERT INTO qc_tests 
                (stage_id, stage_name, qc_id, qc_name, meter_no, serial_no, batch_no, status, remarks, inspection_data, test_details, created_at)
               VALUES ($1, $2, $3, $4, $5, $5, $6, 'PASS', $7, $8, $8, CURRENT_TIMESTAMP)`,
              [
                effectiveStageId,
                stgName,
                cleanOperator,
                cleanOperatorName || cleanOperator,
                targetRecord.meter_serial_no,
                effectiveWorkId,
                `Work ID: ${effectiveWorkId} | Meter S/N: ${targetRecord.meter_serial_no} | Printed at ${new Date(targetRecord.print_at).toLocaleString()}`,
                updatedPayloadJson
              ]
            );
          }
          await client.query(`RELEASE SAVEPOINT sp_print_qc`);
        } catch (qcErr) {
          await client.query(`ROLLBACK TO SAVEPOINT sp_print_qc`);
          logger.warn('[DlmsOpticalService] Notice updating qc_tests on print:', qcErr.message);
        }
      }

      // 3. Sync completed_quantity in stage_work_forms with count of OPERATOR records
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM stage09_meter_records r
         LEFT JOIN users u ON (r.operator_id = u.employee_id OR r.operator_id = u.user_name OR r.operator_id = u.name)
         WHERE r.work_id = $1 AND r.print = 'printed'
           AND UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%SUPERVISOR%'
           AND UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%QC%'`,
        [effectiveWorkId]
      );
      const printedCount = countRes.rows[0]?.cnt || 0;

      if (effectiveRole === 'OPERATOR' && !String(userMeta.raw_role || user_role || '').toUpperCase().includes('ADMIN')) {
        await this.syncWorkFormCompletedQuantity(client, effectiveWorkId);
      }

      // 4. Log laser print completion in stage_results dynamically
      try {
        if (effectiveStageId) {
          await client.query(
            `INSERT INTO stage_results
              (test_session_id, meter_no, stage_id, stage_name, status, measurements, hardware_logs, operator_id, created_at)
             VALUES ($1, $2, $3, $4, 'PASS', $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              `SESS-STG${effectiveStageId}-PRINT-${Date.now()}`,
              targetRecord.meter_serial_no,
              effectiveStageId,
              `Stage ${String(effectiveStageId).padStart(2, '0')}: Meter Box Body Laser Print`,
              JSON.stringify({
                id: targetRecord.id,
                serialNo: targetRecord.meter_serial_no,
                imei: targetRecord.imei_no,
                nicSrNo: targetRecord.nic_sr_no,
                print: targetRecord.print,
                printAt: targetRecord.print_at
              }),
              JSON.stringify(sanitizeJsonValue(logs)),
              sanitizeDbText(operator_id) || 'OPERATOR'
            ]
          );
        }
      } catch (e) {
        logger.warn('[DlmsOpticalService] Notice logging print to stage_results:', e.message);
      }

      await client.query('COMMIT');

      const progress = await this.getWorkFormOperatorProgress(
        effectiveWorkId,
        targetRecord.operator_id || operator_id,
        null,
        false,
        effectiveStageId
      );
      const operatorCompletedCount = effectiveRole === 'OPERATOR'
        ? progress.operatorCompletedCount
        : await this.getStage09RecordCount(effectiveWorkId, {
          operator_id: targetRecord.operator_id || operator_id,
          role_type: effectiveRole
        });

      addLog(
        `[DB UPDATE] Record #${targetRecord.id} (${targetRecord.meter_serial_no}) updated -> print: "printed", printAt: "${new Date(targetRecord.print_at).toLocaleString()}"`,
        'SUCCESS'
      );

      return {
        success: true,
        ack: 'USB_ACK_OK',
        record: {
          ...targetRecord,
          printAt: targetRecord.print_at
        },
        printedCount,
        operator_completed_count: operatorCompletedCount,
        batch_completed_count: progress.batchCompletedCount,
        target_quantity: progress.targetQuantity,
        logs
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch target_quantity, total non-admin OPERATOR batch tests (for that stage & work_id), and per-operator test count
   */
  static async getWorkFormOperatorProgress(work_id, operator_id = null, dbClient = null, lockWorkForm = false, stage_id = null) {
    const runner = dbClient || getPool();
    if (!runner || !work_id) {
      return { targetQuantity: 500, batchCompletedCount: 0, operatorCompletedCount: 0 };
    }

    const wfSql = lockWorkForm
      ? `SELECT form_id, stage_number, target_quantity FROM stage_work_forms WHERE form_id = $1 LIMIT 1 FOR UPDATE`
      : `SELECT form_id, stage_number, target_quantity FROM stage_work_forms WHERE form_id = $1 LIMIT 1`;
    const wfRes = await runner.query(wfSql, [work_id]);
    const wfRow = wfRes.rows[0] || null;
    const targetQuantity = Number(wfRow?.target_quantity) || 500;
    const parsedStageId = parseInt(stage_id, 10) || parseInt(wfRow?.stage_number, 10) || null;

    const params = [work_id];
    const stageFilterSql = parsedStageId
      ? `AND COALESCE(r.stage_id, wf.stage_number, 9) = $${params.push(parsedStageId)}`
      : '';

    const batchRes = await runner.query(
      `SELECT COUNT(*)::int AS cnt FROM stage09_meter_records r
       LEFT JOIN stage_work_forms wf ON r.work_id = wf.form_id
       LEFT JOIN users u ON (r.operator_id = u.employee_id OR r.operator_id = u.user_name OR r.operator_id = u.name)
       WHERE r.work_id = $1
         ${stageFilterSql}
         AND LOWER(COALESCE(r.print, '')) = 'printed'
         AND UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%SUPERVISOR%'
         AND UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%QC%'
         AND UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%QUALITY%'
         AND UPPER(COALESCE(u.role, r.user_role, 'OPERATOR')) NOT LIKE '%ADMIN%'`,
      params
    );
    const batchCompletedCount = batchRes.rows[0]?.cnt || 0;

    const opFilters = { operator_id, role_type: 'OPERATOR', printed_only: true };
    if (parsedStageId) opFilters.stage_id = parsedStageId;
    const operatorCompletedCount = operator_id
      ? await this.getStage09RecordCount(work_id, opFilters, runner)
      : 0;

    return { targetQuantity, batchCompletedCount, operatorCompletedCount };
  }

  /**
   * Enforce target_quantity limit so test #501+ cannot execute once target meters succeed
   */
  static async assertWorkFormTargetNotReached({
    work_id,
    stage_id = null,
    operator_id = null,
    user_role = null,
    raw_role = null,
    dbClient = null,
    lockWorkForm = false
  }) {
    if (!work_id || work_id === 'UNASSIGNED') return null;

    const runner = dbClient || getPool();
    if (!runner) return null;

    const userMeta = await this.resolveUserMeta(operator_id, user_role, null, runner);
    const effectiveRole = userMeta.user_role;
    const isAdminRole = String(raw_role || userMeta.raw_role || user_role || '').toUpperCase().includes('ADMIN');

    const progress = await this.getWorkFormOperatorProgress(work_id, operator_id, runner, lockWorkForm, stage_id);

    if (effectiveRole === 'OPERATOR' && !isAdminRole && progress.batchCompletedCount >= progress.targetQuantity) {
      const msg = `Batch Target Reached (${progress.batchCompletedCount} / ${progress.targetQuantity} Meters completed for Work ID '${work_id}'). Cannot test meter #${progress.batchCompletedCount + 1}.`;
      const err = new Error(msg);
      err.isTargetLimitError = true;
      err.statusCode = 400;
      throw err;
    }

    return progress;
  }

  /**
   * Sync overall stage_work_forms.completed_quantity from OPERATOR Stage 9 records
   */
  static async syncWorkFormCompletedQuantity(dbClient, workId) {
    if (!dbClient || !workId) return 0;
    const { batchCompletedCount } = await this.getWorkFormOperatorProgress(workId, null, dbClient, false);
    await dbClient.query(
      `UPDATE stage_work_forms
       SET completed_quantity = $2, updated_at = CURRENT_TIMESTAMP
       WHERE form_id = $1`,
      [workId, batchCompletedCount]
    );
    return batchCompletedCount;
  }

  /**
   * Build shared SQL WHERE clause and bound params for Stage 9 records queries
   */
  static buildStage09RecordsWhereClause(work_id = null, filters = {}) {
    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (work_id) {
      whereClauses.push(`r.work_id = $${pIdx++}`);
      params.push(work_id);
    }

    if (filters.stage_id) {
      const stgNum = parseInt(filters.stage_id, 10);
      if (!isNaN(stgNum)) {
        whereClauses.push(`COALESCE(r.stage_id, wf.stage_number, 9) = $${pIdx++}`);
        params.push(stgNum);
      }
    }

    if (filters.status) {
      whereClauses.push(`UPPER(COALESCE(r.status, 'PASS')) = UPPER($${pIdx++})`);
      params.push(String(filters.status));
    }

    if (filters.operator_id) {
      const op = String(filters.operator_id).trim();
      whereClauses.push(`(
        LOWER(COALESCE(r.operator_id, '')) = LOWER($${pIdx}) OR
        LOWER(COALESCE(u.employee_id, '')) = LOWER($${pIdx}) OR
        LOWER(COALESCE(u.user_name, '')) = LOWER($${pIdx}) OR
        LOWER(COALESCE(u.name, '')) = LOWER($${pIdx})
      )`);
      params.push(op);
      pIdx++;
    }

    if (filters.role_type) {
      const roleFilter = String(filters.role_type).toUpperCase();
      if (roleFilter === 'OPERATOR') {
        whereClauses.push(`(
          UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%SUPERVISOR%' AND
          UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%QC%' AND
          UPPER(COALESCE(r.user_role, u.role, 'OPERATOR')) NOT LIKE '%QUALITY%'
        )`);
      } else if (roleFilter === 'SUPERVISOR') {
        whereClauses.push(`UPPER(COALESCE(r.user_role, u.role, '')) LIKE '%SUPERVISOR%'`);
      } else if (roleFilter === 'QC') {
        whereClauses.push(`(
          UPPER(COALESCE(r.user_role, u.role, '')) LIKE '%QC%' OR
          UPPER(COALESCE(r.user_role, u.role, '')) LIKE '%QUALITY%'
        )`);
      }
    }

    if (filters.printed_only || filters.printed === true) {
      whereClauses.push(`LOWER(COALESCE(r.print, '')) = 'printed'`);
    } else if (filters.print) {
      whereClauses.push(`LOWER(COALESCE(r.print, '')) = LOWER($${pIdx++})`);
      params.push(String(filters.print));
    }

    if (filters.search) {
      const term = `%${String(filters.search).toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(COALESCE(r.work_id, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(r.meter_serial_no, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(r.imei_no, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(r.nic_sr_no, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(r.operator_id, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(r.operator_name, u.name, '')) LIKE $${pIdx}
      )`);
      params.push(term);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    return { whereSql, params };
  }

  /**
   * Count total Stage 9 meter records matching filters (not capped by display limit)
   */
  static async getStage09RecordCount(work_id = null, filters = {}, dbClient = null) {
    const runner = dbClient || getPool();
    if (!runner) return 0;

    try {
      const { whereSql, params } = this.buildStage09RecordsWhereClause(work_id, filters);
      const res = await runner.query(
        `SELECT COUNT(*)::int AS total_count
         FROM stage09_meter_records r
         LEFT JOIN stage_work_forms wf ON r.work_id = wf.form_id
         LEFT JOIN users u ON (r.operator_id = u.employee_id OR r.operator_id = u.user_name OR r.operator_id = u.name)
         ${whereSql}`,
        params
      );
      return res.rows[0]?.total_count || 0;
    } catch (err) {
      logger.error('[DlmsOpticalService] Error counting records:', err);
      return 0;
    }
  }

  /**
   * Normalize a queried Stage 09 row for API consumers without duplicating the Stage prefix.
   */
  static formatStage09RecordRow(row) {
    const stgNum = row.stage_id || row.form_stage_number || 9;
    const rawStgName = row.db_stage_name || row.form_stage_name || 'Meter Box Body Print';
    const cleanStgName = String(rawStgName).replace(/^(?:Stage\s*\d+\s*:\s*)+/i, '').trim() || 'Meter Box Body Print';
    const opName = row.resolved_operator_name || row.operator_name || null;
    const roleNorm = this.normalizeRoleType(row.resolved_user_role || row.user_role);
    return {
      ...row,
      operator_name: opName,
      user_role: roleNorm,
      operator_role: row.resolved_user_role || roleNorm,
      stage_id: stgNum,
      stage_name: `Stage ${String(stgNum).padStart(2, '0')}: ${cleanStgName}`,
      operator_display: opName ? `${opName} (${row.operator_id})` : row.operator_id,
      printAt: row.print_at
    };
  }

  /**
   * Get all meter records saved for a specific stage 9 work order, or all stage 9 records if work_id is omitted
   */
  static async getStage09Records(work_id = null, filters = {}) {
    const pool = getPool();
    if (!pool) return [];

    try {
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print VARCHAR(50) DEFAULT NULL;`);
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print_at TIMESTAMP DEFAULT NULL;`);
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS operator_name VARCHAR(100) DEFAULT NULL;`);
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT NULL;`);

      // Backfill user_role and operator_name from users table for any records missing them
      try {
        await pool.query(`
          UPDATE stage09_meter_records r
          SET user_role = CASE
                WHEN UPPER(u.role) LIKE '%SUPERVISOR%' THEN 'SUPERVISOR'
                WHEN UPPER(u.role) LIKE '%QC%' OR UPPER(u.role) LIKE '%QUALITY%' THEN 'QC'
                ELSE 'OPERATOR'
              END,
              operator_name = COALESCE(r.operator_name, u.name)
          FROM users u
          WHERE (r.operator_id = u.employee_id OR r.operator_id = u.user_name OR r.operator_id = u.name)
            AND (r.user_role IS NULL OR r.operator_name IS NULL)
        `);
      } catch (e) { }

      if (work_id) {
        // Clean up any previously generated fallback NIC-<meter_serial_no> values where NIC wasn't actually read
        await pool.query(
          `UPDATE stage09_meter_records 
           SET nic_sr_no = NULL 
           WHERE work_id = $1 AND nic_sr_no = ('NIC-' || meter_serial_no)`,
          [work_id]
        );
        await pool.query(
          `UPDATE stage09_meter_records 
           SET imei_no = NULL 
           WHERE work_id = $1 AND imei_no = ''`,
          [work_id]
        );
      } else {
        await pool.query(
          `UPDATE stage09_meter_records 
           SET nic_sr_no = NULL 
           WHERE nic_sr_no = ('NIC-' || meter_serial_no)`
        );
        await pool.query(
          `UPDATE stage09_meter_records 
           SET imei_no = NULL 
           WHERE imei_no = ''`
        );
      }

      const { whereSql, params } = this.buildStage09RecordsWhereClause(work_id, filters);

      const res = await pool.query(
        `SELECT r.*, 
                wf.batch_no, 
                wf.month_year, 
                wf.form_title, 
                wf.target_quantity, 
                wf.completed_quantity,
                wf.created_by as work_created_by,
                wf.updated_by as work_updated_by,
                wf.created_at as work_created_at,
                wf.updated_at as work_updated_at,
                wf.stage_number as form_stage_number,
                wf.stage_name as form_stage_name,
                ps.stage_name as db_stage_name,
                COALESCE(r.operator_name, u.name) as resolved_operator_name,
                COALESCE(r.user_role, u.role, 'OPERATOR') as resolved_user_role
         FROM stage09_meter_records r
         LEFT JOIN stage_work_forms wf ON r.work_id = wf.form_id
         LEFT JOIN production_stages ps ON COALESCE(r.stage_id, wf.stage_number, 9) = ps.stage_number
         LEFT JOIN users u ON (r.operator_id = u.employee_id OR r.operator_id = u.user_name OR r.operator_id = u.name)
         ${whereSql}
         ORDER BY r.id DESC LIMIT 500`,
        params
      );
      return res.rows.map(row => this.formatStage09RecordRow(row));
    } catch (err) {
      logger.error('[DlmsOpticalService] Error getting records:', err);
      return [];
    }
  }

  /**
   * Get a single Stage 09 meter record by ID (with work order and stage metadata)
   */
  static async getStage09RecordById(recordId) {
    const pool = getPool();
    if (!pool) return null;

    try {
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print VARCHAR(50) DEFAULT NULL;`);
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS print_at TIMESTAMP DEFAULT NULL;`);
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS operator_name VARCHAR(100) DEFAULT NULL;`);
      await pool.query(`ALTER TABLE stage09_meter_records ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT NULL;`);

      const res = await pool.query(
        `SELECT r.*, 
                wf.batch_no, 
                wf.month_year, 
                wf.form_title, 
                wf.target_quantity, 
                wf.completed_quantity,
                wf.description as work_description,
                wf.created_by as work_created_by,
                wf.updated_by as work_updated_by,
                wf.created_at as work_created_at,
                wf.updated_at as work_updated_at,
                wf.stage_number as form_stage_number,
                wf.stage_name as form_stage_name,
                ps.stage_name as db_stage_name,
                ps.line_type,
                ps.hardware_station,
                COALESCE(r.operator_name, u.name) as resolved_operator_name,
                COALESCE(r.user_role, u.role, 'OPERATOR') as resolved_user_role
         FROM stage09_meter_records r
         LEFT JOIN stage_work_forms wf ON r.work_id = wf.form_id
         LEFT JOIN production_stages ps ON COALESCE(r.stage_id, wf.stage_number, 9) = ps.stage_number
         LEFT JOIN users u ON (r.operator_id = u.employee_id OR r.operator_id = u.user_name OR r.operator_id = u.name)
         WHERE r.id = $1
         LIMIT 1`,
        [recordId]
      );

      if (res.rows.length === 0) return null;
      return this.formatStage09RecordRow(res.rows[0]);
    } catch (err) {
      logger.error('[DlmsOpticalService] Error getting record by ID:', err);
      return null;
    }
  }
}

module.exports = DlmsOpticalService;
