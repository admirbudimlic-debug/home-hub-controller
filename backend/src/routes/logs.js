/**
 * Log fetching routes
 * Retrieve logs from journalctl for services
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const logService = require('../services/logService');
const logger = require('../utils/logger');

const validServices = ['rx', 'rec', 'rtmp'];

// Helper to get channel IDs
const getChannelIds = () => {
  const ids = [];
  for (let i = 0; i < config.channelCount; i++) {
    ids.push(config.channelStart + i);
  }
  return ids;
};

// GET /api/logs/:channelId/:service - Get logs for a service
router.get('/:channelId/:service', async (req, res) => {
  const { channelId, service } = req.params;
  const { lines = 100, since, until, level } = req.query;
  const id = parseInt(channelId, 10);
  const channelIds = getChannelIds();
  
  if (!channelIds.includes(id)) {
    return res.status(404).json({ 
      success: false, 
      error: `Channel ${id} not found` 
    });
  }
  
  if (!validServices.includes(service)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid service. Valid: ${validServices.join(', ')}` 
    });
  }
  
  try {
    const logs = await logService.getLogs(id, service, {
      lines: Math.min(parseInt(lines, 10), config.logMaxLines),
      since,
      until,
      level,
    });
    
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error(`Failed to get logs for ${service} on channel ${id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs/:channelId - Get logs for all services on a channel
router.get('/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const { lines = 50 } = req.query;
  const id = parseInt(channelId, 10);
  const channelIds = getChannelIds();
  
  if (!channelIds.includes(id)) {
    return res.status(404).json({ 
      success: false, 
      error: `Channel ${id} not found` 
    });
  }
  
  try {
    const [rx, rec, rtmp] = await Promise.all([
      logService.getLogs(id, 'rx', { lines: Math.min(parseInt(lines, 10), config.logMaxLines) }),
      logService.getLogs(id, 'rec', { lines: Math.min(parseInt(lines, 10), config.logMaxLines) }),
      logService.getLogs(id, 'rtmp', { lines: Math.min(parseInt(lines, 10), config.logMaxLines) }),
    ]);
    
    res.json({ 
      success: true, 
      data: { rx, rec, rtmp } 
    });
  } catch (error) {
    logger.error(`Failed to get logs for channel ${id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
