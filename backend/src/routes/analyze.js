/**
 * Stream analysis routes
 * Provides real-time bitrate and PID information via TSDuck
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const tsanalyzeService = require('../services/tsanalyzeService');
const logger = require('../utils/logger');

// Helper to get channel IDs
const getChannelIds = () => {
  const ids = [];
  for (let i = 0; i < config.channelCount; i++) {
    ids.push(config.channelStart + i);
  }
  return ids;
};

// Check if mock mode is enabled
const isMockMode = () => process.env.MOCK_MODE === 'true' || config.nodeEnv === 'development';

// GET /api/analyze/:channelId - Get full stream analysis for a channel
router.get('/:channelId', async (req, res) => {
  try {
    const channelId = parseInt(req.params.channelId, 10);
    const channelIds = getChannelIds();
    
    if (!channelIds.includes(channelId)) {
      return res.status(404).json({
        success: false,
        error: `Channel ${channelId} not found`,
      });
    }

    let analysis;
    if (isMockMode()) {
      analysis = tsanalyzeService.generateMockAnalysis(channelId);
    } else {
      analysis = await tsanalyzeService.analyzeChannel(channelId);
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error(`Failed to analyze channel ${req.params.channelId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analyze/:channelId/bitrate - Get quick bitrate reading
router.get('/:channelId/bitrate', async (req, res) => {
  try {
    const channelId = parseInt(req.params.channelId, 10);
    const channelIds = getChannelIds();
    
    if (!channelIds.includes(channelId)) {
      return res.status(404).json({
        success: false,
        error: `Channel ${channelId} not found`,
      });
    }

    let bitrate;
    if (isMockMode()) {
      const mock = tsanalyzeService.generateMockAnalysis(channelId);
      bitrate = mock.available ? { 
        bps: mock.bitrate.total, 
        mbps: mock.bitrate.totalMbps,
        timestamp: mock.timestamp 
      } : null;
    } else {
      bitrate = await tsanalyzeService.getChannelBitrate(channelId);
    }

    if (bitrate) {
      res.json({ success: true, data: bitrate });
    } else {
      res.json({ success: true, data: null, message: 'No stream data available' });
    }
  } catch (error) {
    logger.error(`Failed to get bitrate for channel ${req.params.channelId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analyze - Get analysis summary for all channels
router.get('/', async (req, res) => {
  try {
    const channelIds = getChannelIds();
    
    const results = await Promise.all(
      channelIds.map(async (id) => {
        try {
          let analysis;
          if (isMockMode()) {
            analysis = tsanalyzeService.generateMockAnalysis(id);
          } else {
            // Use quick bitrate check for bulk query
            const bitrate = await tsanalyzeService.getChannelBitrate(id);
            if (bitrate) {
              analysis = {
                available: true,
                bitrate: { total: bitrate.bps, totalMbps: bitrate.mbps },
                timestamp: bitrate.timestamp,
              };
            } else {
              analysis = { available: false };
            }
          }
          return { channelId: id, ...analysis };
        } catch {
          return { channelId: id, available: false, error: 'Analysis failed' };
        }
      })
    );

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to get bulk analysis:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
