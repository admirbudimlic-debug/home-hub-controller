// Backend configuration storage using localStorage

export interface BackendConfig {
  url: string;
  mode: 'mock' | 'live';
}

const STORAGE_KEY = 'brateshub-backend-config';

const DEFAULT_CONFIG: BackendConfig = {
  url: 'http://localhost:3001',
  mode: 'mock',
};

export function getBackendConfig(): BackendConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to parse backend config:', e);
  }
  return DEFAULT_CONFIG;
}

export function setBackendConfig(config: Partial<BackendConfig>): void {
  const current = getBackendConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Dispatch event for components to react to config changes
  window.dispatchEvent(new CustomEvent('backend-config-change', { detail: updated }));
}

export function isLiveMode(): boolean {
  return getBackendConfig().mode === 'live';
}

export function getBackendUrl(): string {
  return getBackendConfig().url;
}

export async function testBackendConnection(url?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = url || getBackendUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${targetUrl}/api/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { success: true, message: 'Connected successfully' };
    }
    return { success: false, message: `Server returned ${response.status}` };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, message: 'Connection timed out' };
      }
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Connection failed' };
  }
}
