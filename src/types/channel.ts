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

export interface SrtConfig {
  // SRT Caller mode settings
  mode: 'caller';
  targetHost: string;
  targetPort: number;
  streamId?: string;
  latencyMs?: number;
  bandwidthOverhead?: number;
  // Optional passphrase for encryption
  passphrase?: string;
  pbkeylen?: 16 | 24 | 32;
}

export interface RxConfig {
  srt: SrtConfig;
  maxBitrateMbps?: number;
  // Multicast output
  multicastEnabled: boolean;
  multicastDstIp?: string;
  multicastDstPort?: number;
  interface?: string;
}

export interface RecConfig {
  recordEnabled: boolean;
  recordPath: string;
  // Recording filename template (e.g., "channel_%Y%m%d_%H%M%S")
  filenameTemplate?: string;
  segmentMode?: boolean;
  segmentDurationSec?: number;
  repackToMp4: boolean;
  repackPath?: string;
}

export interface RtmpConfig {
  rtmpEnabled: boolean;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  rtmpVideoBitrate?: number;
  rtmpAudioBitrate?: number;
  // Video encoding settings
  videoCodec?: 'libx264' | 'copy';
  videoPreset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  // Audio encoding settings  
  audioCodec?: 'aac' | 'copy';
}

export interface ChannelConfig {
  channelId: number;
  rx: RxConfig;
  rec: RecConfig;
  rtmp: RtmpConfig;
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
