import { IloStatus, IloCredentials } from '@/types/ilo';

// Storage key for credentials
const CREDENTIALS_KEY = 'ilo_credentials';

// Simulated iLO status
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const iloApi = {
  // Credentials management
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

  // Get iLO status
  async getStatus(): Promise<{ success: boolean; data?: IloStatus; error?: string }> {
    await delay(300);
    return { success: true, data: { ...mockIloStatus } };
  },

  // Power on server
  async powerOn(): Promise<{ success: boolean; message?: string; error?: string }> {
    await delay(2000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true, message: 'Power on command sent successfully' };
  },

  // Power off server (graceful)
  async powerOff(): Promise<{ success: boolean; message?: string; error?: string }> {
    await delay(3000);
    mockIloStatus.powerState = 'off';
    return { success: true, message: 'Graceful shutdown initiated' };
  },

  // Force power off
  async forcePowerOff(): Promise<{ success: boolean; message?: string; error?: string }> {
    await delay(1000);
    mockIloStatus.powerState = 'off';
    return { success: true, message: 'Force power off executed' };
  },

  // Reset/reboot server
  async reset(): Promise<{ success: boolean; message?: string; error?: string }> {
    await delay(2000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true, message: 'System reset initiated' };
  },

  // Cold boot (power cycle)
  async powerCycle(): Promise<{ success: boolean; message?: string; error?: string }> {
    await delay(4000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true, message: 'Power cycle initiated' };
  },

  // Test connection
  async testConnection(credentials: IloCredentials): Promise<{ success: boolean; message?: string; error?: string }> {
    await delay(1500);
    // Simulate connection test - in production this would make a real Redfish API call
    if (credentials.host && credentials.username && credentials.password) {
      return { success: true, message: 'Connection successful' };
    }
    return { success: false, error: 'Could not connect to iLO' };
  },
};
