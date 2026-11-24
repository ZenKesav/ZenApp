const path = require('path');
const fs = require('fs');

const LOGS_DIR = path.resolve(__dirname, '../../logs');
const STAGES_LOGS_DIR = path.join(LOGS_DIR, 'stages');

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
if (!fs.existsSync(STAGES_LOGS_DIR)) fs.mkdirSync(STAGES_LOGS_DIR, { recursive: true });

function writeToFile(filePath, logLine) {
  try {
    fs.appendFileSync(filePath, logLine + '\n', 'utf8');
  } catch (e) {
    // Silently continue if log write fails
  }
}

const appLogPath = path.join(LOGS_DIR, 'app.log');
const errorLogPath = path.join(LOGS_DIR, 'error.log');

const logger = {
  info: (msg, meta = '') => {
    const time = new Date().toISOString();
    const formatted = `[INFO] [${time}] ${msg} ${meta ? (typeof meta === 'object' ? JSON.stringify(meta) : meta) : ''}`;
    console.log(formatted);
    writeToFile(appLogPath, formatted);
  },
  warn: (msg, meta = '') => {
    const time = new Date().toISOString();
    const formatted = `[WARN] [${time}] ${msg} ${meta ? (typeof meta === 'object' ? JSON.stringify(meta) : meta) : ''}`;
    console.warn(formatted);
    writeToFile(appLogPath, formatted);
  },
  error: (msg, meta = '') => {
    const time = new Date().toISOString();
    const formatted = `[ERROR] [${time}] ${msg} ${meta ? (typeof meta === 'object' ? JSON.stringify(meta) : meta) : ''}`;
    console.error(formatted);
    writeToFile(errorLogPath, formatted);
  },
  debug: (msg, meta = '') => {
    const time = new Date().toISOString();
    const formatted = `[DEBUG] [${time}] ${msg} ${meta ? (typeof meta === 'object' ? JSON.stringify(meta) : meta) : ''}`;
    console.log(formatted);
  },
  stage: (stageNumber, msg, meta = '') => {
    const time = new Date().toISOString();
    const today = time.slice(0, 10);
    const stagePrefix = String(stageNumber).padStart(2, '0');
    const stageLogFile = path.join(STAGES_LOGS_DIR, `stage${stagePrefix}-${today}.log`);
    const formatted = `[STAGE-${stagePrefix}] [${time}] ${msg} ${meta ? (typeof meta === 'object' ? JSON.stringify(meta) : meta) : ''}`;
    console.log(formatted);
    writeToFile(stageLogFile, formatted);
  }
};

module.exports = logger;
