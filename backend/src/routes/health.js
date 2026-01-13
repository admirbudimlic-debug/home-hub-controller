/**
 * Health check endpoints
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const iloService = require('../services/iloService');
const systemdService = require('../services/systemdService');

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  const channelIds = [];
  for (let i = 0; i < config.channelCount; i++) {
    channelIds.push(config.channelStart + i);
  }
  
  // Check if systemd is accessible
  let systemdAvailable = false;
  try {
    await systemdService.checkSystemd();
    systemdAvailable = true;
  } catch (e) {
    // systemd not available
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    config: {
      iloConfigured: !!(config.ilo.host && config.ilo.username),
      iloHost: config.ilo.host || null,
      channelRange: `${config.channelStart}-${config.channelStart + config.channelCount - 1}`,
      channelCount: config.channelCount,
      systemdAvailable,
    }
  });
});

// GET /api/health/full - Detailed health check
router.get('/full', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // Check iLO connectivity
  if (config.ilo.host) {
    try {
      await iloService.testConnection();
      health.checks.ilo = { status: 'ok', host: config.ilo.host };
    } catch (e) {
      health.checks.ilo = { status: 'error', error: e.message };
      health.status = 'degraded';
    }
  } else {
    health.checks.ilo = { status: 'not_configured' };
  }
  
  // Check systemd
  try {
    await systemdService.checkSystemd();
    health.checks.systemd = { status: 'ok' };
  } catch (e) {
    health.checks.systemd = { status: 'error', error: e.message };
    health.status = 'degraded';
  }
  
  res.json(health);
});

module.exports = router;
