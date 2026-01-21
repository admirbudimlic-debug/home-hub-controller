// Real API service that makes actual fetch calls to the backend

import { Channel, ChannelConfig, LogEntry, ServiceType, ApiResponse } from '@/types/channel';
import { StreamAnalysis, ChannelAnalysis } from '@/types/stream';
import { getBackendUrl } from './backendConfig';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${getBackendUrl()}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || `Request failed with status ${response.status}` };
    }

    return { success: true, data: data.data ?? data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    console.error(`API Error [${endpoint}]:`, message);
    return { success: false, error: message };
  }
}

export const realApi = {
  // Get all channels with status
  async getChannels(): Promise<ApiResponse<Channel[]>> {
    return fetchApi<Channel[]>('/api/channels');
  },

  // Get single channel
  async getChannel(id: number): Promise<ApiResponse<Channel>> {
    return fetchApi<Channel>(`/api/channels/${id}`);
  },

  // Get logs for a service
  async getLogs(channelId: number, service: ServiceType, lines: number = 50): Promise<ApiResponse<LogEntry[]>> {
    return fetchApi<LogEntry[]>(`/api/logs/${5000 + channelId}/${service}?lines=${lines}`);
  },

  // Start a service
  async startService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/api/services/${5000 + channelId}/${service}/start`, { method: 'POST' });
  },

  // Stop a service
  async stopService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/api/services/${5000 + channelId}/${service}/stop`, { method: 'POST' });
  },

  // Restart a service
  async restartService(channelId: number, service: ServiceType): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/api/services/${5000 + channelId}/${service}/restart`, { method: 'POST' });
  },

  // Bulk operations
  async bulkOperation(service: ServiceType, action: 'start' | 'stop' | 'restart', channelIds?: number[]): Promise<ApiResponse<void>> {
    const body = channelIds ? { channelIds: channelIds.map(id => 5000 + id) } : {};
    return fetchApi<void>(`/api/services/bulk/${service}/${action}`, { 
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Get config
  async getConfig(channelId: number): Promise<ApiResponse<ChannelConfig>> {
    return fetchApi<ChannelConfig>(`/api/channels/${channelId}/config`);
  },

  // Save config
  async saveConfig(channelId: number, config: ChannelConfig): Promise<ApiResponse<void>> {
    return fetchApi<void>(`/api/channels/${channelId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  // Apply config (save + restart affected services)
  async applyConfig(channelId: number, config: ChannelConfig, restartServices: ServiceType[]): Promise<ApiResponse<void>> {
    // First save the config
    const saveResult = await this.saveConfig(channelId, config);
    if (!saveResult.success) return saveResult;

    // Then restart each service
    for (const service of restartServices) {
      const restartResult = await this.restartService(channelId, service);
      if (!restartResult.success) return restartResult;
    }
    return { success: true };
  },

  // Get stream analysis for all channels (lightweight bitrate only)
  async getStreamAnalyses(): Promise<ApiResponse<ChannelAnalysis[]>> {
    // Fetch analyses for all 9 channels in parallel
    const promises = Array.from({ length: 9 }, (_, i) => 
      fetchApi<{ available: boolean; bitrate?: { total: number; totalMbps: string } }>(
        `/api/analyze/${5001 + i}/bitrate`
      ).then(result => ({
        channelId: i + 1,
        available: result.success && result.data?.available,
        timestamp: new Date().toISOString(),
        bitrate: result.success && result.data?.available ? result.data.bitrate : undefined,
      }))
    );

    const analyses = await Promise.all(promises);
    return { success: true, data: analyses };
  },

  // Get detailed stream analysis for a single channel
  async getStreamAnalysis(channelId: number): Promise<ApiResponse<StreamAnalysis>> {
    return fetchApi<StreamAnalysis>(`/api/analyze/${5000 + channelId}`);
  },
};
