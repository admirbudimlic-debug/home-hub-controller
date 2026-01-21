// Backend configuration storage using localStorage

export interface BackendConfig {
  url: string;
}

const STORAGE_KEY = 'brateshub-backend-config';

const DEFAULT_CONFIG: BackendConfig = {
  url: 'http://localhost:3001',
};

/**
 * Normalize URL to handle IPv6 addresses
 * Converts: http://2a04:ee41:82:f38a::1:3001
 * To:       http://[2a04:ee41:82:f38a::1]:3001
 */
function normalizeUrl(input: string): string {
  // Trim trailing slash
  let url = input.replace(/\/+$/, '');
  
  // Already has brackets - assume correctly formatted
  if (url.includes('[')) {
    return url;
  }

  // Try to detect IPv6 without brackets
  // Pattern: protocol://ipv6address:port
  const ipv6Match = url.match(
    /^(https?:\/\/)([a-fA-F0-9:]+):(\d+)(\/.*)?$/
  );

  if (ipv6Match) {
    const [, protocol, ipv6, port, path = ''] = ipv6Match;
    // Check if it looks like IPv6 (multiple colons)
    if ((ipv6.match(/:/g) || []).length > 1) {
      return `${protocol}[${ipv6}]:${port}${path}`;
    }
  }

  return url;
}

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
  const updated = { 
    ...current, 
    ...config,
    url: config.url ? normalizeUrl(config.url) : current.url
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Dispatch event for components to react to config changes
  window.dispatchEvent(new CustomEvent('backend-config-change', { detail: updated }));
}

export function getBackendUrl(): string {
  return normalizeUrl(getBackendConfig().url);
}

export async function testBackendConnection(url?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = normalizeUrl(url || getBackendUrl());
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
