/**
 * NIC Test Jig Hardware Driver
 * Handles WebSerial communication and USB port interaction for Stage 4 NIC Testing Jig.
 */

export class NicJigDriver {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
  }

  isWebSerialSupported() {
    return 'serial' in navigator;
  }

  async requestPort() {
    if (!this.isWebSerialSupported()) {
      throw new Error('WebSerial API is not supported in this browser. Please use Google Chrome or Edge.');
    }
    try {
      this.port = await navigator.serial.requestPort();
      return this.port;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        throw new Error('No port selected by user.');
      }
      throw err;
    }
  }

  async connect(options = { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' }) {
    if (!this.port) {
      throw new Error('No port available. Please request a port first.');
    }
    await this.port.open(options);
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } finally {
      this.isConnected = false;
    }
  }
}

export const nicJigDriver = new NicJigDriver();
export default nicJigDriver;
