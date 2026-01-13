export type ServiceStatus = 'running' | 'stopped' | 'error' | 'unknown';
export type ServiceType = 'rx' | 'rec' | 'rtmp';

export interface ServiceState {
  status: ServiceStatus;
  pid?: number;
  uptime?: string;
  lastStartTime?: string;
  lastExitCode?: number;
  lastFailureTime?: string;
}

export interface ChannelConfig {
  channelId: number;
  rx: {
    srtListenPort: number;
    maxBitrateMbps?: number;
    multicastEnabled: boolean;
    multicastDstIp?: string;
    multicastDstPort?: number;
    interface?: string;
  };
  rec: {
    recordEnabled: boolean;
    recordPath: string;
    segmentMode?: boolean;
    repackToMp4: boolean;
    repackPath?: string;
  };
  rtmp: {
    rtmpEnabled: boolean;
    rtmpUrl?: string;
    rtmpVideoBitrate?: number;
    rtmpAudioBitrate?: number;
  };
  extraArgs?: string;
}

export interface Channel {
  id: number;
  rx: ServiceState;
  rec: ServiceState;
  rtmp: ServiceState;
  config: ChannelConfig;
  ingestSummary: string;
  outputSummary: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
