const net = require('net');
const logger = require('../../../../config/logger.config');

const ZebraPrinterService = {

  /**
   * Send raw ZPL / PRN commands to network Zebra/TSC printer over TCP socket (Port 9100)
   */
  async sendPrintJob(printerIp, printerPort = 9100, zplPayload = '') {
    return new Promise((resolve, reject) => {
      if (!printerIp) {
        return reject(new Error('Printer IP address is required.'));
      }

      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(printerPort, printerIp, () => {
        logger.info(`Connected to Zebra printer at ${printerIp}:${printerPort}`);
        client.write(zplPayload, 'utf8', () => {
          client.end();
          resolve({ success: true, message: 'Print job dispatched successfully.' });
        });
      });

      client.on('error', (err) => {
        logger.error(`Printer connection error to ${printerIp}:`, err.message);
        client.destroy();
        reject(err);
      });

      client.on('timeout', () => {
        logger.error(`Printer connection timed out to ${printerIp}`);
        client.destroy();
        reject(new Error('Connection to printer timed out.'));
      });
    });
  }

};

module.exports = ZebraPrinterService;
