export type ServerPowerState = 'on' | 'off' | 'unknown';
export type IloHealth = 'ok' | 'warning' | 'critical' | 'unknown';

export interface IloStatus {
  connected: boolean;
  hostname: string;
  powerState: ServerPowerState;
  health: IloHealth;
  model: string;
  serialNumber: string;
  biosVersion: string;
  iloVersion: string;
  temperatures: {
    inlet: number;
    cpu1: number;
    cpu2?: number;
  };
  fans: {
    name: string;
    speed: number;
    status: 'ok' | 'warning' | 'failed';
  }[];
  powerConsumption: number; // watts
  uptime: string;
  lastBootTime: string;
}

export interface IloCredentials {
  host: string;
  username: string;
  password: string;
}
