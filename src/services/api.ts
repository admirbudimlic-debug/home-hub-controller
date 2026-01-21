// Unified API layer that routes to mock or real API based on configuration

import { Channel, ChannelConfig, LogEntry, ServiceType, ApiResponse } from '@/types/channel';
import { StreamAnalysis, ChannelAnalysis } from '@/types/stream';
import { isLiveMode } from './backendConfig';
import { api as mockApi } from './mockApi';
import { realApi } from './realApi';

// Unified API that switches between mock and real based on config
export const api = {
  getChannels(): Promise<ApiResponse<Channel[]>> {
    return isLiveMode() ? realApi.getChannels() : mockApi.getChannels();
  },

  getChannel(id: number): Promise<ApiResponse<Channel>> {
    return isLiveMode() ? realApi.getChannel(id) : mockApi.getChannel(id);
  },

  getLogs(channelId: number, service: ServiceType, lines?: number): Promise<ApiResponse<LogEntry[]>> {
    return isLiveMode() ? realApi.getLogs(channelId, service, lines) : mockApi.getLogs(channelId, service, lines);
  },

  startService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return isLiveMode() ? realApi.startService(channelId, service) : mockApi.startService(channelId, service);
  },

  stopService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return isLiveMode() ? realApi.stopService(channelId, service) : mockApi.stopService(channelId, service);
  },

  restartService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return isLiveMode() ? realApi.restartService(channelId, service) : mockApi.restartService(channelId, service);
  },

  bulkOperation(service: ServiceType, action: 'start' | 'stop' | 'restart', channelIds?: number[]): Promise<ApiResponse<void>> {
    return isLiveMode() ? realApi.bulkOperation(service, action, channelIds) : mockApi.bulkOperation(service, action, channelIds);
  },

  getConfig(channelId: number): Promise<ApiResponse<ChannelConfig>> {
    return isLiveMode() ? realApi.getConfig(channelId) : mockApi.getConfig(channelId);
  },

  saveConfig(channelId: number, config: ChannelConfig): Promise<ApiResponse<void>> {
    return isLiveMode() ? realApi.saveConfig(channelId, config) : mockApi.saveConfig(channelId, config);
  },

  applyConfig(channelId: number, config: ChannelConfig, restartServices: ServiceType[]): Promise<ApiResponse<void>> {
    return isLiveMode() ? realApi.applyConfig(channelId, config, restartServices) : mockApi.applyConfig(channelId, config, restartServices);
  },

  getStreamAnalyses(): Promise<ApiResponse<ChannelAnalysis[]>> {
    return isLiveMode() ? realApi.getStreamAnalyses() : mockApi.getStreamAnalyses();
  },

  getStreamAnalysis(channelId: number): Promise<ApiResponse<StreamAnalysis>> {
    return isLiveMode() ? realApi.getStreamAnalysis(channelId) : mockApi.getStreamAnalysis(channelId);
  },
};
