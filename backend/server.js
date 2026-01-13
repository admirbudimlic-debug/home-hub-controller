/**
 * HP iLO Redfish API Proxy Server
 * 
 * This server acts as a bridge between your frontend and the iLO Redfish API.
 * It handles CORS, authentication, and provides a clean REST API.
 * 
 * Run: npm install && npm start
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// Create an HTTPS agent that ignores self-signed certificates (iLO uses self-signed)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// In-memory credentials store (can be overridden by env vars or API)
let iloConfig = {
  host: process.env.ILO_HOST || '',
  username: process.env.ILO_USERNAME || '',
  password: process.env.ILO_PASSWORD || ''
};

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Helper: Make authenticated request to iLO Redfish API
 */
async function iloRequest(path, method = 'GET', body = null) {
  if (!iloConfig.host || !iloConfig.username || !iloConfig.password) {
    throw new Error('iLO credentials not configured');
  }

  const url = `https://${iloConfig.host}${path}`;
  const auth = Buffer.from(`${iloConfig.username}:${iloConfig.password}`).toString('base64');

  const options = {
    method,
    agent: httpsAgent,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'OData-Version': '4.0'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`iLO API error (${response.status}): ${errorText}`);
  }

  // Some actions return 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

/**
 * Helper: Parse iLO health status
 */
function parseHealth(status) {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (s === 'ok') return 'ok';
  if (s === 'warning') return 'warning';
  if (s === 'critical') return 'critical';
  return 'unknown';
}

/**
 * Helper: Parse power state
 */
function parsePowerState(state) {
  if (!state) return 'unknown';
  const s = state.toLowerCase();
  if (s === 'on') return 'on';
  if (s === 'off') return 'off';
  return 'unknown';
}

// ============================================
// API ROUTES
// ============================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    configured: !!(iloConfig.host && iloConfig.username && iloConfig.password),
    host: iloConfig.host || null
  });
});

/**
 * Set/update iLO credentials
 */
app.post('/api/ilo/credentials', (req, res) => {
  const { host, username, password } = req.body;
  
  if (!host || !username || !password) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  iloConfig = { host, username, password };
  console.log(`[CONFIG] iLO credentials updated for host: ${host}`);
  
  res.json({ success: true, message: 'Credentials updated' });
});

/**
 * Test iLO connection
 */
app.post('/api/ilo/test', async (req, res) => {
  try {
    // Temporarily use provided credentials if given
    const testConfig = req.body.host ? req.body : iloConfig;
    const originalConfig = { ...iloConfig };
    
    if (req.body.host) {
      iloConfig = {
        host: req.body.host,
        username: req.body.username,
        password: req.body.password
      };
    }

    // Try to get basic system info
    const result = await iloRequest('/redfish/v1/Systems/1');
    
    // Restore original config if we were testing
    if (req.body.host) {
      iloConfig = originalConfig;
    }

    res.json({ 
      success: true, 
      message: 'Connection successful',
      model: result.Model || 'Unknown'
    });
  } catch (error) {
    console.error('[TEST] Connection failed:', error.message);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get full iLO status
 */
app.get('/api/ilo/status', async (req, res) => {
  try {
    // Fetch multiple endpoints in parallel
    const [system, chassis, thermal, power] = await Promise.all([
      iloRequest('/redfish/v1/Systems/1'),
      iloRequest('/redfish/v1/Chassis/1'),
      iloRequest('/redfish/v1/Chassis/1/Thermal').catch(() => null),
      iloRequest('/redfish/v1/Chassis/1/Power').catch(() => null)
    ]);

    // Parse temperatures
    const temperatures = { inlet: 0, cpu1: 0, cpu2: undefined };
    if (thermal?.Temperatures) {
      for (const temp of thermal.Temperatures) {
        const name = (temp.Name || '').toLowerCase();
        if (name.includes('inlet') || name.includes('ambient')) {
          temperatures.inlet = temp.ReadingCelsius || 0;
        } else if (name.includes('cpu') || name.includes('processor')) {
          if (name.includes('1') || !temperatures.cpu1) {
            temperatures.cpu1 = temp.ReadingCelsius || 0;
          } else if (name.includes('2')) {
            temperatures.cpu2 = temp.ReadingCelsius || 0;
          }
        }
      }
    }

    // Parse fans
    const fans = [];
    if (thermal?.Fans) {
      for (const fan of thermal.Fans) {
        fans.push({
          name: fan.Name || `Fan ${fans.length + 1}`,
          speed: fan.Reading || fan.CurrentReading || 0,
          status: parseHealth(fan.Status?.Health)
        });
      }
    }

    // Parse power consumption
    let powerConsumption = 0;
    if (power?.PowerControl?.[0]) {
      powerConsumption = power.PowerControl[0].PowerConsumedWatts || 0;
    }

    // Calculate uptime from last boot time
    let uptime = 'Unknown';
    if (system.Oem?.Hpe?.PostState === 'FinishedPost' && system.Oem?.Hpe?.PowerOnMinutes) {
      const minutes = system.Oem.Hpe.PowerOnMinutes;
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      const mins = minutes % 60;
      uptime = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
    }

    const status = {
      connected: true,
      hostname: iloConfig.host,
      powerState: parsePowerState(system.PowerState),
      health: parseHealth(system.Status?.Health),
      model: system.Model || 'Unknown',
      serialNumber: system.SerialNumber || 'Unknown',
      biosVersion: system.BiosVersion || 'Unknown',
      iloVersion: chassis.Oem?.Hpe?.Firmware?.Current?.VersionString || 'Unknown',
      temperatures,
      fans,
      powerConsumption,
      uptime,
      lastBootTime: system.Oem?.Hpe?.PostState === 'FinishedPost' 
        ? new Date().toISOString() 
        : null
    };

    res.json({ success: true, data: status });
  } catch (error) {
    console.error('[STATUS] Failed to get status:', error.message);
    res.json({ 
      success: false, 
      error: error.message,
      data: {
        connected: false,
        hostname: iloConfig.host,
        powerState: 'unknown',
        health: 'unknown'
      }
    });
  }
});

/**
 * Power actions
 */
const RESET_TYPES = {
  powerOn: 'On',
  powerOff: 'GracefulShutdown',
  forcePowerOff: 'ForceOff',
  reset: 'GracefulRestart',
  forceReset: 'ForceRestart',
  powerCycle: 'PowerCycle',
  nmi: 'Nmi'
};

app.post('/api/ilo/power/:action', async (req, res) => {
  const { action } = req.params;
  
  const resetType = RESET_TYPES[action];
  if (!resetType) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid action: ${action}. Valid actions: ${Object.keys(RESET_TYPES).join(', ')}` 
    });
  }

  try {
    await iloRequest(
      '/redfish/v1/Systems/1/Actions/ComputerSystem.Reset',
      'POST',
      { ResetType: resetType }
    );

    console.log(`[POWER] ${action} command sent successfully`);
    res.json({ 
      success: true, 
      message: `${action} command sent successfully` 
    });
  } catch (error) {
    console.error(`[POWER] ${action} failed:`, error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get iLO network info (for remote console URL)
 */
app.get('/api/ilo/info', async (req, res) => {
  try {
    const manager = await iloRequest('/redfish/v1/Managers/1');
    const ethernet = await iloRequest('/redfish/v1/Managers/1/EthernetInterfaces/1').catch(() => null);

    res.json({
      success: true,
      data: {
        hostname: iloConfig.host,
        firmwareVersion: manager.FirmwareVersion || 'Unknown',
        model: manager.Model || 'Unknown',
        ipAddress: ethernet?.IPv4Addresses?.[0]?.Address || iloConfig.host,
        consoleUrl: `https://${iloConfig.host}`
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           HP iLO Proxy Server v1.0.0                      ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  CORS origins: ${corsOrigins.join(', ').substring(0, 40)}...
║                                                           ║
║  iLO configured: ${iloConfig.host ? 'Yes (' + iloConfig.host + ')' : 'No (set via API or .env)'}
╚═══════════════════════════════════════════════════════════╝

Endpoints:
  GET  /api/health          - Server health check
  POST /api/ilo/credentials - Set iLO credentials
  POST /api/ilo/test        - Test iLO connection
  GET  /api/ilo/status      - Get full server status
  POST /api/ilo/power/:action - Power control (powerOn, powerOff, reset, etc.)
  GET  /api/ilo/info        - Get iLO network info
  `);
});
