require('dotenv').config();
const http = require('http');
const os = require('os');
const app = require('./app');
const appConfig = require('./config/app.config');
const logger = require('./config/logger.config');
const { initDatabase } = require('./core/database/connection');
const { initWebSocketServer } = require('./core/services/socket.service');

const PORT = appConfig.PORT || 5555;

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  try {
    // 1. Initialize Database Connection & Tables
    await initDatabase();

    // 2. Create HTTP Server wrapping Express App
    const server = http.createServer(app);

    // 3. Attach Realtime WebSocket Gateway
    initWebSocketServer(server);

    // Handle port binding and startup errors gracefully
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`[EADDRINUSE] Port ${PORT} is already occupied by another process.`);
        logger.error(`To release port ${PORT}, run in PowerShell:`);
        logger.error(`Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
      } else {
        logger.error('Zenmeter Server error:', err);
      }
      process.exit(1);
    });

    // 4. Start Server Listener on 0.0.0.0 (all network interfaces)
    server.listen(PORT, '0.0.0.0', () => {
      const networkIp = getLocalIpAddress();
      logger.info(`=======================================================`);
      logger.info(`🚀 ZENMETER ENTERPRISE MES ENGINE ONLINE (NewBackend)`);
      logger.info(`📡 Local REST API:     http://localhost:${PORT}/api/v1`);
      logger.info(`🌐 Network REST API:   http://${networkIp}:${PORT}/api/v1`);
      logger.info(`🔌 Local WebSocket:    ws://localhost:${PORT}/ws`);
      logger.info(`🌐 Network WebSocket:  ws://${networkIp}:${PORT}/ws`);
      logger.info(`=======================================================`);
    });
  } catch (err) {
    logger.error('Failed to start Zenmeter Server:', err);
    process.exit(1);
  }
}

bootstrap();
