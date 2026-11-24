import wsClient from './websocketService';

export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'device_server';
  try {
    let id = localStorage.getItem('zenmeter_client_device_id');
    if (!id) {
      id = 'dev_' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 10));
      localStorage.setItem('zenmeter_client_device_id', id);
    }
    return id;
  } catch (e) {
    return 'dev_fallback';
  }
}

function hexToBytes(hex) {
  if (!hex || typeof hex !== 'string') return new Uint8Array(0);
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  if (!bytes) return '';
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

class WebSerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.reading = false;
    this.tunnelId = null;
    this.deviceId = getOrCreateDeviceId();
    this.portName = 'USB Port';
    this.listeners = new Set();
    this.unsubscribeWs = null;
    this.operatorId = null;
  }

  isChromium() {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return Boolean(window.chrome || /Chrome|Chromium|Edg/i.test(ua));
  }

  hasNativeSerial() {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  isSupported() {
    return this.hasNativeSerial() || this.isChromium();
  }

  isSecureContext() {
    return typeof window !== 'undefined' && Boolean(window.isSecureContext);
  }

  formatDeviceName(info = {}, index = 0, customLabel = '') {
    const vid = info.usbVendorId || 0;
    const pid = info.usbProductId || 0;

    let baseName = null;
    if (vid === 0x10C4) baseName = 'Silicon Labs CP210x USB to UART Bridge';
    else if (vid === 0x0403 && pid === 0x6001) baseName = 'USB Serial Port';
    else if (vid === 0x0403 && pid === 0x6015) baseName = 'FT230X USB Optical Probe';
    else if (vid === 0x1A86) baseName = 'CH340 USB Serial Adapter';
    else if (vid === 0x067B) baseName = 'Prolific PL2303 USB Serial';
    else if (vid && pid) baseName = `USB Device (${vid.toString(16).padStart(4, '0').toUpperCase()}:${pid.toString(16).padStart(4, '0').toUpperCase()})`;
    else baseName = `USB Port ${index + 1}`;

    const label = customLabel ? String(customLabel).trim() : '';
    if (label) {
      const cleanLabel = label.startsWith('(') ? label : `(${label})`;
      return `${baseName} ${cleanLabel}`;
    }
    return baseName;
  }

  async getPairedPorts(customLabel = '') {
    if (!this.hasNativeSerial()) return [];
    try {
      const ports = await navigator.serial.getPorts();
      return (ports || [])
        .map((p, idx) => {
          const info = p.getInfo?.() || {};
          const friendlyName = this.formatDeviceName(info, idx, customLabel);
          const isUsedByLaser = Boolean(p.readable !== null && this.port !== p);
          return {
            port: p,
            index: idx,
            info,
            friendlyName,
            isUsedByLaser
          };
        })
        .filter(p => {
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
    } catch (err) {
      console.warn('[WebSerial] Error getting paired ports:', err);
      return [];
    }
  }

  setupDeviceListeners(onConnect, onDisconnect) {
    if (!this.hasNativeSerial()) return () => { };
    this.externalDisconnectCallback = onDisconnect;
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
        this.externalDisconnectCallback = null;
        navigator.serial.removeEventListener('connect', handleConnect);
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      };
    } catch (e) {
      return () => { };
    }
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

  getStatus() {
    return {
      supported: this.isSupported(),
      hasNativeSerial: this.hasNativeSerial(),
      isSecure: this.isSecureContext(),
      connected: Boolean(this.port && this.reading),
      tunnelId: this.tunnelId,
      deviceId: this.deviceId,
      portName: this.portName
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const status = this.getStatus();
    this.listeners.forEach(cb => {
      try { cb(status); } catch (e) { }
    });
  }

  async autoConnect(operatorId = null) {
    if (!this.hasNativeSerial()) return null;
    try {
      const ports = await navigator.serial.getPorts();
      if (ports && ports.length > 0) {
        return await this.connectPort(ports[0], operatorId);
      }
    } catch (err) {
      console.warn('[WebSerial] Auto-connect error:', err);
    }
    return null;
  }

  async requestPortAndConnect(operatorId = null, serialConfig = {}) {
    if (!this.hasNativeSerial()) {
      if (this.isChromium() && !this.isSecureContext()) {
        throw new Error('CHROME_INSECURE_ORIGIN');
      }
      throw new Error('Web Serial API is only supported in Google Chrome or Microsoft Edge.');
    }

    try {
      const port = await navigator.serial.requestPort();
      return await this.connectPort(port, operatorId, serialConfig);
    } catch (err) {
      if (err.name === 'NotFoundError' || (err.message && err.message.toLowerCase().includes('no port selected'))) {
        throw new Error('No serial port selected.');
      }
      throw err;
    }
  }

  async connectPort(portInstance, operatorId = null, serialConfig = {}) {
    if (!portInstance) throw new Error('No port instance provided.');

    // Check if this port is already in use by Laser Port or another connection
    if (portInstance.readable !== null && this.port !== portInstance) {
      throw new Error('This USB port is already in use by Laser Port. Please select or plug in your Optical Cable.');
    }

    // If this exact portInstance is already opened and readable by this service, reuse it cleanly!
    if (this.port === portInstance && this.reading && portInstance.readable) {
      return {
        success: true,
        connected: true,
        portName: this.portName,
        tunnelId: this.tunnelId
      };
    }

    // If existing port is open, disconnect first
    if (this.port && this.port !== portInstance) {
      await this.disconnect();
    }

    this.operatorId = operatorId || 'OPERATOR';
    this.port = portInstance;

    try {
      const info = portInstance.getInfo?.() || {};
      this.portName = this.formatDeviceName(info, 0, serialConfig?.comPortLabel || '');
    } catch (e) {
      this.portName = 'USB Serial Port';
    }

    const baudRate = Number(serialConfig?.baudRate) || 9600;
    const dataBits = Number(serialConfig?.dataBits) || 8;
    const stopBits = Number(serialConfig?.stopBits) || 1;
    const parity = (serialConfig?.parity || 'none').toLowerCase();

    // 4. Only call port.open() if port is not already opened
    if (!this.port.readable) {
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
        console.warn('[WebSerial] Standard open failed, trying baudRate-only fallback:', errA.message);
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
          throw new Error('This USB COM port is already in use by another tab or program. Please select your Optical Cable.');
        }
        throw new Error(`Optical Cable Not Detected: Unable to open port (${msg})`);
      }
    }

    // Supply optical probe IR transmitter power (DTR/RTS)
    try {
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch (e) {
      console.warn('[WebSerial] Could not set DTR/RTS signals:', e.message);
    }

    // Verify communication streams
    if (!this.port.writable || !this.port.readable) {
      await this.disconnect();
      throw new Error('Optical Cable Not Detected: Serial communication streams unavailable.');
    }

    try {
      // Send optical wake pulse to verify physical communication
      const writer = this.port.writable.getWriter();
      try {
        await writer.write(new Uint8Array([0x00]));
      } finally {
        writer.releaseLock();
      }
    } catch (writeErr) {
      console.warn('[WebSerial] Optical wake pulse note:', writeErr.message);
    }

    // Generate unique tunnel session ID
    this.tunnelId = `opt_tunnel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.reading = true;

    // Ensure WebSocket is connected
    wsClient.connect();

    // Register tunnel with backend
    const registerTunnel = () => {
      wsClient.send({
        type: 'OPTICAL_TUNNEL_REGISTER',
        tunnelId: this.tunnelId,
        deviceId: this.deviceId,
        portName: this.portName,
        operatorId: this.operatorId
      });
    };

    registerTunnel();
    // Re-register if WS reconnects
    setTimeout(registerTunnel, 500);

    // Subscribe to WS tunnel messages from backend
    if (this.unsubscribeWs) this.unsubscribeWs();
    this.unsubscribeWs = wsClient.subscribe((msg) => {
      if (!msg) return;
      if (msg.event === 'OPTICAL_TUNNEL_TX' && msg.tunnelId === this.tunnelId && msg.dataHex) {
        this.writeHex(msg.dataHex);
      } else if (msg.event === 'OPTICAL_TUNNEL_SIGNALS' && msg.tunnelId === this.tunnelId && msg.signals) {
        this.setSignals(msg.signals);
      }
    });

    // Start background reading loop
    this.startReadLoop();
    this.notify();

    return {
      success: true,
      portName: this.portName,
      tunnelId: this.tunnelId
    };
  }

  async startReadLoop() {
    while (this.port && this.port.readable && this.reading) {
      try {
        this.reader = this.port.readable.getReader();
        while (this.reading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value && value.length > 0) {
            const hex = bytesToHex(value);
            wsClient.send({
              type: 'OPTICAL_TUNNEL_RX',
              tunnelId: this.tunnelId,
              dataHex: hex
            });
          }
        }
      } catch (err) {
        if (this.reading) {
          console.warn('[WebSerial] Read loop error (device unplugged/interrupted):', err.message);
          const cb = this.externalDisconnectCallback;
          await this.disconnect();
          if (cb) {
            try { cb(null); } catch (_) { }
          }
          break;
        }
      } finally {
        try {
          if (this.reader) {
            this.reader.releaseLock();
            this.reader = null;
          }
        } catch (e) { }
      }
    }
  }

  async writeHex(hex) {
    if (!this.port || !this.port.writable) return;
    try {
      const writer = this.port.writable.getWriter();
      try {
        const bytes = hexToBytes(hex);
        await writer.write(bytes);
      } finally {
        writer.releaseLock();
      }
    } catch (err) {
      console.warn('[WebSerial] Write error:', err.message);
    }
  }

  async setSignals(signals = {}) {
    if (!this.port) return;
    try {
      await this.port.setSignals({
        dataTerminalReady: signals.dtr !== undefined ? Boolean(signals.dtr) : true,
        requestToSend: signals.rts !== undefined ? Boolean(signals.rts) : true
      });
    } catch (err) {
      console.warn('[WebSerial] Set signals error:', err.message);
    }
  }

  async disconnect() {
    this.reading = false;

    if (this.tunnelId) {
      wsClient.send({
        type: 'OPTICAL_TUNNEL_UNREGISTER',
        tunnelId: this.tunnelId,
        deviceId: this.deviceId
      });
    }

    if (this.unsubscribeWs) {
      this.unsubscribeWs();
      this.unsubscribeWs = null;
    }

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) { }
      try {
        this.reader.releaseLock();
      } catch (e) { }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        console.warn('[WebSerial] Error closing port:', e.message);
      }
      this.port = null;
    }

    this.tunnelId = null;
    this.notify();
  }
}

export const webSerialService = new WebSerialService();
export default webSerialService;

