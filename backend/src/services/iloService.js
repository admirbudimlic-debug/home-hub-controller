/**
 * iLO Redfish API Service
 * Handles all communication with HP iLO
 */

const fetch = require('node-fetch');
const https = require('https');
const config = require('../config');
const logger = require('../utils/logger');

// HTTPS agent that ignores self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Runtime credentials (can be updated via API)
let iloHost = config.ilo.host;
let iloUsername = config.ilo.username;
let iloPassword = config.ilo.password;

/**
 * Update iLO credentials at runtime
 */
const setCredentials = (host, username, password) => {
  iloHost = host;
  iloUsername = username;
  iloPassword = password;
};

/**
 * Get current credentials
 */
const getCredentials = () => ({
  host: iloHost,
  username: iloUsername,
  hasPassword: !!iloPassword,
});

/**
 * Make authenticated request to iLO Redfish API
 */
const iloRequest = async (path, method = 'GET', body = null, customCreds = null) => {
  const host = customCreds?.host || iloHost;
  const username = customCreds?.username || iloUsername;
  const password = customCreds?.password || iloPassword;
  
  if (!host || !username || !password) {
    throw new Error('iLO credentials not configured');
  }
  
  const url = `https://${host}${path}`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const options = {
    method,
    agent: httpsAgent,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
    },
    timeout: 30000,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  logger.debug(`iLO request: ${method} ${url}`);
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`iLO request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  if (response.status === 204) {
    return null; // No content
  }
  
  return response.json();
};

/**
 * Test connection to iLO
 */
const testConnection = async (host, username, password) => {
  try {
    const creds = host ? { host, username, password } : null;
    const data = await iloRequest('/redfish/v1/', 'GET', null, creds);
    
    return {
      success: true,
      message: 'Connection successful',
      iloVersion: data.RedfishVersion,
      product: data.Product,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Parse health status to normalized string
 */
const parseHealth = (status) => {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (s === 'ok' || s === 'healthy') return 'healthy';
  if (s === 'warning' || s === 'degraded') return 'warning';
  if (s === 'critical' || s === 'error') return 'critical';
  return 'unknown';
};

/**
 * Parse power state to normalized string
 */
const parsePowerState = (state) => {
  if (!state) return 'unknown';
  const s = state.toLowerCase();
  if (s === 'on' || s === 'poweredon') return 'on';
  if (s === 'off' || s === 'poweredoff') return 'off';
  return 'unknown';
};

/**
 * Calculate uptime from last boot time
 */
const calculateUptime = (bootTime) => {
  if (!bootTime) return null;
  const boot = new Date(bootTime);
  const now = new Date();
  const diffMs = now - boot;
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Get full server status
 */
const getStatus = async () => {
  // Fetch system, thermal, power, and chassis data in parallel
  const [system, chassis] = await Promise.all([
    iloRequest('/redfish/v1/Systems/1/'),
    iloRequest('/redfish/v1/Chassis/1/'),
  ]);
  
  // Get thermal and power data
  let thermal = null;
  let power = null;
  
  try {
    thermal = await iloRequest('/redfish/v1/Chassis/1/Thermal/');
  } catch (e) {
    logger.warn('Could not fetch thermal data:', e.message);
  }
  
  try {
    power = await iloRequest('/redfish/v1/Chassis/1/Power/');
  } catch (e) {
    logger.warn('Could not fetch power data:', e.message);
  }
  
  // Parse temperatures
  const temperatures = [];
  if (thermal?.Temperatures) {
    for (const temp of thermal.Temperatures) {
      if (temp.ReadingCelsius !== null && temp.ReadingCelsius !== undefined) {
        temperatures.push({
          name: temp.Name,
          value: temp.ReadingCelsius,
          unit: '°C',
          status: parseHealth(temp.Status?.Health),
        });
      }
    }
  }
  
  // Parse fans
  const fans = [];
  if (thermal?.Fans) {
    for (const fan of thermal.Fans) {
      if (fan.Reading !== null && fan.Reading !== undefined) {
        fans.push({
          name: fan.Name,
          speed: fan.Reading,
          unit: fan.ReadingUnits || '%',
          status: parseHealth(fan.Status?.Health),
        });
      }
    }
  }
  
  // Parse power consumption
  let powerConsumption = null;
  if (power?.PowerControl?.[0]) {
    const pc = power.PowerControl[0];
    powerConsumption = {
      current: pc.PowerConsumedWatts,
      average: pc.PowerMetrics?.AverageConsumedWatts,
      max: pc.PowerMetrics?.MaxConsumedWatts,
      min: pc.PowerMetrics?.MinConsumedWatts,
      unit: 'W',
    };
  }
  
  return {
    powerState: parsePowerState(system.PowerState),
    health: parseHealth(system.Status?.Health),
    model: system.Model,
    serialNumber: system.SerialNumber,
    biosVersion: system.BiosVersion,
    hostname: system.HostName,
    uptime: calculateUptime(system.Oem?.Hpe?.PostState === 'FinishedPost' ? system.Oem?.Hpe?.PowerOnMinutes : null),
    memory: {
      total: system.MemorySummary?.TotalSystemMemoryGiB,
      unit: 'GB',
    },
    processors: {
      count: system.ProcessorSummary?.Count,
      model: system.ProcessorSummary?.Model,
    },
    temperatures,
    fans,
    powerConsumption,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Execute power action
 */
const powerAction = async (action) => {
  const resetTypes = {
    powerOn: 'On',
    powerOff: 'GracefulShutdown',
    forcePowerOff: 'ForceOff',
    reset: 'GracefulRestart',
    forceReset: 'ForceRestart',
    powerCycle: 'PowerCycle',
  };
  
  const resetType = resetTypes[action];
  if (!resetType) {
    throw new Error(`Unknown power action: ${action}`);
  }
  
  await iloRequest('/redfish/v1/Systems/1/Actions/ComputerSystem.Reset/', 'POST', {
    ResetType: resetType,
  });
  
  return {
    success: true,
    message: `Power action '${action}' executed successfully`,
  };
};

/**
 * Get iLO network info
 */
const getInfo = async () => {
  const manager = await iloRequest('/redfish/v1/Managers/1/');
  
  let networkInfo = null;
  try {
    const ethernet = await iloRequest('/redfish/v1/Managers/1/EthernetInterfaces/1/');
    networkInfo = {
      hostname: ethernet.HostName,
      fqdn: ethernet.FQDN,
      ipv4: ethernet.IPv4Addresses?.[0]?.Address,
      ipv6: ethernet.IPv6Addresses?.[0]?.Address,
      mac: ethernet.MACAddress,
    };
  } catch (e) {
    logger.warn('Could not fetch network info:', e.message);
  }
  
  return {
    firmwareVersion: manager.FirmwareVersion,
    model: manager.Model,
    consoleUrl: `https://${iloHost}`,
    network: networkInfo,
  };
};

module.exports = {
  setCredentials,
  getCredentials,
  testConnection,
  getStatus,
  powerAction,
  getInfo,
};
