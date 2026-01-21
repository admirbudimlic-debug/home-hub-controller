export interface StreamPid {
  pid: number;
  type: string;
  bitrate: number;
  bitrateMbps: string;
  percentage: string;
  scrambled: boolean;
  discontinuities: number;
}

export interface StreamService {
  id: number;
  name: string;
  provider: string;
  type: string;
  pmtPid: number;
  pcrPid: number;
}

export interface StreamBitrate {
  total: number;
  totalMbps: string;
}

export interface StreamAnalysis {
  available: boolean;
  timestamp: string;
  error?: string;
  bitrate?: StreamBitrate;
  pids?: StreamPid[];
  services?: StreamService[];
  packets?: number;
  invalid?: number;
  suspectIgnored?: number;
}

export interface ChannelAnalysis {
  channelId: number;
  available: boolean;
  timestamp?: string;
  error?: string;
  bitrate?: StreamBitrate;
}
