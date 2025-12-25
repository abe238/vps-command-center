'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Header,
  ContainerCard,
  CronJobPanel,
  SecurityPanel,
  HistoricalMetricsChart,
  TopConsumersPanel,
} from '@/components';
import { apps, cronJobs } from '@/config/apps';
import type { ContainerStats, SecurityAudit, SystemMetrics, CronJob } from '@/types';

const defaultSystemMetrics: SystemMetrics = {
  hostname: 'srv944870.hstgr.cloud',
  uptime: '--',
  loadAvg: [0, 0, 0],
  cpuPercent: 0,
  memoryTotal: 0,
  memoryUsed: 0,
  memoryPercent: 0,
  diskTotal: 0,
  diskUsed: 0,
  diskPercent: 0,
  timestamp: new Date().toISOString(),
};

const defaultCronJobs: CronJob[] = cronJobs.map(job => ({
  ...job,
  lastRun: undefined,
  lastStatus: 'unknown' as const,
}));

export default function Dashboard() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [containers, setContainers] = useState<ContainerStats[]>([]);
  const [security, setSecurity] = useState<SecurityAudit[]>([]);
  const [system, setSystem] = useState<SystemMetrics>(defaultSystemMetrics);
  const [jobs] = useState<CronJob[]>(defaultCronJobs);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/live');
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data = await res.json();

      if (data.containers) {
        setContainers(data.containers);
      }
      if (data.security) {
        setSecurity(data.security);
      }
      if (data.system) {
        setSystem(data.system);
      }

      setIsLive(true);
      setLastUpdate(new Date().toISOString());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch live metrics:', err);
      setIsLive(false);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, []);

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveMetrics]);

  const getAppForContainer = (containerName: string) => {
    return apps.find(app => app.container?.name === containerName);
  };

  const runningContainers = containers.filter(c => c.status === 'running').length;
  const nonRootPercent = security.length > 0
    ? ((security.filter(s => !s.isRoot).length / security.length) * 100).toFixed(0)
    : '0';
  const healthyJobs = jobs.filter(j => j.lastStatus === 'success').length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header system={system} lastUpdate={lastUpdate} isLive={isLive} />

      <main className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-[var(--status-error)]/10 border border-[var(--status-error)]/30 rounded-lg">
            <p className="text-sm text-[var(--status-error)]">
              Connection error: {error}. Retrying...
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">CONTAINERS</p>
            <p className="text-3xl font-data text-[var(--status-healthy)]">
              {runningContainers}
              <span className="text-lg text-[var(--text-muted)]">/{containers.length || '--'}</span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Running</p>
          </div>

          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">SECURITY</p>
            <p className={`text-3xl font-data ${
              security.filter(s => s.isRoot).length === 0
                ? 'text-[var(--status-healthy)]'
                : 'text-[var(--status-warning)]'
            }`}>
              {nonRootPercent}%
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Non-Root Compliance</p>
          </div>

          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">SCHEDULED</p>
            <p className="text-3xl font-data text-[var(--status-info)]">
              {healthyJobs}
              <span className="text-lg text-[var(--text-muted)]">/{jobs.length}</span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Jobs Healthy</p>
          </div>

          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">UPTIME</p>
            <p className="text-3xl font-data text-[var(--text-primary)]">{system.uptime}</p>
            <p className="text-xs text-[var(--text-secondary)]">System Uptime</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-8">
            <HistoricalMetricsChart />
          </div>
          <div className="col-span-4">
            <TopConsumersPanel />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Container Status
              </h2>
              <span className="text-xs text-[var(--text-muted)] font-data">
                {containers.length} containers
                {!isLive && ' (connecting...)'}
              </span>
            </div>

            {containers.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-[var(--text-muted)]">
                  {isLive ? 'No containers found' : 'Loading containers...'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {containers.map(container => {
                  const app = getAppForContainer(container.name);
                  return (
                    <ContainerCard
                      key={container.containerId}
                      container={container}
                      appName={app?.name}
                      domain={app?.domain}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="col-span-4 space-y-6">
            <SecurityPanel audits={security} />
            <CronJobPanel jobs={jobs} />
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-6 py-4 mt-auto">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>VPS Command Center v0.1.0</span>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1 ${isLive ? 'text-[var(--status-healthy)]' : 'text-[var(--status-warning)]'}`}>
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[var(--status-healthy)]' : 'bg-[var(--status-warning)]'} animate-pulse`} />
              {isLive ? 'Live' : 'Connecting'}
            </span>
            <span className="font-data">{system.hostname}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
