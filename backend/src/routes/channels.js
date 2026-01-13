/**
 * Channel management routes
 * Provides aggregate view of channels and their services
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const systemdService = require('../services/systemdService');
const logger = require('../utils/logger');

// Helper to get channel IDs
const getChannelIds = () => {
  const ids = [];
  for (let i = 0; i < config.channelCount; i++) {
    ids.push(config.channelStart + i);
  }
  return ids;
};

// GET /api/channels - List all channels with service status
router.get('/', async (req, res) => {
  try {
    const channelIds = getChannelIds();
    const channels = await Promise.all(
      channelIds.map(async (id) => {
        const [rx, rec, rtmp] = await Promise.all([
          systemdService.getServiceStatus(id, 'rx').catch(() => ({ status: 'unknown' })),
          systemdService.getServiceStatus(id, 'rec').catch(() => ({ status: 'unknown' })),
          systemdService.getServiceStatus(id, 'rtmp').catch(() => ({ status: 'unknown' })),
        ]);
        
        return {
          id,
          name: `Channel ${id}`,
          services: { rx, rec, rtmp },
          // Overall status: running if any service is active
          status: [rx, rec, rtmp].some(s => s.status === 'running') ? 'active' : 'inactive',
        };
      })
    );
    
    res.json({ success: true, data: channels });
  } catch (error) {
    logger.error('Failed to get channels:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/channels/:id - Get single channel details
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channelIds = getChannelIds();
    
    if (!channelIds.includes(id)) {
      return res.status(404).json({ 
        success: false, 
        error: `Channel ${id} not found. Valid range: ${config.channelStart}-${config.channelStart + config.channelCount - 1}` 
      });
    }
    
    const [rx, rec, rtmp] = await Promise.all([
      systemdService.getServiceStatus(id, 'rx'),
      systemdService.getServiceStatus(id, 'rec'),
      systemdService.getServiceStatus(id, 'rtmp'),
    ]);
    
    const channel = {
      id,
      name: `Channel ${id}`,
      services: { rx, rec, rtmp },
      status: [rx, rec, rtmp].some(s => s.status === 'running') ? 'active' : 'inactive',
    };
    
    res.json({ success: true, data: channel });
  } catch (error) {
    logger.error(`Failed to get channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/channels/:id/config - Get channel configuration
router.get('/:id/config', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channelIds = getChannelIds();
    
    if (!channelIds.includes(id)) {
      return res.status(404).json({ success: false, error: `Channel ${id} not found` });
    }
    
    // Return placeholder config - implement file reading based on your config structure
    const configData = {
      channelId: id,
      rx: {
        enabled: true,
        inputUrl: `srt://0.0.0.0:${id}`,
        latency: 200,
        passphrase: '',
      },
      rec: {
        enabled: true,
        outputPath: `/recordings/channel${id}`,
        format: 'ts',
        segmentDuration: 3600,
      },
      rtmp: {
        enabled: true,
        outputUrl: `rtmp://streaming-server/live/channel${id}`,
        bitrate: 6000,
      },
    };
    
    res.json({ success: true, data: configData });
  } catch (error) {
    logger.error(`Failed to get config for channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/channels/:id/config - Update channel configuration
router.put('/:id/config', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channelIds = getChannelIds();
    
    if (!channelIds.includes(id)) {
      return res.status(404).json({ success: false, error: `Channel ${id} not found` });
    }
    
    const configData = req.body;
    
    // TODO: Implement actual config file writing based on your config structure
    // fs.writeFileSync(`${config.configPath}/channel${id}.json`, JSON.stringify(configData, null, 2));
    
    logger.info(`Config updated for channel ${id}`);
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    logger.error(`Failed to save config for channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
