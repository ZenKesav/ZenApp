/**
 * Unified Hardware Port Manager
 * Standardized serial port management for all stages (Stage 1, 2, 4, 6, 7, 8, 9, etc.)
 * 
 * Capabilities:
 * 1. Independent Workstation Isolation:
 *    - System 1 (Host Server PC): Shows & connects to System 1's physical Device Manager ports.
 *    - System 2 (Client Workstation): Shows & connects ONLY to System 2's WebSerial ports.
 *    - System 1 ports NEVER leak to System 2. System 2 ports NEVER leak to System 1.
 * 2. Exact Device Manager Names: Formats ports as "USB Serial Port (COM3)", "USB Serial Port (COM4)",
 *    "Communications Port (COM1)".
 * 3. Cross-Stage Port Locking: Local exclusive locking across browser tabs on the same machine.
 * 4. Reload (F5) Persistence: Stays connected across browser reloads without prompting.
 * 5. Real-Time Hotplug: Listens to both 'connect' and 'disconnect' events.
 */

import webSerialService from './webSerialService';
import laserWebSerialService from './laserWebSerialService';
import hardwarePortLockService, { extractPortIdentifier } from './hardwarePortLockService';
import { jigService } from '../apiServices';

export function extractComKey(val) {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/COM\d+/i);
  return match ? match[0].toUpperCase() : '';
}

export function formatPortDisplayName(rawName) {
  if (!rawName) return '';
  const clean = String(rawName).trim();
  const comMatch = clean.match(/COM\d+/i);
  if (!comMatch) return clean;
  const com = comMatch[0].toUpperCase();
  if (clean.toLowerCase().includes('communication') || com === 'COM1') {
    return `Communications Port (${com})`;
  }
  return `USB Serial Port (${com})`;
}

class UnifiedHardwarePortManager {
  constructor() {
    this._isServer = undefined;
  }

  /**
   * Check if native Web Serial API is supported in this browser
   */
  isSupported() {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Check if this browser is running on the Server Host PC (System 1)
   */
  isServerMachine() {
    if (this._isServer !== undefined) {
      return this._isServer;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('zenmeter_is_server_machine');
        if (saved !== null) {
          this._isServer = saved === 'true';
          return this._isServer;
        }
      } catch (_) { }
      const h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1';
    }
    return false;
  }

  /**
   * Get formatted list of COM ports for a given role and stage
   * ISOLATION RULE:
   * - System 1 (Server): Returns Windows Device Manager COM ports on System 1.
   * - System 2 (Client): Returns ONLY local WebSerial ports paired on System 2.
   * 
   * @param {string} role - 'optical', 'laser', 'jig', etc.
   * @param {number|string} stageId - e.g. 9, 8, 4
   * @param {string|null} otherConnectedPort - Port currently connected by another role on this stage
   * @param {string|null} currentConnectedPort - Port currently connected by this role
   */
  async getAvailablePorts(role = 'optical', stageId = null, otherConnectedPort = null, currentConnectedPort = null) {
    const list = [];
    const seenComKeys = new Set();
    const otherKey = otherConnectedPort ? extractComKey(otherConnectedPort) : null;
    const currentKey = currentConnectedPort ? extractComKey(currentConnectedPort) : null;

    // 1. Detect if this workstation is the Server Host PC (System 1) or a Remote Client (System 2)
    let isServer = false;
    let systemPorts = [];
    try {
      const res = await jigService.listUsbPorts();
      if (res && res.isServerMachine !== undefined) {
        isServer = Boolean(res.isServerMachine);
        this._isServer = isServer;
        try { sessionStorage.setItem('zenmeter_is_server_machine', String(isServer)); } catch (_) { }
      } else if (typeof window !== 'undefined') {
        const h = window.location.hostname;
        isServer = h === 'localhost' || h === '127.0.0.1';
        this._isServer = isServer;
      }

      // ONLY populate systemPorts if this is System 1 (Server PC)
      if (isServer) {
        if (res && Array.isArray(res.detailedPorts) && res.detailedPorts.length > 0) {
          systemPorts = res.detailedPorts;
        } else if (res && Array.isArray(res.ports)) {
          systemPorts = res.ports.map(p => ({
            path: p,
            friendlyName: formatPortDisplayName(p)
          }));
        }
      }
    } catch (_) {
      if (typeof window !== 'undefined') {
        const h = window.location.hostname;
        isServer = h === 'localhost' || h === '127.0.0.1';
        this._isServer = isServer;
      }
    }

    // 2. Scan WebSerial paired ports in the browser on THIS physical machine
    let webSerialPorts = [];
    if (this.isSupported()) {
      try {
        const ports = await navigator.serial.getPorts();
        // Exclude ports that Chromium flags as physically disconnected (Chrome 128+)
        webSerialPorts = (ports || []).filter(p => p && p.connected !== false);
      } catch (err) {
        console.warn('[UnifiedPortManager] Error querying paired ports:', err);
      }
    }

    // A. SYSTEM 1 SIDE: Add detected ports strictly from Windows Device Manager of the host machine
    if (isServer) {
      if (systemPorts.length > 0) {
        systemPorts.forEach(sp => {
          const rawName = sp.friendlyName || sp.shortName || sp.path;
          const comKey = extractComKey(rawName) || extractComKey(sp.path);
          if (!comKey || seenComKeys.has(comKey)) return;

          const cleanName = formatPortDisplayName(rawName);

          // Try to link matching WebSerial portObj if WebSerial has permission on System 1
          let matchingPortObj = null;
          if (webSerialPorts.length > 0) {
            matchingPortObj = webSerialPorts.find((wp, idx) => {
              if (wp.connected === false) return false;
              const info = wp.getInfo?.() || {};
              let devName = role === 'laser'
                ? laserWebSerialService.formatDeviceName(info, idx)
                : webSerialService.formatDeviceName(info, idx);
              if (extractComKey(devName) === comKey) return true;

              const vHex = info.usbVendorId ? info.usbVendorId.toString(16).toLowerCase() : '';
              const pHex = info.usbProductId ? info.usbProductId.toString(16).toLowerCase() : '';
              const spVid = sp.vendorId ? String(sp.vendorId).toLowerCase() : '';
              const spPid = sp.productId ? String(sp.productId).toLowerCase() : '';
              if (vHex && spVid && pHex && spPid && vHex.includes(spVid) && pHex.includes(spPid)) {
                return true;
              }
              if (webSerialPorts.length === 1 && comKey.toUpperCase() !== 'COM1') {
                return true;
              }
              return false;
            }) || null;
          }

          seenComKeys.add(comKey);

          const lock = hardwarePortLockService.checkLock(cleanName, stageId);
          const isOtherRoleTaken = Boolean(otherKey && comKey && otherKey === comKey);
          const isTaken = lock.isLocked || isOtherRoleTaken;
          const takenMsg = lock.isLocked ? ` (${lock.message})` : (isOtherRoleTaken ? ' (In use)' : '');

          list.push({
            value: cleanName,
            label: cleanName,
            portObj: matchingPortObj,
            isServerPort: true,
            isTaken,
            isReadOnly: lock.isReadOnly,
            takenMsg
          });
        });
      }
      // System 1 MUST NEVER add WebSerial ports that do not exist in Windows Device Manager!
    } else {
      // B. SYSTEM 2 SIDE (Client workstation): Include local paired ports physically present on THIS machine
      webSerialPorts.forEach((p, idx) => {
        if (p.connected === false) return;
        const info = p.getInfo?.() || {};
        // If device has no vendor/product ID, it is not an active USB serial device
        if (!info.usbVendorId && !info.usbProductId) {
          return;
        }

        let friendly = role === 'laser'
          ? laserWebSerialService.formatDeviceName(info, idx)
          : webSerialService.formatDeviceName(info, idx);

        let cleanName = formatPortDisplayName(friendly);
        if (!cleanName || cleanName.toLowerCase() === 'usb serial port') {
          cleanName = `USB Serial Port (Client${webSerialPorts.length > 1 ? ` #${idx + 1}` : ''})`;
        }

        const comKey = extractComKey(cleanName) || `PORT_${idx}`;
        if (comKey && seenComKeys.has(comKey)) {
          const existing = list.find(item => extractComKey(item.value) === comKey);
          if (existing && !existing.portObj) {
            existing.portObj = p;
          }
          return;
        }

        seenComKeys.add(comKey);

        const lock = hardwarePortLockService.checkLock(cleanName, stageId);
        const isOtherRoleTaken = Boolean(otherKey && comKey && otherKey === comKey);
        const isTaken = lock.isLocked || isOtherRoleTaken;
        const takenMsg = lock.isLocked ? ` (${lock.message})` : (isOtherRoleTaken ? ' (In use)' : '');

        list.push({
          value: cleanName,
          label: cleanName,
          portObj: p,
          isServerPort: false,
          isTaken,
          isReadOnly: lock.isReadOnly,
          takenMsg
        });
      });
    }

    // C. If currently connected port is active on this machine, ensure it remains in the list
    if (currentConnectedPort) {
      const cleanConn = formatPortDisplayName(currentConnectedPort);
      const cKey = extractComKey(cleanConn) || cleanConn;
      const exists = list.some(item => (extractComKey(item.value) || item.value) === cKey);
      // On the server PC, never inject a port that does not exist in Windows Device Manager!
      const isValidServerPort = isServer && systemPorts.some(sp => extractComKey(sp.path || sp.friendlyName) === cKey);
      if (!exists && cKey && (!isServer || isValidServerPort)) {
        list.unshift({
          value: cleanConn,
          label: cleanConn,
          portObj: null,
          isServerPort: isServer,
          isTaken: false,
          isReadOnly: false,
          takenMsg: ''
        });
      }
    }

    return list;
  }

  /**
   * Connect to a COM port
   * Works for both:
   * - System 1 (Server): Connects via Backend COM port or WebSerial
   * - System 2 (Client): Connects via WebSerial tunnel on System 2
   */
  async connectPort({
    role = 'optical',
    portName,
    stageId,
    stageName,
    portType = 'Hardware Port',
    config = {},
    operatorId = 'OPERATOR'
  }) {
    if (!portName) {
      throw new Error('Please select a COM port from the dropdown.');
    }

    const cleanPortName = formatPortDisplayName(portName);
    const comKey = extractComKey(cleanPortName);

    // Verify cross-stage lock
    const lock = hardwarePortLockService.checkLock(cleanPortName, stageId);
    if (lock.isLocked) {
      throw new Error(`Port ${cleanPortName} is ${lock.message}`);
    }

    const isServer = this.isServerMachine();

    // 1. Try to find a matching paired WebSerial port on THIS machine
    let portObj = null;
    if (this.isSupported()) {
      try {
        const ports = await navigator.serial.getPorts();
        if (ports && ports.length > 0) {
          portObj = ports.find((p, idx) => {
            const info = p.getInfo?.() || {};
            const name = role === 'laser'
              ? laserWebSerialService.formatDeviceName(info, idx)
              : webSerialService.formatDeviceName(info, idx);
            if (name === cleanPortName) return true;
            if (comKey && extractComKey(name) === comKey) return true;
            if (ports.length === 1 && comKey && comKey !== 'COM1') return true;
            return false;
          });

          // On System 2 (remote client): if exactly 1 paired port exists, use it!
          if (!portObj && !isServer && ports.length === 1) {
            portObj = ports[0];
          }
        }
      } catch (_) { }
    }

    // 2. If running on Server (System 1) and no WebSerial portObj, connect via Backend API
    if (!portObj && isServer) {
      const targetPort = comKey || cleanPortName;
      let serverRes = null;

      if (Number(stageId) === 8) {
        const stage08Module = await import('../stages/stage08.service');
        const s8Service = stage08Module.stage08Service || stage08Module.default;
        serverRes = await s8Service.connectOpticalPort({
          port: targetPort,
          baudRate: config.baudRate || 9600,
          dataBits: config.dataBits || 8,
          parity: config.parity || 'None',
          stopBits: config.stopBits || 1
        });
      } else if (Number(stageId) === 9) {
        const stage09Module = await import('../stages/stage09.service');
        const s9Service = stage09Module.stage09Service || stage09Module.default;
        if (role === 'laser') {
          serverRes = await s9Service.connectLaserPort({
            port: targetPort,
            baudRate: config.baudRate || 9600
          });
        } else {
          serverRes = await s9Service.connectOpticalPort({
            port: targetPort,
            baudRate: config.baudRate || 9600,
            dataBits: config.dataBits || 8,
            parity: config.parity || 'None',
            stopBits: config.stopBits || 1
          });
        }
      } else {
        serverRes = await jigService.connectHardware({
          port: targetPort,
          baudRate: config.baudRate || 9600
        });
      }

      // Claim lock
      hardwarePortLockService.claimLock(cleanPortName, {
        stageId,
        stageName: stageName || `Stage ${stageId}`,
        portType: portType || 'Optical Port'
      });

      const storageKey = role === 'laser'
        ? 'zenmeter_laser'
        : (role === 'jig' ? 'zenmeter_jig' : 'zenmeter_optical');
      try {
        localStorage.setItem(`${storageKey}_was_connected`, 'true');
        localStorage.setItem(`${storageKey}_last_port`, cleanPortName);
        localStorage.setItem(`${storageKey}_source`, 'server');
        localStorage.setItem(`${storageKey}_manual_disconnect`, 'false');
      } catch (_) { }

      return {
        success: true,
        portName: cleanPortName,
        source: 'server',
        details: serverRes
      };
    }

    // 3. Connect via WebSerial (System 2 or WebSerial on System 1)
    let result = null;

    if (role === 'laser') {
      if (portObj) {
        laserWebSerialService.saveDeviceRegistryName(portObj.getInfo?.() || {}, 0, cleanPortName);
        result = await laserWebSerialService.connectPort(portObj, { ...config, comPortLabel: cleanPortName });
      } else {
        result = await laserWebSerialService.requestPortAndConnect({ ...config, comPortLabel: cleanPortName });
      }

      hardwarePortLockService.claimLock(cleanPortName, {
        stageId,
        stageName: stageName || `Stage ${stageId}`,
        portType: portType || 'Laser Port'
      });

      try {
        localStorage.setItem(`zenmeter_laser_was_connected`, 'true');
        localStorage.setItem(`zenmeter_laser_last_port`, cleanPortName);
        localStorage.setItem(`zenmeter_laser_source`, 'client_webserial');
        localStorage.setItem(`zenmeter_laser_manual_disconnect`, 'false');
      } catch (_) { }

      return {
        success: true,
        portName: cleanPortName,
        source: 'client_webserial',
        details: result
      };

    } else {
      if (portObj) {
        webSerialService.saveDeviceRegistryName(portObj.getInfo?.() || {}, 0, cleanPortName);
        result = await webSerialService.connectPort(portObj, operatorId, {
          ...config,
          stageId,
          stageName: stageName || `Stage ${stageId}`,
          portType: portType || 'Optical Port',
          comPortLabel: cleanPortName
        });
      } else {
        result = await webSerialService.requestPortAndConnect(operatorId, {
          ...config,
          stageId,
          stageName: stageName || `Stage ${stageId}`,
          portType: portType || 'Optical Port',
          comPortLabel: cleanPortName
        });
      }

      hardwarePortLockService.claimLock(cleanPortName, {
        stageId,
        stageName: stageName || `Stage ${stageId}`,
        portType: portType || 'Optical Port'
      });

      const storageKey = role === 'jig' ? 'zenmeter_jig' : 'zenmeter_optical';
      try {
        localStorage.setItem(`${storageKey}_was_connected`, 'true');
        localStorage.setItem(`${storageKey}_last_port`, cleanPortName);
        localStorage.setItem(`${storageKey}_source`, 'client_webserial');
        localStorage.setItem(`${storageKey}_manual_disconnect`, 'false');
      } catch (_) { }

      return {
        success: true,
        portName: cleanPortName,
        tunnelId: result?.tunnelId,
        source: 'client_webserial',
        details: result
      };
    }
  }

  /**
   * Disconnect port and release lock
   */
  async disconnectPort({ role = 'optical', portName = null, stageId = null }) {
    if (role === 'laser') {
      await laserWebSerialService.disconnect();
      if (portName) hardwarePortLockService.releaseLock(portName);
      try {
        localStorage.setItem(`zenmeter_laser_was_connected`, 'false');
        localStorage.setItem(`zenmeter_laser_manual_disconnect`, 'true');
      } catch (_) { }
    } else {
      await webSerialService.disconnect();

      // If server port connection, also call server disconnect API
      if (this.isServerMachine() && stageId) {
        try {
          if (Number(stageId) === 8) {
            const stage08Module = await import('../stages/stage08.service');
            const s8 = stage08Module.stage08Service || stage08Module.default;
            await s8.disconnectOpticalPort({ port: portName });
          } else if (Number(stageId) === 9) {
            const stage09Module = await import('../stages/stage09.service');
            const s9 = stage09Module.stage09Service || stage09Module.default;
            await s9.disconnectOpticalPort({ port: portName });
          }
        } catch (_) { }
      }

      if (portName) hardwarePortLockService.releaseLock(portName);
      const storageKey = role === 'jig' ? 'zenmeter_jig' : 'zenmeter_optical';
      try {
        localStorage.setItem(`${storageKey}_was_connected`, 'false');
        localStorage.setItem(`${storageKey}_manual_disconnect`, 'true');
      } catch (_) { }
    }
  }

  /**
   * Pair a brand new port directly from Chrome device picker on THIS workstation
   */
  async pairNewPort(role = 'optical', assignedComName = '') {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is only supported in Google Chrome or Microsoft Edge.');
    }
    const port = await navigator.serial.requestPort();
    if (!port) return null;

    const info = port.getInfo?.() || {};
    let cleanName = assignedComName ? formatPortDisplayName(assignedComName) : '';

    if (!cleanName) {
      // Optional prompt for operator to label matching COM number from Device Manager (e.g. COM1)
      const isServer = this.isServerMachine();
      let promptDefault = '';
      let userInput = null;
      try {
        userInput = window.prompt(
          `Enter COM port number from Windows Device Manager for ${isServer ? 'System 1' : 'System 2'} (e.g. COM1) or leave blank:`,
          promptDefault
        );
      } catch (_) { }

      if (userInput && userInput.trim()) {
        cleanName = formatPortDisplayName(userInput.trim());
      }
    }

    if (!cleanName) {
      cleanName = this.isServerMachine() ? 'USB Serial Port (Server)' : 'USB Serial Port (System 2)';
    }

    if (role === 'laser') {
      laserWebSerialService.saveDeviceRegistryName(info, 0, cleanName);
    } else {
      webSerialService.saveDeviceRegistryName(info, 0, cleanName);
    }

    return {
      port,
      friendlyName: cleanName
    };
  }

  /**
   * Auto-reconnect on page reload (F5) without disconnecting
   */
  async restorePortOnMount({
    role = 'optical',
    stageId,
    stageName,
    portType,
    config = {},
    operatorId = 'OPERATOR'
  }) {
    if (!this.isSupported()) return null;

    const storageKey = role === 'laser'
      ? 'zenmeter_laser'
      : (role === 'jig' ? 'zenmeter_jig' : 'zenmeter_optical');

    let wasConnected = false;
    let manualDisconnect = false;
    let lastPort = null;

    try {
      wasConnected = localStorage.getItem(`${storageKey}_was_connected`) === 'true';
      manualDisconnect = localStorage.getItem(`${storageKey}_manual_disconnect`) === 'true';
      lastPort = localStorage.getItem(`${storageKey}_last_port`);
    } catch (_) { }

    if (!wasConnected || manualDisconnect || !lastPort) {
      return null;
    }

    try {
      return await this.connectPort({
        role,
        portName: lastPort,
        stageId,
        stageName,
        portType,
        config,
        operatorId
      });
    } catch (e) {
      console.warn(`[UnifiedPortManager] Restore ${role} failed:`, e.message);
      return null;
    }
  }

  /**
   * Setup physical cable disconnect and connect watchers
   */
  setupHardwareListeners(onChanged) {
    if (!this.isSupported()) return () => {};

    const handleEvent = () => {
      if (onChanged) onChanged();
    };

    try {
      navigator.serial.addEventListener('connect', handleEvent);
      navigator.serial.addEventListener('disconnect', handleEvent);
      return () => {
        navigator.serial.removeEventListener('connect', handleEvent);
        navigator.serial.removeEventListener('disconnect', handleEvent);
      };
    } catch (_) {
      return () => {};
    }
  }

  setupDisconnectWatcher(role = 'optical', onUnplugged) {
    if (!this.isSupported()) return () => {};

    const handleDisconnect = async (event) => {
      const port = event.port || event.target;
      const targetService = role === 'laser' ? laserWebSerialService : webSerialService;

      if (targetService.port && (targetService.port === port || !await targetService.checkPortStillConnected?.())) {
        await this.disconnectPort({ role, portName: targetService.portName });
        if (onUnplugged) onUnplugged();
      }
    };

    try {
      navigator.serial.addEventListener('disconnect', handleDisconnect);
      return () => {
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      };
    } catch (_) {
      return () => {};
    }
  }
}

export const unifiedHardwarePortManager = new UnifiedHardwarePortManager();
export default unifiedHardwarePortManager;
