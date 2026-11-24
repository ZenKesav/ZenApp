const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

module.exports = {
  PORT: parseInt(process.env.PORT || '5555', 10),
  WS_PORT: parseInt(process.env.WS_PORT || process.env.PORT || '5555', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Zebra Scanner Configuration
  ZEBRA_DEVICE_NAME: process.env.ZEBRA_DEVICE_NAME || 'Zebra USB Barcode Scanner (Cable)',

  // Optical DLMS / Gurux Configuration & OBIS Codes
  DLMS_BAUD_RATE: parseInt(process.env.DLMS_BAUD_RATE || '9600', 10),
  DLMS_CLIENT_ADDRESS: Number(process.env.DLMS_CLIENT_ADDRESS) || 0x20,
  DLMS_SERVER_ADDRESS: Number(process.env.DLMS_SERVER_ADDRESS) || 1,
  DLMS_AUTH_LEVEL: parseInt(process.env.DLMS_AUTH_LEVEL || '1', 10),
  DLMS_SECURITY_LEVEL: Number(process.env.DLMS_SECURITY_LEVEL) || 0x30,
  DLMS_PASSWORD: process.env.DLMS_PASSWORD || 'hello',
  DLMS_SYSTEM_TITLE: process.env.DLMS_SYSTEM_TITLE || '5A454E3132333435',
  DLMS_BLOCK_CIPHER_KEY: process.env.DLMS_BLOCK_CIPHER_KEY || '30313233343536373839414243444546',
  DLMS_AUTH_KEY: process.env.DLMS_AUTH_KEY || '30313233343536373839414243444546',
  DLMS_OBIS_METER_SERIAL: process.env.DLMS_OBIS_METER_SERIAL || '0.0.96.1.0.255',
  DLMS_OBIS_DEVICE_NO: process.env.DLMS_OBIS_DEVICE_NO || '0.0.96.1.2.255',
  DLMS_OBIS_IMEI: process.env.DLMS_OBIS_IMEI || '0.0.155.1.2.255',
  DLMS_OBIS_NIC_SR: process.env.DLMS_OBIS_NIC_SR || '0.0.2.128.3.255',

  // Multi-Developer & Stage Pipeline Interlock Configuration
  ENABLE_STAGE_INTERLOCK: process.env.ENABLE_STAGE_INTERLOCK !== 'false' && process.env.STAGE_INTERLOCK_ENABLED !== 'false'
};
