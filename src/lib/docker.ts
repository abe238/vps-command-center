import { ContainerStats, ContainerStatus, SecurityAudit } from '@/types';
import http from 'http';

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

interface DockerContainer {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Image: string;
}

interface DockerInspect {
  Id: string;
  Name: string;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    Dead: boolean;
    StartedAt: string;
    Health?: {
      Status: string;
    };
  };
  Config: {
    User: string;
    Image: string;
  };
  RestartCount: number;
}

interface DockerStatsStream {
  cpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
    online_cpus: number;
  };
  precpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
  };
  memory_stats: {
    usage: number;
    limit: number;
  };
  networks?: {
    [key: string]: {
      rx_bytes: number;
      tx_bytes: number;
    };
  };
  blkio_stats?: {
    io_service_bytes_recursive?: Array<{
      op: string;
      value: number;
    }>;
  };
}

async function dockerFetch<T>(path: string, options?: { method?: string }): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path,
        method: options?.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Docker API error: ${res.statusCode} ${res.statusMessage}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Failed to parse Docker API response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export async function listContainers(): Promise<DockerContainer[]> {
  return dockerFetch<DockerContainer[]>('/containers/json?all=true');
}

export async function inspectContainer(id: string): Promise<DockerInspect> {
  return dockerFetch<DockerInspect>(`/containers/${id}/json`);
}

export async function getContainerStats(id: string): Promise<DockerStatsStream> {
  return dockerFetch<DockerStatsStream>(`/containers/${id}/stats?stream=false`);
}

function parseContainerStatus(state: DockerInspect['State']): ContainerStatus {
  if (state.Health?.Status === 'unhealthy') return 'unhealthy';
  if (state.Restarting) return 'restarting';
  if (state.Running) return 'running';
  if (state.Dead || !state.Running) return 'stopped';
  return 'unknown';
}

function calculateCpuPercent(stats: DockerStatsStream): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus || 1;
  if (systemDelta > 0 && cpuDelta > 0) {
    return (cpuDelta / systemDelta) * cpuCount * 100;
  }
  return 0;
}

function calculateUptime(startedAt: string): string {
  const started = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - started.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function getContainerMetrics(containerId: string): Promise<ContainerStats | null> {
  try {
    const [inspect, stats] = await Promise.all([
      inspectContainer(containerId),
      getContainerStats(containerId),
    ]);

    const networkRx = stats.networks
      ? Object.values(stats.networks).reduce((sum, n) => sum + n.rx_bytes, 0)
      : 0;
    const networkTx = stats.networks
      ? Object.values(stats.networks).reduce((sum, n) => sum + n.tx_bytes, 0)
      : 0;

    const blockRead = stats.blkio_stats?.io_service_bytes_recursive
      ?.find(s => s.op === 'read')?.value || 0;
    const blockWrite = stats.blkio_stats?.io_service_bytes_recursive
      ?.find(s => s.op === 'write')?.value || 0;

    const userConfig = inspect.Config.User || 'root';
    const uid = userConfig.includes(':') ? parseInt(userConfig.split(':')[0]) :
                /^\d+$/.test(userConfig) ? parseInt(userConfig) :
                userConfig === 'root' ? 0 : undefined;

    return {
      containerId: inspect.Id.substring(0, 12),
      name: inspect.Name.replace(/^\//, ''),
      status: parseContainerStatus(inspect.State),
      cpu: calculateCpuPercent(stats),
      memoryUsage: stats.memory_stats.usage,
      memoryLimit: stats.memory_stats.limit,
      memoryPercent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100,
      networkRx,
      networkTx,
      blockRead,
      blockWrite,
      user: userConfig || 'root',
      uid,
      uptime: calculateUptime(inspect.State.StartedAt),
      restartCount: inspect.RestartCount,
    };
  } catch (error) {
    console.error(`Failed to get metrics for ${containerId}:`, error);
    return null;
  }
}

export async function getAllContainerMetrics(): Promise<ContainerStats[]> {
  const containers = await listContainers();
  const metrics = await Promise.all(
    containers.map(c => getContainerMetrics(c.Id))
  );
  return metrics.filter((m): m is ContainerStats => m !== null);
}

export async function getSecurityAudit(): Promise<SecurityAudit[]> {
  const containers = await listContainers();
  const audits: SecurityAudit[] = [];

  for (const container of containers) {
    try {
      const inspect = await inspectContainer(container.Id);
      const userConfig = inspect.Config.User || '';
      const uid = userConfig.includes(':') ? parseInt(userConfig.split(':')[0]) :
                  /^\d+$/.test(userConfig) ? parseInt(userConfig) :
                  userConfig === '' || userConfig === 'root' ? 0 : -1;

      audits.push({
        containerId: container.Id.substring(0, 12),
        containerName: inspect.Name.replace(/^\//, ''),
        user: userConfig || 'root',
        uid: uid >= 0 ? uid : 0,
        isRoot: uid === 0 || userConfig === '' || userConfig === 'root',
        lastAudit: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to audit ${container.Names[0]}:`, error);
    }
  }

  return audits;
}

export async function restartContainer(id: string): Promise<void> {
  await dockerFetch(`/containers/${id}/restart`, { method: 'POST' });
}

export async function getContainerLogs(id: string, tail: number = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: DOCKER_SOCKET,
        path: `/containers/${id}/logs?stdout=true&stderr=true&tail=${tail}`,
        method: 'GET',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.end();
  });
}
