/**
 * TSDuck tsanalyze Service
 * Parses real-time stream analysis from named pipes
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

// Cache for analysis results (to avoid hammering the pipes)
const analysisCache = new Map();
const CACHE_TTL_MS = 2000; // 2 seconds

/**
 * Get FIFO path for a channel
 */
const getFifoPath = (channelId) => {
  return `/var/run/brateshub/channel${channelId}.ts`;
};

/**
 * Check if FIFO exists and is readable
 */
const checkFifoExists = async (channelId) => {
  const fifoPath = getFifoPath(channelId);
  try {
    await fs.promises.access(fifoPath, fs.constants.R_OK);
    const stat = await fs.promises.stat(fifoPath);
    return stat.isFIFO();
  } catch {
    return false;
  }
};

/**
 * Parse tsanalyze JSON output
 */
const parseTsAnalyzeOutput = (jsonOutput) => {
  try {
    const data = JSON.parse(jsonOutput);
    
    // Extract bitrate info
    const ts = data.ts || {};
    const bitrate = {
      total: ts.bitrate || 0,
      totalMbps: ts.bitrate ? (ts.bitrate / 1_000_000).toFixed(2) : '0.00',
    };

    // Extract PID information
    const pids = [];
    const services = [];

    // Parse PIDs from the analysis
    if (data.pids && Array.isArray(data.pids)) {
      for (const pid of data.pids) {
        pids.push({
          pid: pid.pid,
          type: pid.description || getPidType(pid.pid),
          bitrate: pid.bitrate || 0,
          bitrateMbps: pid.bitrate ? (pid.bitrate / 1_000_000).toFixed(3) : '0.000',
          percentage: ts.bitrate ? ((pid.bitrate / ts.bitrate) * 100).toFixed(1) : '0.0',
          scrambled: pid.scrambled || false,
          discontinuities: pid['discontinuities'] || 0,
        });
      }
    }

    // Parse services (programs)
    if (data.services && Array.isArray(data.services)) {
      for (const svc of data.services) {
        services.push({
          id: svc.id || svc.service_id,
          name: svc.name || svc.service_name || `Service ${svc.id}`,
          provider: svc.provider || svc.provider_name || '',
          type: svc.type_name || svc.service_type_name || 'Unknown',
          pmtPid: svc.pmt_pid,
          pcrPid: svc.pcr_pid,
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      bitrate,
      pids: pids.sort((a, b) => b.bitrate - a.bitrate), // Sort by bitrate desc
      services,
      packets: ts.packets || 0,
      invalid: ts.invalid_sync || 0,
      suspectIgnored: ts.suspect_ignored || 0,
    };
  } catch (error) {
    logger.warn('Failed to parse tsanalyze output:', error.message);
    return null;
  }
};

/**
 * Get PID type description for well-known PIDs
 */
const getPidType = (pid) => {
  const knownPids = {
    0: 'PAT',
    1: 'CAT',
    16: 'NIT',
    17: 'SDT/BAT',
    18: 'EIT',
    20: 'TDT/TOT',
    8191: 'Null',
  };
  return knownPids[pid] || 'Unknown';
};

/**
 * Run tsanalyze on a channel's FIFO
 * Uses a short duration to get a snapshot
 */
const analyzeChannel = async (channelId) => {
  // Check cache first
  const cacheKey = `channel-${channelId}`;
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const fifoPath = getFifoPath(channelId);
  
  // Check if FIFO exists
  const fifoExists = await checkFifoExists(channelId);
  if (!fifoExists) {
    return {
      available: false,
      error: 'Stream not available (FIFO not found)',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Run tsanalyze with JSON output, timeout after 3 seconds
    // --duration 1 means analyze 1 second of stream
    const cmd = `timeout 3 tsanalyze --json "${fifoPath}" --duration 1 2>/dev/null`;
    
    const { stdout } = await execAsync(cmd, { timeout: 5000 });
    
    const analysis = parseTsAnalyzeOutput(stdout);
    
    if (analysis) {
      analysis.available = true;
      // Cache the result
      analysisCache.set(cacheKey, {
        timestamp: Date.now(),
        data: analysis,
      });
      return analysis;
    }

    return {
      available: false,
      error: 'Failed to parse stream analysis',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // If timeout or no data, the stream might not be active
    if (error.killed || error.code === 124) {
      return {
        available: false,
        error: 'No stream data (timeout)',
        timestamp: new Date().toISOString(),
      };
    }

    logger.warn(`tsanalyze failed for channel ${channelId}:`, error.message);
    return {
      available: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get quick bitrate reading using tsbitrate (faster than full analysis)
 */
const getChannelBitrate = async (channelId) => {
  const fifoPath = getFifoPath(channelId);
  
  const fifoExists = await checkFifoExists(channelId);
  if (!fifoExists) {
    return null;
  }

  try {
    const cmd = `timeout 2 tsbitrate "${fifoPath}" --duration 1 2>/dev/null | tail -1`;
    const { stdout } = await execAsync(cmd, { timeout: 3000 });
    
    // tsbitrate outputs lines like: "25,432,100 b/s"
    const match = stdout.replace(/,/g, '').match(/(\d+)\s*b\/s/);
    if (match) {
      const bps = parseInt(match[1], 10);
      return {
        bps,
        mbps: (bps / 1_000_000).toFixed(2),
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Generate mock analysis data for development/testing
 */
const generateMockAnalysis = (channelId) => {
  const isActive = Math.random() > 0.3;
  
  if (!isActive) {
    return {
      available: false,
      error: 'Stream not available',
      timestamp: new Date().toISOString(),
    };
  }

  const baseBitrate = 20_000_000 + Math.random() * 10_000_000;
  
  return {
    available: true,
    timestamp: new Date().toISOString(),
    bitrate: {
      total: Math.round(baseBitrate),
      totalMbps: (baseBitrate / 1_000_000).toFixed(2),
    },
    pids: [
      { pid: 0, type: 'PAT', bitrate: 15000, bitrateMbps: '0.015', percentage: '0.1', scrambled: false, discontinuities: 0 },
      { pid: 17, type: 'SDT', bitrate: 3000, bitrateMbps: '0.003', percentage: '0.0', scrambled: false, discontinuities: 0 },
      { pid: 256, type: 'PMT', bitrate: 15000, bitrateMbps: '0.015', percentage: '0.1', scrambled: false, discontinuities: 0 },
      { pid: 257, type: 'Video (HEVC)', bitrate: Math.round(baseBitrate * 0.85), bitrateMbps: (baseBitrate * 0.85 / 1_000_000).toFixed(3), percentage: '85.0', scrambled: false, discontinuities: 0 },
      { pid: 258, type: 'Audio (AAC)', bitrate: Math.round(baseBitrate * 0.08), bitrateMbps: (baseBitrate * 0.08 / 1_000_000).toFixed(3), percentage: '8.0', scrambled: false, discontinuities: 0 },
      { pid: 259, type: 'Audio (AC3)', bitrate: Math.round(baseBitrate * 0.05), bitrateMbps: (baseBitrate * 0.05 / 1_000_000).toFixed(3), percentage: '5.0', scrambled: false, discontinuities: 0 },
    ],
    services: [
      { id: 1, name: `Channel ${channelId} HD`, provider: 'BratesHUB', type: 'Digital TV', pmtPid: 256, pcrPid: 257 },
    ],
    packets: Math.round(baseBitrate / 188 * 1), // ~1 second of packets
    invalid: 0,
    suspectIgnored: 0,
  };
};

module.exports = {
  analyzeChannel,
  getChannelBitrate,
  generateMockAnalysis,
  checkFifoExists,
};
