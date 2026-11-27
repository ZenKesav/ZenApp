const os = require('os');

/**
 * Checks whether an incoming HTTP request originated from the local server machine (System 1)
 * or from a remote client computer on the network (System 2, System 3, etc.).
 * 
 * @param {import('express').Request} req
 * @returns {boolean} true if request came from the same machine where the server runs (System 1)
 */
function isRequestFromLocalServer(req) {
  if (!req) return false;

  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '');
  const cleanIp = String(rawIp).replace(/^::ffff:/, '').replace(/^.*:/, '').trim();

  // 1. Direct loopback addresses
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === 'localhost' ||
    cleanIp === '::1' ||
    rawIp === '127.0.0.1' ||
    rawIp === '::1' ||
    rawIp === '::ffff:127.0.0.1'
  ) {
    return true;
  }

  // 2. Server's own network interface addresses (LAN IP accessed from the server itself)
  try {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceKey of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[interfaceKey]) {
        if (net && (net.address === cleanIp || net.address === rawIp)) {
          return true;
        }
      }
    }
  } catch (_) { }

  return false;
}

module.exports = {
  isRequestFromLocalServer
};
