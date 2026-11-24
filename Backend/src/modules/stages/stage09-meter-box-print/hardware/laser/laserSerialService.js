const logger = require('../../../../../config/logger.config');

let SerialPort;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) {
  SerialPort = null;
}

class LaserSerialService {
  constructor() {
    this.activePort = null;
    this.activePortPath = null;
    this.baudRate = 9600;
    this.rxBuffer = '';
    this.activePrintSession = null;
    this.activeMeterData = null;
    this.isLaserActive = false;
    this.ownerDeviceId = null;
    this.ownerTunnelId = null;
    this.ownerIp = null;
  }

  /**
   * List all system COM ports (without filtering out standard RS-232/motherboard ports)
   */
  async listPorts() {
    if (!SerialPort) {
      return [];
    }
    try {
      const ports = await SerialPort.list();
      return ports.map(p => ({
        path: (p.path || '').trim(),
        friendlyName: (p.friendlyName || p.path || '').trim(),
        manufacturer: p.manufacturer || 'Serial Port',
        vendorId: p.vendorId || null,
        productId: p.productId || null,
        pnpId: p.pnpId || null
      }));
    } catch (err) {
      logger.warn('[LaserSerialService] Error listing serial ports:', err.message);
      return [];
    }
  }

  /**
   * Get current Laser Serial COM connection status
   */
  async getStatus(query = {}) {
    const availablePorts = await this.listPorts();
    const isActuallyOpen = Boolean(this.activePort && this.activePort.isOpen);

    const isPhysicallyPresent = this.activePortPath
      ? availablePorts.some(p => p.path.toLowerCase() === this.activePortPath.toLowerCase())
      : false;

    if ((!isActuallyOpen || !isPhysicallyPresent) && this.activePortPath) {
      try {
        if (this.activePort && this.activePort.isOpen) {
          this.activePort.close(() => {});
        }
      } catch (_) {}
      this.activePort = null;
      this.activePortPath = null;
      this.ownerDeviceId = null;
      this.ownerTunnelId = null;
      this.ownerIp = null;
    }

    const isConnected = Boolean(this.activePort && this.activePort.isOpen && isPhysicallyPresent);

    const clientDeviceId = query?.deviceId || null;
    if (isConnected && clientDeviceId && !this.ownerDeviceId) {
      this.ownerDeviceId = clientDeviceId;
    }

    return {
      connected: isConnected,
      port: isConnected ? this.activePortPath : null,
      friendlyName: isConnected ? `Laser COM (${this.activePortPath})` : null,
      baudRate: this.baudRate,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      ports: availablePorts,
      message: isConnected
        ? `Laser Machine Serial Port connected: ${this.activePortPath} (9600 8N1)`
        : 'Laser Machine Serial COM Port is disconnected.'
    };
  }

  isPortInUse(portPath) {
    if (!this.activePort || !this.activePort.isOpen || !this.activePortPath) return false;
    const p1 = String(this.activePortPath).trim().toUpperCase();
    const p2 = String(portPath).trim().toUpperCase();
    const m1 = p1.match(/COM\d+/i)?.[0] || p1;
    const m2 = p2.match(/COM\d+/i)?.[0] || p2;
    return m1 === m2;
  }

  /**
   * Connect to Laser Machine Serial Port with custom parameters and owner tracking
   */
  async connectPort(portPath, configOrBaud = 9600, ownerInfo = {}) {
    if (!SerialPort) {
      return {
        success: false,
        connected: false,
        message: 'SerialPort library is not available in backend environment.'
      };
    }

    const rawPath = (portPath || '').trim();
    const comMatch = rawPath.match(/COM\d+/i);
    const cleanPath = comMatch ? comMatch[0].toUpperCase() : rawPath;
    if (!cleanPath) {
      return {
        success: false,
        connected: false,
        message: 'Please provide a valid COM port name (e.g. COM6).'
      };
    }

    const opts = typeof configOrBaud === 'object' && configOrBaud !== null
      ? configOrBaud
      : { baudRate: configOrBaud };

    const baudRate = Number(opts.baudRate) || 9600;
    const dataBits = Number(opts.dataBits) || 8;
    const parity = (opts.parity || 'none').toLowerCase();
    const stopBits = Number(opts.stopBits) || 1;
    this.baudRate = baudRate;
    this.dataBits = dataBits;
    this.parity = parity;
    this.stopBits = stopBits;
    this.parityErrorChar = opts.parityErrorChar || "63 ('?')";

    // If already connected to this port, verify owner and return success
    const activeKey = this.activePortPath ? (this.activePortPath.match(/COM\d+/i)?.[0] || this.activePortPath).toUpperCase() : null;
    if (this.activePort && this.activePort.isOpen && (this.activePortPath === cleanPath || activeKey === cleanPath)) {
      this.ownerDeviceId = ownerInfo?.deviceId || this.ownerDeviceId;
      this.ownerTunnelId = ownerInfo?.tunnelId || this.ownerTunnelId;
      this.ownerIp = ownerInfo?.ip || this.ownerIp;
      return {
        success: true,
        connected: true,
        port: this.activePortPath || cleanPath,
        friendlyName: `Laser COM (${this.activePortPath || cleanPath}) (${baudRate} ${dataBits}${parity.toUpperCase().charAt(0)}${stopBits})`,
        message: `Already connected to ${this.activePortPath || cleanPath}`
      };
    }

    // Check if the port is physically present in the system
    const availablePorts = await this.listPorts();
    const isPresent = availablePorts.some(p => p.path.toLowerCase() === cleanPath.toLowerCase());
    if (!isPresent) {
      return {
        success: false,
        connected: false,
        port: cleanPath,
        ports: availablePorts,
        message: `Port ${cleanPath} is not physically connected to the computer.`
      };
    }

    // Disconnect any existing port
    await this.disconnectPort();

    return new Promise((resolve) => {
      try {
        const port = new SerialPort({
          path: cleanPath,
          baudRate,
          dataBits,
          parity,
          stopBits,
          autoOpen: false
        });

        port.on('error', (err) => {
          logger.error(`[LaserSerialService] Error on port ${cleanPath}:`, err.message);
          if (this.activePrintSession) {
            this.activePrintSession.addLog(`[LASER ERROR] Serial port error: ${err.message}`, 'ERROR');
          }
        });

        port.on('close', () => {
          logger.warn(`[LaserSerialService] Port ${cleanPath} closed.`);
          if (this.activePortPath === cleanPath) {
            this.activePort = null;
            this.activePortPath = null;
            this.ownerDeviceId = null;
            this.ownerTunnelId = null;
            this.ownerIp = null;
          }
        });

        port.on('data', (chunk) => {
          this.handleIncomingData(chunk);
        });

        port.open((err) => {
          if (err) {
            logger.error(`[LaserSerialService] Failed to open ${cleanPath}:`, err.message);
            resolve({
              success: false,
              connected: false,
              port: cleanPath,
              message: `Unable to open ${cleanPath}: ${err.message}`
            });
            return;
          }

          this.activePort = port;
          this.activePortPath = cleanPath;
          this.ownerDeviceId = ownerInfo?.deviceId || null;
          this.ownerTunnelId = ownerInfo?.tunnelId || null;
          this.ownerIp = ownerInfo?.ip || null;
          this.baudRate = Number(baudRate) || 9600;
          this.rxBuffer = '';

          logger.info(`[LaserSerialService] Successfully connected to Laser Machine on ${cleanPath} @ 9600 8N1 by device=${this.ownerDeviceId}`);
          resolve({
            success: true,
            connected: true,
            port: cleanPath,
            friendlyName: `Laser COM (${cleanPath})`,
            baudRate: this.baudRate,
            message: `Laser Machine Serial Port connected: ${cleanPath} (9600 8N1)`
          });
        });
      } catch (err) {
        logger.error(`[LaserSerialService] Unexpected error connecting ${cleanPath}:`, err.message);
        resolve({
          success: false,
          connected: false,
          message: err.message
        });
      }
    });
  }

  /**
   * Disconnect Laser Machine Serial Port
   */
  async disconnectPort() {
    this.ownerDeviceId = null;
    this.ownerTunnelId = null;
    this.ownerIp = null;
    if (this.activePrintSession) {
      try {
        this.activePrintSession.reject(new Error('Laser print cancelled due to port disconnection.'));
      } catch (_) { }
      this.activePrintSession = null;
    }

    if (!this.activePort) {
      this.activePortPath = null;
      return { success: true, connected: false };
    }

    return new Promise((resolve) => {
      try {
        const portToClose = this.activePort;
        this.activePort = null;
        const prevPath = this.activePortPath;
        this.activePortPath = null;
        this.rxBuffer = '';

        if (portToClose && portToClose.isOpen) {
          portToClose.close(() => {
            logger.info(`[LaserSerialService] Disconnected port ${prevPath}`);
            resolve({ success: true, connected: false, message: `Disconnected port ${prevPath}` });
          });
        } else {
          resolve({ success: true, connected: false });
        }
      } catch (err) {
        logger.warn('[LaserSerialService] Error closing port:', err.message);
        this.activePort = null;
        this.activePortPath = null;
        resolve({ success: true, connected: false });
      }
    });
  }

  /**
   * Cache currently active meter data for instant trigger
   */
  setActiveMeter(meterData) {
    if (!meterData) {
      this.activeMeterData = null;
      return;
    }
    this.activeMeterData = {
      meter_serial_no: String(meterData.meter_serial_no || meterData.serialNo || '').trim(),
      imei_no: String(meterData.imei_no || meterData.imei || '').trim(),
      nic_sr_no: String(meterData.nic_sr_no || meterData.nicsrno || '').trim(),
      id: meterData.id || meterData.recordId || null,
      work_id: meterData.work_id || meterData.form_id || null
    };
    logger.info(`[LaserSerialService] Active meter set: Serial=${this.activeMeterData.meter_serial_no}, IMEI=${this.activeMeterData.imei_no}, NIC=${this.activeMeterData.nic_sr_no}`);
  }

  /**
   * Start Laser Print Session:
   * Sets isLaserActive = true and waits for Laser Machine requests (F1, F2, F3) over serial port.
   * Does NOT send data immediately upon starting. Only responds when Laser Machine asks F1, F2, F3.
   */
  async startLaserSession({
    meter_serial_no,
    imei_no,
    nic_sr_no,
    port = null
  }) {
    const targetPort = port || this.activePortPath;
    if (!this.activePort || !this.activePort.isOpen) {
      if (targetPort) {
        const connectRes = await this.connectPort(targetPort);
        if (!connectRes.success || !connectRes.connected) {
          throw new Error(`Laser Machine Serial COM Port (${targetPort}) is not connected. Please connect the Laser COM port first.`);
        }
      } else {
        throw new Error('Laser Machine Serial COM Port is not connected. Please select and connect Laser COM port first.');
      }
    }

    const cleanSerial = String(meter_serial_no || this.activeMeterData?.meter_serial_no || '').trim();
    const cleanImei = String(imei_no || this.activeMeterData?.imei_no || '').trim();
    const cleanNic = String(nic_sr_no || this.activeMeterData?.nic_sr_no || '').trim();

    if (!cleanSerial || !cleanImei || !cleanNic) {
      throw new Error(`Cannot start Laser Print: Missing required parameters (Serial: '${cleanSerial}', IMEI: '${cleanImei}', NIC: '${cleanNic}').`);
    }

    this.rxBuffer = '';
    this.isLaserActive = true;

    const logs = [];
    const addLog = (msg, status = 'INFO') => {
      const entry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        msg,
        status
      };
      logs.push(entry);
      logger.info(`[LaserSerialService] ${msg}`);
    };

    addLog(`Laser Print session armed on ${this.activePortPath} @ 9600 8N1. Waiting for Laser Machine requests (F1/F2/F3)...`, 'INFO');

    this.activePrintSession = {
      meter_serial_no: cleanSerial,
      imei_no: cleanImei,
      nic_sr_no: cleanNic,
      sent: { f1: false, f2: false, f3: false },
      logs,
      addLog,
      startTime: Date.now()
    };

    // If buffer already received any command, evaluate immediately
    if (this.rxBuffer.length > 0) {
      this.evaluateBufferAndRespond();
    }

    return {
      success: true,
      isLaserActive: true,
      port: this.activePortPath,
      message: 'Laser session started. Waiting for Laser Machine requests (F1, F2, F3)...',
      logs
    };
  }

  /**
   * Stop Laser Print Session:
   * Stops listening and stops serial transmission of meter data.
   */
  stopLaserSession() {
    this.isLaserActive = false;
    const session = this.activePrintSession;
    const sent = session ? { ...session.sent } : { f1: false, f2: false, f3: false };
    const logs = session?.logs ? [...session.logs] : [];

    if (session && session.addLog) {
      session.addLog(`[LASER STOPPED] Serial communication stopped by operator.`, 'INFO');
    }

    this.activePrintSession = null;
    this.rxBuffer = '';

    logger.info(`[LaserSerialService] Laser print session stopped. Sent status: ${JSON.stringify(sent)}`);

    return {
      success: true,
      isLaserActive: false,
      sent,
      logs
    };
  }

  /**
   * Get current Laser Session status
   */
  getSessionStatus() {
    return {
      connected: Boolean(this.activePort && this.activePort.isOpen),
      port: this.activePortPath,
      isLaserActive: this.isLaserActive,
      sent: this.activePrintSession?.sent || { f1: false, f2: false, f3: false },
      logs: this.activePrintSession?.logs || []
    };
  }

  /**
   * Execute Laser Print session:
   * Waits for Laser Machine to send F3, F2, F1 requests and responds with:
   * F3 -> meter_serial_no<CR>
   * F2 -> nic_sr_no<CR>
   * F1 -> imei_no<CR>
   * When all 3 fields are fulfilled, resolves the session.
   */
  async executeLaserPrint({
    meter_serial_no,
    imei_no,
    nic_sr_no,
    port = null,
    timeoutMs = 30000
  }) {
    // 1. Ensure port is connected
    const targetPort = port || this.activePortPath;
    if (!this.activePort || !this.activePort.isOpen) {
      if (targetPort) {
        const connectRes = await this.connectPort(targetPort);
        if (!connectRes.success || !connectRes.connected) {
          throw new Error(`Laser Machine Serial COM Port (${targetPort}) is not connected. Please connect the Laser COM port first.`);
        }
      } else {
        throw new Error('Laser Machine Serial COM Port is not connected. Please select and connect Laser COM port at the top first.');
      }
    }

    const cleanSerial = String(meter_serial_no || '').trim();
    const cleanImei = String(imei_no || '').trim();
    const cleanNic = String(nic_sr_no || '').trim();

    if (!cleanSerial || !cleanImei || !cleanNic) {
      throw new Error(`Cannot execute Laser Print: Missing required parameters (Serial: '${cleanSerial}', IMEI: '${cleanImei}', NIC: '${cleanNic}').`);
    }

    // Cancel any previous session
    if (this.activePrintSession) {
      try {
        this.activePrintSession.reject(new Error('Preempted by new laser print session.'));
      } catch (_) { }
      this.activePrintSession = null;
    }

    this.rxBuffer = '';

    return new Promise((resolve, reject) => {
      const logs = [];
      const addLog = (msg, status = 'INFO') => {
        const entry = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          msg,
          status
        };
        logs.push(entry);
        logger.info(`[LaserSerialService] ${msg}`);
      };

      addLog(`Laser Print session armed on ${this.activePortPath} @ 9600 8N1. Waiting for Laser Machine requests (F1/F2/F3)...`, 'INFO');

      const session = {
        meter_serial_no: cleanSerial,
        imei_no: cleanImei,
        nic_sr_no: cleanNic,
        sent: { f1: false, f2: false, f3: false },
        logs,
        addLog,
        resolve: null,
        reject: null,
        timer: null
      };

      const finishSession = () => {
        if (session.timer) {
          clearTimeout(session.timer);
          session.timer = null;
        }
        this.activePrintSession = null;
        resolve({
          success: true,
          allSent: true,
          logs: session.logs
        });
      };

      session.timer = setTimeout(() => {
        this.activePrintSession = null;
        const missing = [];
        if (!session.sent.f1) missing.push('F1 (IMEI)');
        if (!session.sent.f2) missing.push('F2 (NIC)');
        if (!session.sent.f3) missing.push('F3 (Serial)');
        const timeoutMsg = `Laser marking timed out (${timeoutMs / 1000}s). Missing requests from laser machine: ${missing.join(', ')}. Please verify laser machine trigger and connection.`;
        addLog(`[TIMEOUT] ${timeoutMsg}`, 'ERROR');
        reject(new Error(timeoutMsg));
      }, timeoutMs);

      session.finish = finishSession;
      session.reject = (err) => {
        if (session.timer) clearTimeout(session.timer);
        this.activePrintSession = null;
        reject(err);
      };

      this.activePrintSession = session;

      // Also process any data already in rxBuffer
      if (this.rxBuffer.length > 0) {
        this.evaluateBufferAndRespond();
      }
    });
  }

  /**
   * Handle incoming data from Laser Machine Serial Port
   */
  handleIncomingData(chunk) {
    const raw = chunk.toString('ascii');
    this.rxBuffer += raw;
    logger.info(`[LaserSerialService] Raw RX: ${JSON.stringify(raw)}`);

    this.evaluateBufferAndRespond();
  }

  /**
   * Evaluate rxBuffer for F1, F2, F3 commands and respond immediately
   * ONLY responds when isLaserActive is true!
   */
  evaluateBufferAndRespond() {
    // When laser is not active, do not send any data!
    if (!this.isLaserActive || !this.activePrintSession) {
      if (this.rxBuffer.length > 60) {
        this.rxBuffer = this.rxBuffer.slice(-20);
      }
      return;
    }

    const session = this.activePrintSession;

    // Check for F3 (Meter Serial No)
    // Matches 'F3', 'f3' in incoming stream
    while (/F3/i.test(this.rxBuffer)) {
      this.rxBuffer = this.rxBuffer.replace(/F3/i, '');
      this.sendResponse('F3', session.meter_serial_no, session);
    }

    // Check for F2 (NIC Serial No)
    while (/F2/i.test(this.rxBuffer)) {
      this.rxBuffer = this.rxBuffer.replace(/F2/i, '');
      this.sendResponse('F2', session.nic_sr_no, session);
    }

    // Check for F1 (IMEI No)
    while (/F1/i.test(this.rxBuffer)) {
      this.rxBuffer = this.rxBuffer.replace(/F1/i, '');
      this.sendResponse('F1', session.imei_no, session);
    }

    // Prevent buffer overflow
    if (this.rxBuffer.length > 60) {
      this.rxBuffer = this.rxBuffer.slice(-20);
    }
  }

  /**
   * Send response to Laser Machine: <value><CR>
   */
  sendResponse(fieldKey, value, session) {
    const cleanVal = String(value || '').trim();
    // In Docklight, Send Sequence ends with <CR> (\r, ASCII 0x0D)
    const payload = `${cleanVal}\r`;

    if (this.activePort && this.activePort.isOpen) {
      try {
        this.activePort.write(payload, (err) => {
          if (err) {
            logger.error(`[LaserSerialService] Write error for ${fieldKey}:`, err.message);
          }
        });
      } catch (err) {
        logger.error(`[LaserSerialService] Exception writing to port:`, err.message);
      }
    }

    const fieldName = fieldKey === 'F1' ? 'IMEI No' : fieldKey === 'F2' ? 'NIC Serial No' : 'Meter Serial No';
    const logMsg = `[LASER RX] - ${fieldKey}\n[LASER TX] - ${cleanVal}<CR>`;

    if (session.addLog) {
      session.addLog(`[LASER RX] - ${fieldKey} (${fieldName} requested)`, 'INFO');
      session.addLog(`[LASER TX] - ${cleanVal}<CR>`, 'SUCCESS');
    }

    if (fieldKey === 'F1') session.sent.f1 = true;
    if (fieldKey === 'F2') session.sent.f2 = true;
    if (fieldKey === 'F3') session.sent.f3 = true;

    // If active print session and all 3 numbers have been sent, complete print!
    if (this.activePrintSession && session.sent.f1 && session.sent.f2 && session.sent.f3) {
      if (session.addLog) {
        session.addLog('[LASER PRINT COMPLETE] All fields (F1, F2, F3) sent to Laser Machine. Updating database...', 'SUCCESS');
      }
      setTimeout(() => {
        if (session.finish) session.finish();
      }, 100);
    }
  }

  /**
   * Simulate incoming query from Laser Machine (e.g. for testing via UI or API)
   */
  simulateIncomingQuery(cmd) {
    const upper = String(cmd || '').trim().toUpperCase();
    if (upper === 'ALL') {
      this.handleIncomingData(Buffer.from('F3'));
      setTimeout(() => this.handleIncomingData(Buffer.from('F2')), 250);
      setTimeout(() => this.handleIncomingData(Buffer.from('F1')), 500);
      return { success: true, simulated: ['F3', 'F2', 'F1'] };
    }

    this.handleIncomingData(Buffer.from(upper));
    return { success: true, simulated: [upper] };
  }
}

// Export singleton instance
module.exports = new LaserSerialService();
