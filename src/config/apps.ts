import { AppConfig } from '@/types';

export const VPS_HOST = 'srv944870.hstgr.cloud';
export const VPS_IP = '72.60.28.52';
export const COOLIFY_API_URL = 'http://localhost:8000/api';

export const apps: AppConfig[] = [
  {
    id: 'magic-kid-routines',
    name: 'Magic Kid Routines',
    type: 'docker',
    container: { name: 'root-magic-kid-routines-1' },
    health: {
      endpoint: `https://magic-kid-routines.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 30 },
    dependencies: { github: 'abe238/magic-kid-routines', packageManager: 'npm' },
    domain: `magic-kid-routines.${VPS_HOST}`,
    tags: ['frontend', 'nginx', 'react'],
  },
  {
    id: 'yt-tool-extraction',
    name: 'YT Tool Extraction',
    type: 'docker',
    container: { name: 'root-yt-tool-extraction-1' },
    health: {
      endpoint: `https://yt-tool-extraction.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 30 },
    dependencies: { github: 'abe238/yt-tool-extraction', packageManager: 'npm' },
    domain: `yt-tool-extraction.${VPS_HOST}`,
    tags: ['backend', 'node', 'yt-dlp'],
  },
  {
    id: 'gip',
    name: 'GIP',
    type: 'docker',
    container: { name: 'root-gip-1' },
    health: {
      endpoint: `https://gip.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 30 },
    dependencies: { github: 'abe238/gip', packageManager: 'npm' },
    domain: `gip.${VPS_HOST}`,
    tags: ['frontend', 'nginx'],
  },
  {
    id: 'taptally',
    name: 'TapTally',
    type: 'docker',
    container: { name: 'root-taptally-site-1' },
    health: {
      endpoint: `https://taptally.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 30 },
    dependencies: { github: 'abe238/taptally', packageManager: 'npm' },
    domain: `taptally.${VPS_HOST}`,
    tags: ['frontend', 'nginx'],
  },
  {
    id: 'know-your-honey',
    name: 'Know Your Honey',
    type: 'docker',
    container: { name: 'root-know-your-honey-1' },
    health: {
      endpoint: `https://know-your-honey.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 30 },
    dependencies: { github: 'abe238/know-your-honey', packageManager: 'npm' },
    domain: `know-your-honey.${VPS_HOST}`,
    tags: ['frontend', 'nginx', 'react'],
  },
  {
    id: 'n8n',
    name: 'N8N Automation',
    type: 'docker',
    container: { name: 'root_n8n_1' },
    health: {
      endpoint: `https://n8n.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 60 },
    domain: `n8n.${VPS_HOST}`,
    tags: ['automation', 'workflow'],
  },
  {
    id: 'coolify',
    name: 'Coolify',
    type: 'coolify',
    container: { name: 'coolify' },
    health: {
      endpoint: 'http://localhost:8000',
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 60 },
    domain: `${VPS_IP}:8000`,
    port: 8000,
    tags: ['infrastructure', 'deployment'],
  },
  {
    id: 'traefik',
    name: 'Traefik Proxy',
    type: 'docker',
    container: { name: 'coolify-proxy' },
    health: {
      endpoint: 'http://localhost:80',
      method: 'tcp',
    },
    metrics: { enabled: true, collectInterval: 30 },
    port: 80,
    tags: ['infrastructure', 'proxy'],
  },
  {
    id: 'perf-mgmt-dashboard',
    name: 'Perf Mgmt Dashboard',
    type: 'docker',
    container: { name: 'root-perf-mgmt-dashboard-1' },
    health: {
      endpoint: `https://perf-mgmt-dashboard.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 60 },
    domain: `perf-mgmt-dashboard.${VPS_HOST}`,
    tags: ['frontend', 'dashboard'],
  },
  {
    id: 'cca-km',
    name: 'CCA Knowledge Management',
    type: 'docker',
    container: { name: 'root-cca-km-1' },
    health: {
      endpoint: `https://cca-km.${VPS_HOST}`,
      method: 'http',
      expectedStatus: 200,
    },
    metrics: { enabled: true, collectInterval: 60 },
    dependencies: { github: 'abe238/cca-km', packageManager: 'npm' },
    domain: `cca-km.${VPS_HOST}`,
    tags: ['frontend', 'knowledge'],
  },
  {
    id: 'livekit',
    name: 'LiveKit',
    type: 'docker',
    container: { name: 'root-livekit-1' },
    health: {
      endpoint: 'http://localhost:7880',
      method: 'tcp',
    },
    metrics: { enabled: true, collectInterval: 60 },
    port: 7880,
    tags: ['infrastructure', 'webrtc'],
  },
];

export const cronJobs = [
  {
    id: 'health-check',
    name: 'VPS Endpoint Health Check',
    schedule: '*/5 * * * *',
    scheduleHuman: 'Every 5 minutes',
    command: '/root/vps-endpoint-health.sh',
    type: 'cron' as const,
  },
  {
    id: 'security-monitor',
    name: 'Security Monitor',
    schedule: '*/5 * * * *',
    scheduleHuman: 'Every 5 minutes',
    command: '/root/security-monitor.sh',
    type: 'cron' as const,
  },
  {
    id: 'ytdlp-update',
    name: 'yt-dlp Update',
    schedule: '0 3 * * *',
    scheduleHuman: 'Daily at 3 AM',
    command: '/root/update-ytdlp.sh',
    type: 'cron' as const,
  },
  {
    id: 'version-checker',
    name: 'Weekly Version Checker',
    schedule: '0 0 * * 0',
    scheduleHuman: 'Weekly on Sunday',
    command: '/root/version-checker.sh',
    type: 'cron' as const,
  },
];

export function getAppById(id: string): AppConfig | undefined {
  return apps.find(app => app.id === id);
}

export function getAppsByTag(tag: string): AppConfig[] {
  return apps.filter(app => app.tags?.includes(tag));
}

export function getAppsByType(type: AppConfig['type']): AppConfig[] {
  return apps.filter(app => app.type === type);
}
