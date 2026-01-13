/**
 * Service control routes
 * Start/stop/restart individual services or bulk operations
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const systemdService = require('../services/systemdService');
const logger = require('../utils/logger');

const validServices = ['rx', 'rec', 'rtmp'];
const validActions = ['start', 'stop', 'restart'];

// Helper to get channel IDs
const getChannelIds = () => {
  const ids = [];
  for (let i = 0; i < config.channelCount; i++) {
    ids.push(config.channelStart + i);
  }
  return ids;
};

// POST /api/services/:channelId/:service/:action - Control single service
router.post('/:channelId/:service/:action', async (req, res) => {
  const { channelId, service, action } = req.params;
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
  
  if (!validActions.includes(action)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid action. Valid: ${validActions.join(', ')}` 
    });
  }
  
  try {
    await systemdService.controlService(id, service, action);
    logger.info(`Service ${service} on channel ${id}: ${action} executed`);
    
    // Get updated status
    const status = await systemdService.getServiceStatus(id, service);
    
    res.json({ 
      success: true, 
      message: `${action} executed on ${service} for channel ${id}`,
      status 
    });
  } catch (error) {
    logger.error(`Failed to ${action} ${service} on channel ${id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/services/bulk/:service/:action - Bulk operation on all channels
router.post('/bulk/:service/:action', async (req, res) => {
  const { service, action } = req.params;
  const { channelIds: requestedIds } = req.body;
  
  if (!validServices.includes(service)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid service. Valid: ${validServices.join(', ')}` 
    });
  }
  
  if (!validActions.includes(action)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid action. Valid: ${validActions.join(', ')}` 
    });
  }
  
  const allChannelIds = getChannelIds();
  const targetIds = requestedIds?.length > 0 
    ? requestedIds.filter(id => allChannelIds.includes(id))
    : allChannelIds;
  
  if (targetIds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'No valid channel IDs specified' 
    });
  }
  
  try {
    const results = await Promise.allSettled(
      targetIds.map(async (id) => {
        await systemdService.controlService(id, service, action);
        return { id, success: true };
      })
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Bulk ${action} on ${service}: ${succeeded} succeeded, ${failed} failed`);
    
    res.json({ 
      success: failed === 0, 
      message: `${action} executed on ${succeeded}/${targetIds.length} channels`,
      results: results.map((r, i) => ({
        channelId: targetIds[i],
        success: r.status === 'fulfilled',
        error: r.status === 'rejected' ? r.reason?.message : undefined,
      }))
    });
  } catch (error) {
    logger.error(`Bulk ${action} on ${service} failed:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/services/status - Get status of all services
router.get('/status', async (req, res) => {
  try {
    const channelIds = getChannelIds();
    const statuses = {};
    
    await Promise.all(
      channelIds.map(async (id) => {
        const [rx, rec, rtmp] = await Promise.all([
          systemdService.getServiceStatus(id, 'rx').catch(() => ({ status: 'unknown' })),
          systemdService.getServiceStatus(id, 'rec').catch(() => ({ status: 'unknown' })),
          systemdService.getServiceStatus(id, 'rtmp').catch(() => ({ status: 'unknown' })),
        ]);
        statuses[id] = { rx, rec, rtmp };
      })
    );
    
    res.json({ success: true, data: statuses });
  } catch (error) {
    logger.error('Failed to get service statuses:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
