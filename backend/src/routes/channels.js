/**
 * Channel management routes
 * Provides CRUD operations for channels with file-based storage
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const systemdService = require('../services/systemdService');
const logger = require('../utils/logger');

// Channels storage file
const CHANNELS_FILE = path.join(config.configPath, 'channels.json');

// Ensure config directory exists
function ensureConfigDir() {
  if (!fs.existsSync(config.configPath)) {
    fs.mkdirSync(config.configPath, { recursive: true });
  }
}

// Load channels from file
function loadChannels() {
  ensureConfigDir();
  if (!fs.existsSync(CHANNELS_FILE)) {
    // Return empty array if file doesn't exist
    return [];
  }
  try {
    const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load channels file:', error.message);
    return [];
  }
}

// Save channels to file
function saveChannels(channels) {
  ensureConfigDir();
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
}

// Get default channel config
function getDefaultChannelConfig(id, name) {
  return {
    channelId: id,
    name: name || `Channel ${id}`,
    rx: {
      srt: {
        mode: 'listener',
        listenPort: 5000 + id,
        latencyMs: 200,
      },
      multicastEnabled: false,
    },
    rec: {
      recordEnabled: false,
      recordPath: `/srv/recordings/ch${id}`,
      filenameTemplate: `ch${id}_%Y%m%d_%H%M%S`,
      repackToMp4: false,
    },
    rtmp: {
      rtmpEnabled: false,
      videoCodec: 'copy',
      audioCodec: 'copy',
      audioPair: 'primary',
      qualityPreset: 'passthrough',
    },
  };
}

// GET /api/channels - List all channels with service status
router.get('/', async (req, res) => {
  try {
    const channels = loadChannels();
    
    // Get status for each channel
    const channelsWithStatus = await Promise.all(
      channels.map(async (channelConfig) => {
        const id = channelConfig.channelId;
        const [rx, rec, rtmp] = await Promise.all([
          systemdService.getServiceStatus(id, 'rx').catch(() => ({ status: 'stopped' })),
          systemdService.getServiceStatus(id, 'rec').catch(() => ({ status: 'stopped' })),
          systemdService.getServiceStatus(id, 'rtmp').catch(() => ({ status: 'stopped' })),
        ]);
        
        // Build summary strings
        const srt = channelConfig.rx?.srt || {};
        const ingestSummary = srt.mode === 'caller' 
          ? `SRT→${srt.targetHost}:${srt.targetPort}`
          : `SRT←:${srt.listenPort || (5000 + id)}`;
        
        const outputSummary = channelConfig.rtmp?.rtmpEnabled
          ? (channelConfig.rtmp.rtmpUrl || 'RTMP').split('/').slice(-1)[0]
          : 'No output';
        
        return {
          id,
          name: channelConfig.name,
          rx,
          rec,
          rtmp,
          config: channelConfig,
          ingestSummary,
          outputSummary,
        };
      })
    );
    
    res.json({ success: true, data: channelsWithStatus });
  } catch (error) {
    logger.error('Failed to get channels:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/channels/:id - Get single channel details
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channels = loadChannels();
    const channelConfig = channels.find(c => c.channelId === id);
    
    if (!channelConfig) {
      return res.status(404).json({ 
        success: false, 
        error: `Channel ${id} not found` 
      });
    }
    
    const [rx, rec, rtmp] = await Promise.all([
      systemdService.getServiceStatus(id, 'rx'),
      systemdService.getServiceStatus(id, 'rec'),
      systemdService.getServiceStatus(id, 'rtmp'),
    ]);
    
    const srt = channelConfig.rx?.srt || {};
    const ingestSummary = srt.mode === 'caller' 
      ? `SRT→${srt.targetHost}:${srt.targetPort}`
      : `SRT←:${srt.listenPort || (5000 + id)}`;
    
    const outputSummary = channelConfig.rtmp?.rtmpEnabled
      ? (channelConfig.rtmp.rtmpUrl || 'RTMP').split('/').slice(-1)[0]
      : 'No output';
    
    res.json({
      success: true,
      data: {
        id,
        name: channelConfig.name,
        rx,
        rec,
        rtmp,
        config: channelConfig,
        ingestSummary,
        outputSummary,
      },
    });
  } catch (error) {
    logger.error(`Failed to get channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/channels - Create new channel
router.post('/', async (req, res) => {
  try {
    const { name, channelId } = req.body;
    
    if (!channelId || typeof channelId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'channelId is required and must be a number' 
      });
    }
    
    const channels = loadChannels();
    
    // Check if channel ID already exists
    if (channels.some(c => c.channelId === channelId)) {
      return res.status(409).json({ 
        success: false, 
        error: `Channel ${channelId} already exists` 
      });
    }
    
    // Create new channel with default config
    const newChannel = getDefaultChannelConfig(channelId, name);
    
    // Merge any provided config
    if (req.body.rx) newChannel.rx = { ...newChannel.rx, ...req.body.rx };
    if (req.body.rec) newChannel.rec = { ...newChannel.rec, ...req.body.rec };
    if (req.body.rtmp) newChannel.rtmp = { ...newChannel.rtmp, ...req.body.rtmp };
    
    channels.push(newChannel);
    channels.sort((a, b) => a.channelId - b.channelId);
    saveChannels(channels);
    
    logger.info(`Channel ${channelId} created: ${name}`);
    res.status(201).json({ success: true, data: newChannel });
  } catch (error) {
    logger.error('Failed to create channel:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/channels/:id - Update channel
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channels = loadChannels();
    const index = channels.findIndex(c => c.channelId === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Channel ${id} not found` });
    }
    
    // Update channel config
    const updatedChannel = {
      ...channels[index],
      ...req.body,
      channelId: id, // Prevent changing ID
    };
    
    channels[index] = updatedChannel;
    saveChannels(channels);
    
    logger.info(`Channel ${id} updated`);
    res.json({ success: true, data: updatedChannel });
  } catch (error) {
    logger.error(`Failed to update channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/channels/:id - Delete channel
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channels = loadChannels();
    const index = channels.findIndex(c => c.channelId === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Channel ${id} not found` });
    }
    
    // Stop all services first
    await Promise.all([
      systemdService.controlService(id, 'rx', 'stop').catch(() => {}),
      systemdService.controlService(id, 'rec', 'stop').catch(() => {}),
      systemdService.controlService(id, 'rtmp', 'stop').catch(() => {}),
    ]);
    
    channels.splice(index, 1);
    saveChannels(channels);
    
    logger.info(`Channel ${id} deleted`);
    res.json({ success: true, message: `Channel ${id} deleted` });
  } catch (error) {
    logger.error(`Failed to delete channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/channels/:id/config - Get channel configuration
router.get('/:id/config', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channels = loadChannels();
    const channelConfig = channels.find(c => c.channelId === id);
    
    if (!channelConfig) {
      return res.status(404).json({ success: false, error: `Channel ${id} not found` });
    }
    
    res.json({ success: true, data: channelConfig });
  } catch (error) {
    logger.error(`Failed to get config for channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/channels/:id/config - Update channel configuration
router.put('/:id/config', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const channels = loadChannels();
    const index = channels.findIndex(c => c.channelId === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Channel ${id} not found` });
    }
    
    const configData = req.body;
    
    // Merge config, preserving channelId
    channels[index] = {
      ...channels[index],
      ...configData,
      channelId: id,
    };
    
    saveChannels(channels);
    
    logger.info(`Config updated for channel ${id}`);
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    logger.error(`Failed to save config for channel ${req.params.id}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
