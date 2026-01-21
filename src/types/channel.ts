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
  // SRT Mode - caller or listener
  mode: 'caller' | 'listener';
  // Caller mode settings
  targetHost?: string;
  targetPort?: number;
  // Listener mode settings (listen on this port)
  listenPort?: number;
  // Common settings
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

// Audio pair selection - some sources have multiple audio tracks
export type AudioPair = 'primary' | 'secondary' | 'both';

export interface RtmpConfig {
  rtmpEnabled: boolean;
  rtmpUrl?: string;
  rtmpStreamKey?: string;
  // Video settings
  videoCodec?: 'libx264' | 'libx265' | 'copy';
  videoPreset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow';
  videoBitrate?: number; // kbps
  videoWidth?: number;
  videoHeight?: number;
  videoFps?: number;
  gopSize?: number; // keyframe interval
  // Audio settings
  audioCodec?: 'aac' | 'copy';
  audioBitrate?: number; // kbps
  audioSampleRate?: 48000 | 44100;
  audioPair?: AudioPair;
  // Quality presets
  qualityPreset?: 'passthrough' | '1080p' | '720p' | '480p' | 'custom';
}

export interface ChannelConfig {
  channelId: number;
  name: string;
  rx: RxConfig;
  rec: RecConfig;
  rtmp: RtmpConfig;
  extraArgs?: string;
}

export interface Channel {
  id: number;
  name: string;
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
