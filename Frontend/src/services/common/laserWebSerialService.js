import webSerialService from './webSerialService';

/**
 * LaserWebSerialService
 * Handles Web Serial connection and real-time ASCII communication with Laser Marking Machine
 * Specification: 9600 Baud, 8 Data Bits, 1 Stop Bit, No Parity (8-N-1)
 *
 * Protocol:
 * Laser asks F3 -> respond with meter_serial_no<CR> (\r)
 * Laser asks F2 -> respond with nic_sr_no<CR> (\r)
 * Laser asks F1 -> respond with imei_no<CR> (\r)
 * Every time laser asks, immediately respond with requested value.
 */

class LaserWebSerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this.portName = 'Laser Serial Port';
    this.rxBuffer = '';
    this.activeMeterData = null;
    this.activePrintSession = null;
    this.isLaserActive = false;
    this.listeners = new Set();
    this.logListeners = new Set();
    this.sessionListeners = new Set();
  }

  onSession(callback) {
    this.sessionListeners.add(callback);
    return () => this.sessionListeners.delete(callback);
  }

  notifySession() {
    const sessionData = {
      isLaserActive: this.isLaserActive,
      sent: this.activePrintSession?.sent || { f1: false, f2: false, f3: false }
    };
    this.sessionListeners.forEach(cb => {
      try { cb(sessionData); } catch (_) { }
    });
  }

  hasNativeSerial() {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  formatDeviceName(info = {}, index = 0, customLabel = '') {
    const vid = info.usbVendorId || 0;
    const pid = info.usbProductId || 0;

    let baseName = null;
    if (vid === 0x10C4) baseName = 'Silicon Labs CP210x USB to UART Bridge';
    else if (vid === 0x0403 && pid === 0x6001) baseName = 'USB Serial Port';
    else if (vid === 0x0403 && pid === 0x6015) baseName = 'FT230X USB Serial Port';
    else if (vid === 0x1A86) baseName = 'CH340 USB Serial Adapter';
    else if (vid === 0x067B) baseName = 'Prolific PL2303 USB Serial';
    else if (vid && pid) baseName = `USB Serial (${vid.toString(16).padStart(4, '0').toUpperCase()}:${pid.toString(16).padStart(4, '0').toUpperCase()})`;
    else baseName = `USB Serial Port ${index + 1}`;

    const label = customLabel ? String(customLabel).trim() : '';
    if (label) {
      const cleanLabel = label.startsWith('(') ? label : `(${label})`;
      return `${baseName} ${cleanLabel}`;
    }
    return baseName;
  }

  async checkPortStillConnected() {
    if (!this.port) return false;
    if (!this.hasNativeSerial()) return false;
    try {
      const ports = await navigator.serial.getPorts();
      return ports.some(p => p === this.port);
    } catch (e) {
      return false;
    }
  }

  setupDeviceListeners(onConnect, onDisconnect) {
    if (!this.hasNativeSerial()) return () => { };
    const handleConnect = (e) => {
      const port = e.port || e.target;
      if (onConnect) onConnect(port);
    };
    const handleDisconnect = async (e) => {
      const port = e.port || e.target;
      if (!this.port) return;

      let isOurPort = Boolean(this.port === port);
      if (!isOurPort) {
        try {
          const ports = await navigator.serial.getPorts();
          if (!ports.some(p => p === this.port)) {
            isOurPort = true;
          }
        } catch (_) { }
      }

      // STRICT ISOLATION: ONLY disconnect and notify if THIS service's port was unplugged!
      if (isOurPort) {
        await this.disconnect();
        if (onDisconnect) onDisconnect(port);
      }
    };

    try {
      navigator.serial.addEventListener('connect', handleConnect);
      navigator.serial.addEventListener('disconnect', handleDisconnect);
      return () => {
        navigator.serial.removeEventListener('connect', handleConnect);
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      };
    } catch (e) {
      return () => { };
    }
  }

  async getPairedPorts(customLabel = '') {
    if (!this.hasNativeSerial()) return [];
    try {
      const ports = await navigator.serial.getPorts();
      return (ports || []).map((p, idx) => {
        const info = p.getInfo?.() || {};
        const friendlyName = this.formatDeviceName(info, idx, customLabel);

        const isUsedByOptical = Boolean(
          (webSerialService?.port && (webSerialService.port === p) && webSerialService.connected) ||
          (p.readable !== null && this.port !== p)
        );

        return {
          port: p,
          index: idx,
          info,
          friendlyName,
          isUsedByOptical
        };
      }).filter(p => {
        if (!p.friendlyName) return false;
        const n = p.friendlyName.trim().toLowerCase();
        return (
          n !== '' &&
          n !== 'usb port' &&
          n !== 'optical port' &&
          n !== 'laser port' &&
          n !== 'com port' &&
          n !== 'serial port' &&
          n !== 'none' &&
          !/^usb\s*port(\s*\(\d+\))?$/i.test(n) &&
          !/^laser\s*port(\s*\(\d+\))?$/i.test(n) &&
          !/^optical\s*port(\s*\(\d+\))?$/i.test(n)
        );
      });
    } catch (e) {
      return [];
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onLog(callback) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  addLog(msg, status = 'INFO') {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      msg,
      status
    };
    this.logListeners.forEach(cb => {
      try { cb(entry); } catch (_) { }
    });
  }

  notify() {
    const status = this.getStatus();
    this.listeners.forEach(cb => {
      try { cb(status); } catch (_) { }
    });
  }

  getStatus() {
    return {
      connected: Boolean(this.port && this.connected),
      portName: this.portName,
      baudRate: 9600
    };
  }

  /**
   * Request user to pick a serial port via native browser prompt
   */
  async requestPortAndConnect(serialConfig = {}) {
    if (!this.hasNativeSerial()) {
      throw new Error('Web Serial API is only supported in Google Chrome or Microsoft Edge.');
    }
    try {
      const port = await navigator.serial.requestPort();
      return await this.connectPort(port, serialConfig);
    } catch (err) {
      if (err.name === 'NotFoundError' || (err.message && err.message.toLowerCase().includes('no port selected'))) {
        throw new Error('No serial port selected.');
      }
      throw err;
    }
  }

  /**
   * Connect to a specific port instance with custom serial settings
   */
  async connectPort(portInstance, serialConfig = {}) {
    if (!portInstance) throw new Error('No port instance provided.');

    // 1. Check if this port is already in use by Optical Port
    if ((webSerialService?.port === portInstance && webSerialService?.connected) || (portInstance.readable !== null && this.port !== portInstance)) {
      throw new Error('This USB port is already in use by Optical Port. Please select or plug in your Laser Machine USB cable.');
    }

    // 2. Check if already connected to this exact port instance
    if (this.port === portInstance && this.connected && portInstance.readable) {
      return {
        success: true,
        connected: true,
        portName: this.portName
      };
    }

    if (this.port && this.port !== portInstance) {
      await this.disconnect();
    }

    this.port = portInstance;
    try {
      const info = portInstance.getInfo?.() || {};
      this.portName = this.formatDeviceName(info, 0, serialConfig?.comPortLabel || '');
    } catch (e) {
      this.portName = 'Laser Port';
    }

    const baudRate = Number(serialConfig?.baudRate) || 9600;
    const dataBits = Number(serialConfig?.dataBits) || 8;
    const stopBits = Number(serialConfig?.stopBits) || 1;
    const parity = (serialConfig?.parity || 'none').toLowerCase();

    // 3. Only call open() if not already opened
    if (!portInstance.readable) {
      let openSuccess = false;
      let lastErr = null;

      try {
        await this.port.open({
          baudRate,
          dataBits,
          stopBits,
          parity
        });
        openSuccess = true;
      } catch (errA) {
        lastErr = errA;
        console.warn('[LaserWebSerial] Standard open failed, trying baudRate-only fallback:', errA.message);
      }

      if (!openSuccess) {
        try {
          await this.port.open({ baudRate });
          openSuccess = true;
        } catch (errB) {
          lastErr = errB;
        }
      }

      if (!openSuccess) {
        this.port = null;
        const msg = (lastErr && lastErr.message) ? lastErr.message : 'Unknown error';
        if (msg.toLowerCase().includes('already open')) {
          throw new Error('This USB port is already open by another program or connection. Please select your Laser Machine cable.');
        }
        throw new Error(`Unable to open serial port (${msg})`);
      }
    }

    this.connected = true;
    this.rxBuffer = '';

    this.startReadLoop();
    this.notify();

    this.addLog(`Laser Port connected: ${this.portName} @ 9600 8N1.`, 'SUCCESS');

    return {
      success: true,
      connected: true,
      portName: this.portName
    };
  }

  /**
   * Disconnect port gracefully
   */
  async disconnect() {
    this.connected = false;
    this.isLaserActive = false;
    if (this.activePrintSession) {
      try { this.activePrintSession.reject(new Error('Laser port disconnected.')); } catch (_) { }
      this.activePrintSession = null;
    }
    this.notifySession();

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (_) { }
      try {
        this.reader.releaseLock();
      } catch (_) { }
      this.reader = null;
    }

    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch (_) { }
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (_) { }
      this.port = null;
    }

    this.rxBuffer = '';
    this.notify();
    this.addLog(`Laser Port disconnected.`, 'INFO');
  }

  /**
   * Set active meter data in memory for standby
   */
  setActiveMeter(meterData) {
    if (!meterData) {
      this.activeMeterData = null;
      return;
    }
    this.activeMeterData = {
      meter_serial_no: String(meterData.serialNo || meterData.meter_serial_no || '').trim(),
      imei_no: String(meterData.imeiNo || meterData.imei || '').trim(),
      nic_sr_no: String(meterData.nicSrNo || meterData.nicsrno || '').trim(),
      id: meterData.recordId || meterData.id || null,
      work_id: meterData.workId || meterData.work_id || null
    };
  }

  /**
   * Start Laser Print Session:
   * Sets isLaserActive = true and arms port to respond ONLY when Laser Machine asks F1, F2, F3.
   * Does NOT send any data upon start until Laser Machine sends query.
   */
  startLaserSession(meterData) {
    const data = meterData || this.activeMeterData;
    if (!data) {
      throw new Error('No meter data provided to start laser session.');
    }
    const serial = String(data.serialNo || data.meter_serial_no || '').trim();
    const imei = String(data.imeiNo || data.imei || '').trim();
    const nic = String(data.nicSrNo || data.nicsrno || '').trim();

    this.isLaserActive = true;
    this.rxBuffer = '';
    this.activePrintSession = {
      meter_serial_no: serial,
      imei_no: imei,
      nic_sr_no: nic,
      sent: { f1: false, f2: false, f3: false },
      startTime: Date.now()
    };

    this.addLog(`[LASER ARMED] Laser Port (${this.portName}) waiting for Laser Machine queries (F1/F2/F3)...`, 'SUCCESS');
    this.notifySession();
    return { success: true, isLaserActive: true };
  }

  /**
   * Stop Laser Print Session:
   * Stops listening and stops serial output transmission.
   */
  stopLaserSession() {
    this.isLaserActive = false;
    const session = this.activePrintSession;
    const sent = session ? { ...session.sent } : { f1: false, f2: false, f3: false };
    this.activePrintSession = null;
    this.rxBuffer = '';
    this.addLog(`[LASER STOPPED] Serial communication stopped by operator.`, 'INFO');
    this.notifySession();
    return { success: true, isLaserActive: false, sent };
  }

  /**
   * Start read loop on open port
   */
  async startReadLoop() {
    if (!this.port || !this.port.readable) return;

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.connected) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.handleIncomingText(value);
        }
      }
    } catch (err) {
      if (this.connected) {
        console.warn('[LaserWebSerial] Read loop error:', err);
      }
    } finally {
      try { this.reader.releaseLock(); } catch (_) { }
      this.reader = null;
    }
  }

  /**
   * Process incoming text chunks from Laser Machine
   * STRICT: ONLY sends response when isLaserActive is true!
   */
  handleIncomingText(str) {
    this.rxBuffer += str;

    // Do NOT send any data when laser session is not active!
    if (!this.isLaserActive || !this.activePrintSession) {
      if (this.rxBuffer.length > 50) this.rxBuffer = this.rxBuffer.slice(-20);
      return;
    }

    const data = this.activePrintSession;

    // F3 -> Meter Serial No (Every time asked while laser active, send!)
    while (/F3/i.test(this.rxBuffer)) {
      this.rxBuffer = this.rxBuffer.replace(/F3/i, '');
      this.sendResponse('F3', data.meter_serial_no);
    }

    // F2 -> NIC Serial No (Every time asked while laser active, send!)
    while (/F2/i.test(this.rxBuffer)) {
      this.rxBuffer = this.rxBuffer.replace(/F2/i, '');
      this.sendResponse('F2', data.nic_sr_no);
    }

    // F1 -> IMEI No (Every time asked while laser active, send!)
    while (/F1/i.test(this.rxBuffer)) {
      this.rxBuffer = this.rxBuffer.replace(/F1/i, '');
      this.sendResponse('F1', data.imei_no);
    }

    if (this.rxBuffer.length > 50) {
      this.rxBuffer = this.rxBuffer.slice(-20);
    }
  }

  /**
   * Transmit <value>\r to Laser Machine
   */
  async sendResponse(fieldKey, value) {
    const cleanVal = String(value || '').trim();
    const payload = `${cleanVal}\r`;

    if (this.port && this.port.writable) {
      try {
        const encoder = new TextEncoder();
        const writer = this.port.writable.getWriter();
        await writer.write(encoder.encode(payload));
        writer.releaseLock();
      } catch (err) {
        console.error('[LaserWebSerial] Write error:', err);
      }
    }

    const fieldName = fieldKey === 'F1' ? 'IMEI No' : fieldKey === 'F2' ? 'NIC Serial No' : 'Meter Serial No';
    this.addLog(`[LASER RX] - ${fieldKey} (${fieldName} requested)`, 'INFO');
    this.addLog(`[LASER TX] - ${cleanVal}<CR>`, 'SUCCESS');

    if (this.activePrintSession) {
      if (fieldKey === 'F1') this.activePrintSession.sent.f1 = true;
      if (fieldKey === 'F2') this.activePrintSession.sent.f2 = true;
      if (fieldKey === 'F3') this.activePrintSession.sent.f3 = true;
      this.notifySession();

      if (this.activePrintSession.sent.f1 && this.activePrintSession.sent.f2 && this.activePrintSession.sent.f3) {
        this.addLog('[LASER ALL SENT] All fields (F1, F2, F3) sent to Laser Machine. Laser marking in progress...', 'SUCCESS');
      }
    }
  }

  /**
   * Arm active print session with timeout
   */
  async armPrintSession(meterData, timeoutMs = 30000) {
    this.setActiveMeter(meterData);
    this.rxBuffer = '';

    return new Promise((resolve, reject) => {
      const session = {
        meter_serial_no: meterData.meter_serial_no || meterData.serialNo,
        imei_no: meterData.imei_no || meterData.imei,
        nic_sr_no: meterData.nic_sr_no || meterData.nicSrNo,
        sent: { f1: false, f2: false, f3: false },
        resolve,
        reject,
        timer: null
      };

      session.timer = setTimeout(() => {
        this.activePrintSession = null;
        const missing = [];
        if (!session.sent.f1) missing.push('F1 (IMEI)');
        if (!session.sent.f2) missing.push('F2 (NIC)');
        if (!session.sent.f3) missing.push('F3 (Serial)');
        reject(new Error(`Laser marking timed out (${timeoutMs / 1000}s). Missing requests: ${missing.join(', ')}`));
      }, timeoutMs);

      this.activePrintSession = session;

      if (this.rxBuffer.length > 0) {
        this.handleIncomingText('');
      }
    });
  }
}

export default new LaserWebSerialService();
