// Low-Level WebSerial API driver (DO NOT EDIT BY STAGE DEVS)
export class WebSerialDriver {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
  }
  async requestPort() {
    if (!('serial' in navigator)) throw new Error('WebSerial not supported');
    this.port = await navigator.serial.requestPort();
    return this.port;
  }
  async open(baudRate = 9600) {
    if (!this.port) throw new Error('No port selected');
    await this.port.open({ baudRate });
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }
  async write(data) {
    if (!this.writer) throw new Error('Writer not open');
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(data));
  }
  async close() {
    if (this.reader) await this.reader.cancel();
    if (this.writer) await this.writer.close();
    if (this.port) await this.port.close();
  }
}
