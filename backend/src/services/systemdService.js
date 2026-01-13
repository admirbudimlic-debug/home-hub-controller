/**
 * systemd Service Control
 * Wraps systemctl commands for service management
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../config');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Get service unit name for a channel and service type
 */
const getServiceName = (channelId, serviceType) => {
  const pattern = config.servicePatterns[serviceType];
  if (!pattern) {
    throw new Error(`Unknown service type: ${serviceType}`);
  }
  return pattern.replace('{port}', channelId.toString());
};

/**
 * Check if systemd is available
 */
const checkSystemd = async () => {
  try {
    await execAsync('systemctl --version');
    return true;
  } catch (error) {
    throw new Error('systemd not available on this system');
  }
};

/**
 * Execute a systemctl command
 */
const systemctl = async (command, serviceName, useSudo = true) => {
  const cmd = useSudo 
    ? `sudo systemctl ${command} ${serviceName}` 
    : `systemctl ${command} ${serviceName}`;
  
  logger.debug(`Executing: ${cmd}`);
  
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    // Some commands (like is-active) return non-zero exit codes for stopped services
    if (command === 'is-active' && error.stdout) {
      return { stdout: error.stdout.trim(), stderr: '' };
    }
    throw error;
  }
};

/**
 * Parse systemctl show output into object
 */
const parseShowOutput = (output) => {
  const result = {};
  for (const line of output.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key) {
      result[key] = valueParts.join('=');
    }
  }
  return result;
};

/**
 * Calculate uptime from ActiveEnterTimestamp
 */
const calculateUptime = (timestamp) => {
  if (!timestamp || timestamp === 'n/a' || timestamp === '') return null;
  
  try {
    const startTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - startTime;
    
    if (diffMs < 0) return null;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  } catch (e) {
    return null;
  }
};

/**
 * Get detailed service status
 */
const getServiceStatus = async (channelId, serviceType) => {
  const serviceName = getServiceName(channelId, serviceType);
  
  try {
    // Get active state
    const { stdout: activeState } = await systemctl('is-active', serviceName, false);
    
    // Get detailed properties
    const { stdout: showOutput } = await systemctl(
      'show --property=MainPID,ActiveEnterTimestamp,MemoryCurrent,LoadState,SubState',
      serviceName,
      false
    );
    
    const props = parseShowOutput(showOutput);
    
    // Parse status
    let status = 'stopped';
    if (activeState === 'active') status = 'running';
    else if (activeState === 'activating') status = 'starting';
    else if (activeState === 'deactivating') status = 'stopping';
    else if (activeState === 'failed') status = 'error';
    else if (props.LoadState === 'not-found') status = 'not-found';
    
    // Parse memory (comes in bytes)
    let memoryMB = null;
    if (props.MemoryCurrent && props.MemoryCurrent !== '[not set]') {
      const bytes = parseInt(props.MemoryCurrent, 10);
      if (!isNaN(bytes)) {
        memoryMB = Math.round(bytes / (1024 * 1024));
      }
    }
    
    return {
      status,
      serviceName,
      pid: props.MainPID !== '0' ? parseInt(props.MainPID, 10) : null,
      uptime: calculateUptime(props.ActiveEnterTimestamp),
      memory: memoryMB,
      subState: props.SubState,
    };
  } catch (error) {
    logger.warn(`Failed to get status for ${serviceName}:`, error.message);
    return {
      status: 'unknown',
      serviceName,
      error: error.message,
    };
  }
};

/**
 * Control a service (start/stop/restart)
 */
const controlService = async (channelId, serviceType, action) => {
  const serviceName = getServiceName(channelId, serviceType);
  const validActions = ['start', 'stop', 'restart'];
  
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action: ${action}. Valid: ${validActions.join(', ')}`);
  }
  
  logger.info(`Executing ${action} on ${serviceName}`);
  
  await systemctl(action, serviceName, true);
  
  // Brief delay to let the service change state
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return getServiceStatus(channelId, serviceType);
};

/**
 * Enable/disable service autostart
 */
const setServiceEnabled = async (channelId, serviceType, enabled) => {
  const serviceName = getServiceName(channelId, serviceType);
  const action = enabled ? 'enable' : 'disable';
  
  await systemctl(action, serviceName, true);
  
  return { success: true, enabled };
};

/**
 * Check if service is enabled for autostart
 */
const isServiceEnabled = async (channelId, serviceType) => {
  const serviceName = getServiceName(channelId, serviceType);
  
  try {
    const { stdout } = await systemctl('is-enabled', serviceName, false);
    return stdout === 'enabled';
  } catch (error) {
    return false;
  }
};

module.exports = {
  checkSystemd,
  getServiceName,
  getServiceStatus,
  controlService,
  setServiceEnabled,
  isServiceEnabled,
};
