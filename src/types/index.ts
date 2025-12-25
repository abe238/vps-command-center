export type DeploymentType = 'docker' | 'coolify' | 'direct';
export type HealthMethod = 'http' | 'tcp' | 'docker';
export type ContainerStatus = 'running' | 'stopped' | 'restarting' | 'unhealthy' | 'unknown';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export interface AppConfig {
  id: string;
  name: string;
  type: DeploymentType;
  container?: {
    name: string;
    image?: string;
  };
  health: {
    endpoint: string;
    method: HealthMethod;
    expectedStatus?: number;
    timeout?: number;
  };
  metrics: {
    enabled: boolean;
    collectInterval: number;
  };
  dependencies?: {
    github?: string;
    packageManager?: 'npm' | 'pip' | 'cargo' | 'go';
  };
  domain?: string;
  port?: number;
  tags?: string[];
}

export interface ContainerStats {
  containerId: string;
  name: string;
  status: ContainerStatus;
  cpu: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
  user?: string;
  uid?: number;
  uptime?: string;
  restartCount?: number;
}

export interface HealthCheck {
  appId: string;
  status: HealthStatus;
  responseTime: number;
  statusCode?: number;
  message?: string;
  lastCheck: string;
  uptimePercent?: number;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleHuman: string;
  command: string;
  lastRun?: string;
  lastStatus: 'success' | 'failed' | 'unknown';
  nextRun?: string;
  type: 'cron' | 'systemd-timer';
}

export interface SecurityAudit {
  containerId: string;
  containerName: string;
  user: string;
  uid: number | string;
  isRoot: boolean;
  lastAudit: string;
}

export interface DependabotAlert {
  repo: string;
  alertCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  lastUpdated: string;
}

export interface SystemMetrics {
  hostname: string;
  uptime: string;
  loadAvg: [number, number, number];
  cpuPercent: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryPercent: number;
  diskTotal: number;
  diskUsed: number;
  diskPercent: number;
  timestamp: string;
}

export interface DashboardData {
  system: SystemMetrics;
  containers: ContainerStats[];
  health: HealthCheck[];
  security: SecurityAudit[];
  cronJobs: CronJob[];
  dependabot?: DependabotAlert[];
}
