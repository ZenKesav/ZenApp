const { WebSocketServer } = require('ws');
const { EventEmitter } = require('events');
const logger = require('../../config/logger.config');

let wss = null;
const clients = new Set();
const opticalTunnels = new Map();

function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('error', (err) => {
    logger.warn(`[WebSocketServer] ${err.message}`);
  });

  wss.on('connection', (ws, req) => {
    logger.info(`WebSocket Client connected from ${req.socket.remoteAddress}`);
    clients.add(ws);

    ws.send(JSON.stringify({
      event: 'CONNECTED',
      message: 'Connected to Zenmeter Realtime Event Gateway',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        logger.debug('Received WebSocket message:', parsed);

        // Hardware command router
        if (parsed.type === 'HARDWARE_CMD' || parsed.command) {
          const cmd = (parsed.command || parsed.cmd || '').toUpperCase();
          if (cmd === 'START') {
            ws.send(JSON.stringify({ event: 'ACK', command: 'START', status: 'ACK', timestamp: new Date().toISOString() }));
          } else if (cmd === 'GET_DATA') {
            const SerialManager = require('../../modules/stages/stage04-nic-inside-print/hardware/serialManager');
            const status = SerialManager.getStatus();
            ws.send(JSON.stringify({ event: 'HARDWARE_STATUS', command: 'GET_DATA', data: status, timestamp: new Date().toISOString() }));
          }
        }

        // --- Optical DLMS Web Serial Tunnel Protocol ---
        if (parsed.type === 'OPTICAL_TUNNEL_REGISTER' && parsed.tunnelId) {
          const tunnel = new EventEmitter();
          tunnel.tunnelId = parsed.tunnelId;
          tunnel.deviceId = parsed.deviceId || null;
          tunnel.portName = parsed.portName || 'Client Optical Port';
          tunnel.operatorId = parsed.operatorId || 'OPERATOR';
          tunnel.isOpen = true;
          tunnel.isTunnel = true;
          tunnel.ws = ws;

          tunnel.write = (buffer, cb) => {
            if (ws.readyState === 1) { // OPEN
              const dataHex = Buffer.isBuffer(buffer) ? buffer.toString('hex') : Buffer.from(buffer).toString('hex');
              ws.send(JSON.stringify({
                event: 'OPTICAL_TUNNEL_TX',
                tunnelId: parsed.tunnelId,
                dataHex
              }));
              if (cb) cb();
            } else if (cb) {
              cb(new Error('Optical tunnel WebSocket disconnected'));
            }
          };

          tunnel.set = (signals, cb) => {
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({
                event: 'OPTICAL_TUNNEL_SIGNALS',
                tunnelId: parsed.tunnelId,
                signals
              }));
              if (cb) cb();
            } else if (cb) {
              cb(new Error('Optical tunnel WebSocket disconnected'));
            }
          };

          tunnel.close = (cb) => {
            tunnel.isOpen = false;
            if (cb) cb();
          };

          opticalTunnels.set(parsed.tunnelId, tunnel);
          ws.opticalTunnelId = parsed.tunnelId;
          logger.info(`[WebSocket] Optical tunnel registered: ${parsed.tunnelId} (${tunnel.portName}) for deviceId=${tunnel.deviceId}`);

          ws.send(JSON.stringify({
            event: 'OPTICAL_TUNNEL_REGISTERED',
            tunnelId: parsed.tunnelId,
            deviceId: tunnel.deviceId,
            portName: tunnel.portName,
            timestamp: new Date().toISOString()
          }));
        }

        if (parsed.type === 'OPTICAL_TUNNEL_RX' && parsed.tunnelId && parsed.dataHex) {
          const tunnel = opticalTunnels.get(parsed.tunnelId);
          if (tunnel && tunnel.isOpen) {
            if (tunnel.ws === ws) {
              const chunk = Buffer.from(parsed.dataHex, 'hex');
              tunnel.emit('data', chunk);
            } else {
              logger.warn(`[WebSocket] Rejected RX data for tunnel ${parsed.tunnelId}: unauthorized sender.`);
            }
          }
        }

        if (parsed.type === 'OPTICAL_TUNNEL_UNREGISTER' && parsed.tunnelId) {
          const tunnel = opticalTunnels.get(parsed.tunnelId);
          if (tunnel) {
            tunnel.isOpen = false;
            tunnel.emit('close');
            opticalTunnels.delete(parsed.tunnelId);
            logger.info(`[WebSocket] Optical tunnel unregistered: ${parsed.tunnelId}`);
          }
        }
      } catch (err) {
        logger.warn('Malformed WebSocket message received:', err.message);
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket Client disconnected');
      if (ws.opticalTunnelId) {
        const tunnel = opticalTunnels.get(ws.opticalTunnelId);
        if (tunnel) {
          tunnel.isOpen = false;
          tunnel.emit('close');
          opticalTunnels.delete(ws.opticalTunnelId);
          logger.info(`[WebSocket] Optical tunnel closed on client disconnect: ${ws.opticalTunnelId}`);
        }
      }
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      logger.error('WebSocket Error:', err);
      if (ws.opticalTunnelId) {
        opticalTunnels.delete(ws.opticalTunnelId);
      }
      clients.delete(ws);
    });
  });

  logger.info(`WebSocket Server attached on path /ws`);
  return wss;
}

function broadcast(eventType, payload) {
  const message = JSON.stringify({
    event: eventType,
    data: payload,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

function getOpticalTunnel(tunnelId, deviceId = null) {
  if (!tunnelId) return null;
  const tunnel = opticalTunnels.get(tunnelId) || null;
  if (!tunnel || !tunnel.isOpen) return null;
  if (deviceId && tunnel.deviceId && tunnel.deviceId !== deviceId) {
    logger.warn(`[WebSocket] Optical tunnel access rejected: tunnel ${tunnelId} belongs to device ${tunnel.deviceId}, requested by ${deviceId}`);
    return null;
  }
  return tunnel;
}

function listOpticalTunnels() {
  return Array.from(opticalTunnels.values()).map(t => ({
    tunnelId: t.tunnelId,
    portName: t.portName,
    operatorId: t.operatorId
  }));
}

function broadcastLiveMetrics(payload) {
  const event = payload?.event || 'METRICS_UPDATE';
  broadcast(event, payload);
}

module.exports = {
  initWebSocketServer,
  broadcast,
  broadcastLiveMetrics,
  getOpticalTunnel,
  listOpticalTunnels,
  clients
};
