import { Channel, ChannelConfig, LogEntry, ServiceStatus, ServiceType, ApiResponse } from '@/types/channel';
import { StreamAnalysis, ChannelAnalysis } from '@/types/stream';

// Simulated channel data
const generateMockChannel = (id: number): Channel => {
  const statuses: ServiceStatus[] = ['running', 'stopped', 'error', 'running'];
  const randomStatus = () => statuses[Math.floor(Math.random() * statuses.length)];
  
  const rxStatus = id <= 5 ? 'running' : randomStatus();
  const recStatus = id <= 3 ? 'running' : randomStatus();
  const rtmpStatus = id <= 4 ? 'running' : randomStatus();

  return {
    id,
    rx: {
      status: rxStatus,
      pid: rxStatus === 'running' ? 10000 + id : undefined,
      uptime: rxStatus === 'running' ? `${Math.floor(Math.random() * 48)}h ${Math.floor(Math.random() * 60)}m` : undefined,
      lastStartTime: new Date(Date.now() - Math.random() * 172800000).toISOString(),
      lastExitCode: rxStatus === 'error' ? 1 : 0,
    },
    rec: {
      status: recStatus,
      pid: recStatus === 'running' ? 20000 + id : undefined,
      uptime: recStatus === 'running' ? `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m` : undefined,
      lastStartTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    },
    rtmp: {
      status: rtmpStatus,
      pid: rtmpStatus === 'running' ? 30000 + id : undefined,
      uptime: rtmpStatus === 'running' ? `${Math.floor(Math.random() * 12)}h ${Math.floor(Math.random() * 60)}m` : undefined,
      lastStartTime: new Date(Date.now() - Math.random() * 43200000).toISOString(),
    },
    config: {
      channelId: id,
      rx: {
        srtListenPort: 5000 + id,
        maxBitrateMbps: 25,
        multicastEnabled: true,
        multicastDstIp: `239.0.${id}.1`,
        multicastDstPort: 5000 + id,
        interface: 'eth0',
      },
      rec: {
        recordEnabled: true,
        recordPath: `/srv/recordings/ch${5000 + id}`,
        segmentMode: true,
        repackToMp4: true,
        repackPath: `/srv/recordings/ch${5000 + id}/mp4`,
      },
      rtmp: {
        rtmpEnabled: id <= 6,
        rtmpUrl: `rtmp://streaming.example.com/live/channel${id}`,
        rtmpVideoBitrate: 6000,
        rtmpAudioBitrate: 192,
      },
    },
    ingestSummary: `SRT :${5000 + id}`,
    outputSummary: `239.0.${id}.1:${5000 + id}`,
  };
};

let mockChannels: Channel[] = Array.from({ length: 9 }, (_, i) => generateMockChannel(i + 1));

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock log entries
const generateMockLogs = (channelId: number, service: ServiceType): LogEntry[] => {
  const levels: LogEntry['level'][] = ['info', 'info', 'info', 'warn', 'error'];
  const messages = {
    rx: [
      'SRT connection established from 192.168.1.100',
      'Receiving stream at 24.5 Mbps',
      'Buffer level: 85%',
      'Packet loss detected: 0.01%',
      'Connection timeout, attempting reconnect',
    ],
    rec: [
      'Started recording segment 00042.ts',
      'Segment 00041.ts closed, size: 125MB',
      'Disk usage: 45% of allocated space',
      'MP4 repack completed for segment 00040',
      'Write error: disk space low',
    ],
    rtmp: [
      'Connected to rtmp://streaming.example.com',
      'Publishing stream at 6000kbps',
      'Keyframe interval: 2s',
      'Network congestion detected',
      'Connection lost, reconnecting...',
    ],
  };

  return Array.from({ length: 50 }, (_, i) => ({
    timestamp: new Date(Date.now() - (50 - i) * 30000).toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[service][Math.floor(Math.random() * messages[service].length)],
  }));
};

// API Functions
export const api = {
  // Get all channels
  async getChannels(): Promise<ApiResponse<Channel[]>> {
    await delay(300);
    return { success: true, data: mockChannels };
  },

  // Get single channel
  async getChannel(id: number): Promise<ApiResponse<Channel>> {
    await delay(200);
    const channel = mockChannels.find(c => c.id === id);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    return { success: true, data: channel };
  },

  // Get logs for a service
  async getLogs(channelId: number, service: ServiceType, lines: number = 50): Promise<ApiResponse<LogEntry[]>> {
    await delay(400);
    const logs = generateMockLogs(channelId, service).slice(-lines);
    return { success: true, data: logs };
  },

  // Start a service
  async startService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    await delay(800);
    const channel = mockChannels.find(c => c.id === channelId);
    if (channel) {
      channel[service].status = 'running';
      channel[service].pid = Math.floor(Math.random() * 90000) + 10000;
      channel[service].uptime = '0h 0m';
      channel[service].lastStartTime = new Date().toISOString();
    }
    return { success: true };
  },

  // Stop a service
  async stopService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    await delay(600);
    const channel = mockChannels.find(c => c.id === channelId);
    if (channel) {
      channel[service].status = 'stopped';
      channel[service].pid = undefined;
      channel[service].uptime = undefined;
    }
    return { success: true };
  },

  // Restart a service
  async restartService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    await delay(1200);
    const channel = mockChannels.find(c => c.id === channelId);
    if (channel) {
      channel[service].status = 'running';
      channel[service].pid = Math.floor(Math.random() * 90000) + 10000;
      channel[service].uptime = '0h 0m';
      channel[service].lastStartTime = new Date().toISOString();
    }
    return { success: true };
  },

  // Bulk operations
  async bulkOperation(service: ServiceType, action: 'start' | 'stop' | 'restart', channelIds?: number[]): Promise<ApiResponse<void>> {
    await delay(2000);
    const ids = channelIds || mockChannels.map(c => c.id);
    for (const id of ids) {
      const channel = mockChannels.find(c => c.id === id);
      if (channel) {
        if (action === 'stop') {
          channel[service].status = 'stopped';
          channel[service].pid = undefined;
        } else {
          channel[service].status = 'running';
          channel[service].pid = Math.floor(Math.random() * 90000) + 10000;
          channel[service].uptime = '0h 0m';
          channel[service].lastStartTime = new Date().toISOString();
        }
      }
    }
    return { success: true };
  },

  // Get config
  async getConfig(channelId: number): Promise<ApiResponse<ChannelConfig>> {
    await delay(200);
    const channel = mockChannels.find(c => c.id === channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    return { success: true, data: channel.config };
  },

  // Save config
  async saveConfig(channelId: number, config: ChannelConfig): Promise<ApiResponse<void>> {
    await delay(500);
    const channel = mockChannels.find(c => c.id === channelId);
    if (channel) {
      channel.config = config;
      channel.ingestSummary = `SRT :${config.rx.srtListenPort}`;
      if (config.rx.multicastEnabled && config.rx.multicastDstIp) {
        channel.outputSummary = `${config.rx.multicastDstIp}:${config.rx.multicastDstPort}`;
      }
    }
    return { success: true };
  },

  // Apply config (save + restart affected services)
  async applyConfig(channelId: number, config: ChannelConfig, restartServices: ServiceType[]): Promise<ApiResponse<void>> {
    await delay(1500);
    await api.saveConfig(channelId, config);
    for (const service of restartServices) {
      await api.restartService(channelId, service);
    }
    return { success: true };
  },

  // Get stream analysis for all channels
  async getStreamAnalyses(): Promise<ApiResponse<ChannelAnalysis[]>> {
    await delay(200);
    const analyses: ChannelAnalysis[] = mockChannels.map(ch => {
      const isActive = ch.rx.status === 'running';
      if (!isActive) {
        return {
          channelId: ch.id,
          available: false,
          timestamp: new Date().toISOString(),
        };
      }
      const baseBitrate = 20 + Math.random() * 10;
      return {
        channelId: ch.id,
        available: true,
        timestamp: new Date().toISOString(),
        bitrate: {
          total: Math.round(baseBitrate * 1_000_000),
          totalMbps: baseBitrate.toFixed(2),
        },
      };
    });
    return { success: true, data: analyses };
  },

  // Get detailed stream analysis for a single channel
  async getStreamAnalysis(channelId: number): Promise<ApiResponse<StreamAnalysis>> {
    await delay(300);
    const channel = mockChannels.find(c => c.id === channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    const isActive = channel.rx.status === 'running';
    if (!isActive) {
      return {
        success: true,
        data: {
          available: false,
          timestamp: new Date().toISOString(),
          error: 'Stream not available',
        },
      };
    }

    const baseBitrate = 20_000_000 + Math.random() * 10_000_000;
    
    return {
      success: true,
      data: {
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
          { pid: 259, type: 'Audio (AC3)', bitrate: Math.round(baseBitrate * 0.05), bitrateMbps: (baseBitrate * 0.05 / 1_000_000).toFixed(3), percentage: '5.0', scrambled: false, discontinuities: Math.floor(Math.random() * 3) },
        ],
        services: [
          { id: 1, name: `Channel ${channelId} HD`, provider: 'BratesHUB', type: 'Digital TV', pmtPid: 256, pcrPid: 257 },
        ],
        packets: Math.round(baseBitrate / 188),
        invalid: 0,
        suspectIgnored: 0,
      },
    };
  },
};
