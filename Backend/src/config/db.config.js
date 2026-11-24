const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

module.exports = {
  host: process.env.DB_HOST || '192.168.20.7',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'ZenmeterApplication',
  password: process.env.DB_PASSWORD || '@Kesavk7',
  database: process.env.DB_NAME || 'Zenmeter',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};
