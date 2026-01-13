/**
 * iLO Redfish API proxy routes
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const iloService = require('../services/iloService');
const logger = require('../utils/logger');

// POST /api/ilo/credentials - Set iLO credentials
router.post('/credentials', (req, res) => {
  const { host, username, password } = req.body;
  
  if (!host || !username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: host, username, password' 
    });
  }
  
  iloService.setCredentials(host, username, password);
  logger.info(`iLO credentials updated for host: ${host}`);
  
  res.json({ 
    success: true, 
    message: 'Credentials saved',
    host 
  });
});

// POST /api/ilo/test - Test iLO connection
router.post('/test', async (req, res) => {
  try {
    const { host, username, password } = req.body;
    
    // Use provided credentials or fall back to configured ones
    const testHost = host || config.ilo.host;
    const testUser = username || config.ilo.username;
    const testPass = password || config.ilo.password;
    
    if (!testHost || !testUser || !testPass) {
      return res.status(400).json({ 
        success: false, 
        error: 'No credentials provided or configured' 
      });
    }
    
    const result = await iloService.testConnection(testHost, testUser, testPass);
    res.json(result);
  } catch (error) {
    logger.error('iLO test failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ilo/status - Get full server status
router.get('/status', async (req, res) => {
  try {
    const status = await iloService.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get iLO status:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ilo/power/:action - Execute power action
router.post('/power/:action', async (req, res) => {
  const { action } = req.params;
  const validActions = ['powerOn', 'powerOff', 'forcePowerOff', 'reset', 'forceReset', 'powerCycle'];
  
  if (!validActions.includes(action)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid action. Valid actions: ${validActions.join(', ')}` 
    });
  }
  
  try {
    const result = await iloService.powerAction(action);
    logger.info(`Power action '${action}' executed successfully`);
    res.json(result);
  } catch (error) {
    logger.error(`Power action '${action}' failed:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ilo/info - Get iLO info (network, console URL)
router.get('/info', async (req, res) => {
  try {
    const info = await iloService.getInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    logger.error('Failed to get iLO info:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
