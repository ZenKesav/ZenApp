const redisClient = require('./redisClient');

class RedisLock {
  /**
   * Acquire a distributed lock for a Jig Station or Meter test session
   */
  static async acquireLock(lockKey, ttlSeconds = 30) {
    const key = `lock:${lockKey}`;
    const existing = await redisClient.get(key);
    if (existing) {
      return false; // Already locked
    }
    await redisClient.set(key, { lockedAt: Date.now(), by: 'jig_station' }, ttlSeconds);
    return true;
  }

  /**
   * Release the distributed lock
   */
  static async releaseLock(lockKey) {
    const key = `lock:${lockKey}`;
    await redisClient.del(key);
    return true;
  }
}

module.exports = RedisLock;
