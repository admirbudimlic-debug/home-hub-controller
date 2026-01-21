// API layer that connects directly to the backend
// Mock mode has been removed - all requests go to the real backend

import { Channel, ChannelConfig, LogEntry, ServiceType, ApiResponse } from '@/types/channel';
import { StreamAnalysis, ChannelAnalysis } from '@/types/stream';
import { realApi } from './realApi';

// Unified API that directly uses the real backend
export const api = {
  getChannels(): Promise<ApiResponse<Channel[]>> {
    return realApi.getChannels();
  },

  getChannel(id: number): Promise<ApiResponse<Channel>> {
    return realApi.getChannel(id);
  },

  getLogs(channelId: number, service: ServiceType, lines?: number): Promise<ApiResponse<LogEntry[]>> {
    return realApi.getLogs(channelId, service, lines);
  },

  startService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return realApi.startService(channelId, service);
  },

  stopService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return realApi.stopService(channelId, service);
  },

  restartService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return realApi.restartService(channelId, service);
  },

  bulkOperation(service: ServiceType, action: 'start' | 'stop' | 'restart', channelIds?: number[]): Promise<ApiResponse<void>> {
    return realApi.bulkOperation(service, action, channelIds);
  },

  getConfig(channelId: number): Promise<ApiResponse<ChannelConfig>> {
    return realApi.getConfig(channelId);
  },

  saveConfig(channelId: number, config: ChannelConfig): Promise<ApiResponse<void>> {
    return realApi.saveConfig(channelId, config);
  },

  applyConfig(channelId: number, config: ChannelConfig, restartServices: ServiceType[]): Promise<ApiResponse<void>> {
    return realApi.applyConfig(channelId, config, restartServices);
  },

  getStreamAnalyses(): Promise<ApiResponse<ChannelAnalysis[]>> {
    return realApi.getStreamAnalyses();
  },

  getStreamAnalysis(channelId: number): Promise<ApiResponse<StreamAnalysis>> {
    return realApi.getStreamAnalysis(channelId);
  },
};
