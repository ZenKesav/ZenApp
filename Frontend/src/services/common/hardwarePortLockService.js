/**
 * HardwarePortLockService
 * Coordinates COM port access across different browser tabs and stages on the same machine.
 * 
 * Rules:
 * 1. A physical COM port can only be opened by ONE stage at a time.
 * 2. If Stage 9 connects to COM3, other stages (Stage 8, Stage 4) on the same machine
 *    will detect that COM3 is locked and display:
 *    "USB Serial Port (COM3) - In use by Stage 9 (Read-Only)" with connection disabled.
 * 3. When Stage 9 disconnects or closes the tab, the lock is immediately released.
 */

const CHANNEL_NAME = 'zenmeter_port_lock_channel';
const STORAGE_KEY = 'zenmeter_active_port_locks';

function generateTabId() {
  if (typeof window === 'undefined') return 'server_tab';
  let tid = window.sessionStorage?.getItem('zenmeter_tab_id');
  if (!tid) {
    tid = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    try { window.sessionStorage?.setItem('zenmeter_tab_id', tid); } catch (_) { }
  }
  return tid;
}

export function extractPortIdentifier(val) {
  if (!val) return '';
  const str = String(val).trim();
  const comMatch = str.match(/COM\d+/i);
  if (comMatch) return comMatch[0].toUpperCase();
  return str.toUpperCase();
}

class HardwarePortLockService {
  constructor() {
    this.tabId = generateTabId();
    this.listeners = new Set();
    this.channel = null;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.handleChannelMessage(event.data);
        };
      } catch (e) {
        console.warn('[PortLockService] BroadcastChannel unavailable, using storage fallback:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.notify();
        }
      });

      // Maintain active lock heartbeat and do not aggressively drop locks on F5 refresh
      setInterval(() => {
        this.heartbeatOwnLocks();
      }, 10000);
    }
  }

  heartbeatOwnLocks() {
    const locks = this.getStoredLocks();
    let changed = false;
    const now = Date.now();
    for (const [key, lock] of Object.entries(locks)) {
      if (lock && lock.tabId === this.tabId) {
        lock.timestamp = now;
        changed = true;
      }
    }
    if (changed) {
      this.saveLocks(locks);
    }
  }

  handleChannelMessage(data) {
    if (!data) return;
    this.notify();
  }

  getStoredLocks() {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const now = Date.now();
      const valid = {};
      let changed = false;

      // Clean up stale locks older than 60 seconds (in case of browser crash)
      for (const [key, lock] of Object.entries(parsed)) {
        if (lock && lock.timestamp && (now - lock.timestamp < 60000)) {
          valid[key] = lock;
        } else {
          changed = true;
        }
      }

      if (changed) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(valid)); } catch (_) { }
      }
      return valid;
    } catch (_) {
      return {};
    }
  }

  saveLocks(locks) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
    } catch (_) { }
  }

  /**
   * Claim exclusive lock for a port on this machine
   * @param {string} portName (e.g. 'COM3' or 'USB Serial Port (COM3)')
   * @param {object} metadata { stageId: 9, stageName: 'Stage 9', portType: 'Optical Port' }
   */
  claimLock(portName, metadata = {}) {
    const portKey = extractPortIdentifier(portName);
    if (!portKey) return false;

    const locks = this.getStoredLocks();
    const existing = locks[portKey];

    // If locked by another stage on another tab, deny
    if (existing && existing.tabId !== this.tabId && String(existing.stageId) !== String(metadata.stageId)) {
      return false;
    }

    locks[portKey] = {
      portKey,
      portName: portName || portKey,
      tabId: this.tabId,
      stageId: metadata.stageId || 'Unknown',
      stageName: metadata.stageName || (metadata.stageId ? `Stage ${metadata.stageId}` : 'Stage'),
      portType: metadata.portType || 'Hardware Port',
      timestamp: Date.now()
    };

    this.saveLocks(locks);
    this.broadcastMessage({ type: 'PORT_LOCKED', portKey, lock: locks[portKey] });
    this.notify();
    return true;
  }

  /**
   * Release lock for a port
   */
  releaseLock(portName) {
    const portKey = extractPortIdentifier(portName);
    if (!portKey) return;

    const locks = this.getStoredLocks();
    if (locks[portKey] && locks[portKey].tabId === this.tabId) {
      delete locks[portKey];
      this.saveLocks(locks);
      this.broadcastMessage({ type: 'PORT_UNLOCKED', portKey });
      this.notify();
    }
  }

  /**
   * Release all locks owned by this tab
   */
  releaseAllTabLocks() {
    const locks = this.getStoredLocks();
    let changed = false;
    for (const [key, lock] of Object.entries(locks)) {
      if (lock && lock.tabId === this.tabId) {
        delete locks[key];
        changed = true;
      }
    }
    if (changed) {
      this.saveLocks(locks);
      this.broadcastMessage({ type: 'TAB_CLEANUP', tabId: this.tabId });
    }
  }

  /**
   * Check if port is locked by another stage
   * @param {string} portName
   * @param {number|string} currentStageId
   * @returns { isLocked: boolean, ownerStage: string, ownerPortType: string, isReadOnly: boolean }
   */
  checkLock(portName, currentStageId = null) {
    const portKey = extractPortIdentifier(portName);
    if (!portKey) return { isLocked: false, isReadOnly: false };

    const locks = this.getStoredLocks();
    const lock = locks[portKey];
    if (!lock) return { isLocked: false, isReadOnly: false };

    // Locked if owned by another stage (or another tab)
    const isOtherStage = currentStageId !== null && String(lock.stageId) !== String(currentStageId);
    const isOtherTab = lock.tabId !== this.tabId;

    if (isOtherStage || (isOtherTab && isOtherStage)) {
      return {
        isLocked: true,
        isReadOnly: true,
        ownerStage: lock.stageName || `Stage ${lock.stageId}`,
        ownerPortType: lock.portType || 'Port',
        message: `In use by ${lock.stageName} (${lock.portType}) - Read Only`
      };
    }

    return { isLocked: false, isReadOnly: false };
  }

  broadcastMessage(msg) {
    if (this.channel) {
      try { this.channel.postMessage(msg); } catch (_) { }
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const allLocks = this.getStoredLocks();
    this.listeners.forEach(cb => {
      try { cb(allLocks); } catch (_) { }
    });
  }
}

export const hardwarePortLockService = new HardwarePortLockService();
export default hardwarePortLockService;
