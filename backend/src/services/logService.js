/**
 * Log Service
 * Fetches logs from journalctl
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../config');
const logger = require('../utils/logger');
const { getServiceName } = require('./systemdService');

const execAsync = promisify(exec);

/**
 * Parse log priority to level string
 */
const priorityToLevel = (priority) => {
  const p = parseInt(priority, 10);
  if (p <= 3) return 'error';   // emerg, alert, crit, err
  if (p <= 4) return 'warn';    // warning
  if (p <= 6) return 'info';    // notice, info
  return 'debug';               // debug
};

/**
 * Parse JSON log entry from journalctl
 */
const parseLogEntry = (jsonLine) => {
  try {
    const entry = JSON.parse(jsonLine);
    return {
      timestamp: new Date(parseInt(entry.__REALTIME_TIMESTAMP, 10) / 1000).toISOString(),
      level: priorityToLevel(entry.PRIORITY),
      message: entry.MESSAGE || '',
      unit: entry._SYSTEMD_UNIT || '',
      pid: entry._PID ? parseInt(entry._PID, 10) : null,
    };
  } catch (e) {
    return null;
  }
};

/**
 * Get logs for a service
 */
const getLogs = async (channelId, serviceType, options = {}) => {
  const serviceName = getServiceName(channelId, serviceType);
  const { 
    lines = 100, 
    since, 
    until,
    level,
  } = options;
  
  // Build journalctl command
  const args = [
    'journalctl',
    `-u ${serviceName}`,
    `-n ${lines}`,
    '--no-pager',
    '-o json',
    '--output-fields=__REALTIME_TIMESTAMP,PRIORITY,MESSAGE,_SYSTEMD_UNIT,_PID',
  ];
  
  if (since) {
    args.push(`--since="${since}"`);
  }
  
  if (until) {
    args.push(`--until="${until}"`);
  }
  
  // Priority filter (0-7, where 3=error, 4=warning, 6=info, 7=debug)
  if (level) {
    const levelToPriority = {
      error: '0..3',
      warn: '0..4',
      info: '0..6',
      debug: '0..7',
    };
    if (levelToPriority[level]) {
      args.push(`-p ${levelToPriority[level]}`);
    }
  }
  
  const cmd = args.join(' ');
  logger.debug(`Fetching logs: ${cmd}`);
  
  try {
    const { stdout } = await execAsync(cmd, { 
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    // Parse JSON lines
    const logs = [];
    for (const line of stdout.split('\n')) {
      if (line.trim()) {
        const entry = parseLogEntry(line);
        if (entry) {
          logs.push(entry);
        }
      }
    }
    
    return logs;
  } catch (error) {
    // journalctl returns exit code 1 when no logs found
    if (error.code === 1 && !error.stderr) {
      return [];
    }
    
    logger.error(`Failed to fetch logs for ${serviceName}:`, error.message);
    throw new Error(`Failed to fetch logs: ${error.message}`);
  }
};

/**
 * Stream logs in real-time (returns child process)
 * For WebSocket implementation
 */
const streamLogs = (channelId, serviceType, onLog, onError) => {
  const serviceName = getServiceName(channelId, serviceType);
  
  const { spawn } = require('child_process');
  
  const child = spawn('journalctl', [
    '-u', serviceName,
    '-f', // follow
    '-o', 'json',
    '--output-fields=__REALTIME_TIMESTAMP,PRIORITY,MESSAGE,_SYSTEMD_UNIT,_PID',
  ]);
  
  let buffer = '';
  
  child.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        const entry = parseLogEntry(line);
        if (entry) {
          onLog(entry);
        }
      }
    }
  });
  
  child.stderr.on('data', (data) => {
    onError(new Error(data.toString()));
  });
  
  child.on('error', onError);
  
  // Return stop function
  return () => {
    child.kill('SIGTERM');
  };
};

module.exports = {
  getLogs,
  streamLogs,
};
