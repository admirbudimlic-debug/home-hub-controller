import { IloStatus, IloCredentials } from '@/types/ilo';

// Storage keys
const CREDENTIALS_KEY = 'ilo_credentials';
const API_URL_KEY = 'ilo_api_url';

// Default to mock mode, set API URL to enable real mode
let apiBaseUrl: string | null = localStorage.getItem(API_URL_KEY);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// MOCK DATA (used when no backend is configured)
// ============================================

let mockIloStatus: IloStatus = {
  connected: true,
  hostname: 'hp-server-ilo.local',
  powerState: 'on',
  health: 'ok',
  model: 'ProLiant DL380 Gen10',
  serialNumber: 'CZ12345678',
  biosVersion: 'U30 v2.62',
  iloVersion: 'iLO 5 v2.72',
  temperatures: {
    inlet: 24,
    cpu1: 42,
    cpu2: 45,
  },
  fans: [
    { name: 'Fan 1', speed: 18, status: 'ok' },
    { name: 'Fan 2', speed: 18, status: 'ok' },
    { name: 'Fan 3', speed: 22, status: 'ok' },
    { name: 'Fan 4', speed: 20, status: 'ok' },
  ],
  powerConsumption: 187,
  uptime: '14d 6h 32m',
  lastBootTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
};

// ============================================
// API IMPLEMENTATION
// ============================================

export const iloApi = {
  // Backend URL management
  getApiUrl: (): string | null => {
    return apiBaseUrl;
  },

  setApiUrl: (url: string | null): void => {
    apiBaseUrl = url;
    if (url) {
      localStorage.setItem(API_URL_KEY, url);
    } else {
      localStorage.removeItem(API_URL_KEY);
    }
  },

  isUsingRealBackend: (): boolean => {
    return !!apiBaseUrl;
  },

  // Credentials management (stored locally, sent to backend when needed)
  getCredentials: (): IloCredentials | null => {
    try {
      const stored = localStorage.getItem(CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  saveCredentials: (credentials: IloCredentials): void => {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  },

  clearCredentials: (): void => {
    localStorage.removeItem(CREDENTIALS_KEY);
  },

  // Test connection
  async testConnection(credentials: IloCredentials): Promise<{ success: boolean; message?: string; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }
    
    // Mock mode
    await delay(1500);
    if (credentials.host && credentials.username && credentials.password) {
      return { success: true, message: 'Connection successful (mock)' };
    }
    return { success: false, error: 'Invalid credentials' };
  },

  // Get iLO status
  async getStatus(): Promise<{ success: boolean; data?: IloStatus; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/status`);
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }

    // Mock mode
    await delay(300);
    return { success: true, data: { ...mockIloStatus } };
  },

  // Power on server
  async powerOn(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/power/powerOn`, { method: 'POST' });
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }

    // Mock mode
    await delay(2000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true, message: 'Power on command sent successfully' };
  },

  // Power off server (graceful)
  async powerOff(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/power/powerOff`, { method: 'POST' });
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }

    // Mock mode
    await delay(3000);
    mockIloStatus.powerState = 'off';
    return { success: true, message: 'Graceful shutdown initiated' };
  },

  // Force power off
  async forcePowerOff(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/power/forcePowerOff`, { method: 'POST' });
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }

    // Mock mode
    await delay(1000);
    mockIloStatus.powerState = 'off';
    return { success: true, message: 'Force power off executed' };
  },

  // Reset/reboot server
  async reset(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/power/reset`, { method: 'POST' });
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }

    // Mock mode
    await delay(2000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true, message: 'System reset initiated' };
  },

  // Cold boot (power cycle)
  async powerCycle(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/ilo/power/powerCycle`, { method: 'POST' });
        return response.json();
      } catch (error) {
        return { success: false, error: 'Failed to connect to backend server' };
      }
    }

    // Mock mode
    await delay(4000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true, message: 'Power cycle initiated' };
  },

  // Send credentials to backend
  async configureBackend(credentials: IloCredentials): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!apiBaseUrl) {
      return { success: false, error: 'Backend URL not configured' };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/ilo/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'Failed to connect to backend server' };
    }
  },

  // Check backend health
  async checkBackendHealth(): Promise<{ success: boolean; configured?: boolean; host?: string; error?: string }> {
    if (!apiBaseUrl) {
      return { success: true, configured: false };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      const data = await response.json();
      return { success: true, ...data };
    } catch (error) {
      return { success: false, error: 'Failed to connect to backend server' };
    }
  }
};
