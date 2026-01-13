import { IloStatus, ServerPowerState } from '@/types/ilo';

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
  // Get iLO status
  async getStatus(): Promise<{ success: boolean; data?: IloStatus; error?: string }> {
    await delay(300);
    return { success: true, data: { ...mockIloStatus } };
  },

  // Power on server
  async powerOn(): Promise<{ success: boolean; error?: string }> {
    await delay(2000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true };
  },

  // Power off server (graceful)
  async powerOff(): Promise<{ success: boolean; error?: string }> {
    await delay(3000);
    mockIloStatus.powerState = 'off';
    return { success: true };
  },

  // Force power off
  async forcePowerOff(): Promise<{ success: boolean; error?: string }> {
    await delay(1000);
    mockIloStatus.powerState = 'off';
    return { success: true };
  },

  // Reset/reboot server
  async reset(): Promise<{ success: boolean; error?: string }> {
    await delay(2000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true };
  },

  // Cold boot (power cycle)
  async powerCycle(): Promise<{ success: boolean; error?: string }> {
    await delay(4000);
    mockIloStatus.powerState = 'on';
    mockIloStatus.lastBootTime = new Date().toISOString();
    mockIloStatus.uptime = '0h 0m';
    return { success: true };
  },

  // Test connection
  async testConnection(host: string): Promise<{ success: boolean; error?: string }> {
    await delay(1500);
    // Simulate connection test
    if (host.includes('ilo') || host.includes('192.168')) {
      return { success: true };
    }
    return { success: false, error: 'Could not connect to iLO' };
  },
};
