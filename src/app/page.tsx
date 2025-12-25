'use client';

import { useState, useEffect } from 'react';
import { Header, ContainerCard, CronJobPanel, SecurityPanel } from '@/components';
import { apps, cronJobs } from '@/config/apps';
import type { ContainerStats, SecurityAudit, SystemMetrics, CronJob } from '@/types';

const mockSystemMetrics: SystemMetrics = {
  hostname: 'srv944870.hstgr.cloud',
  uptime: '45d 12h',
  loadAvg: [0.5, 0.7, 0.6],
  cpuPercent: 23.5,
  memoryTotal: 8589934592,
  memoryUsed: 4294967296,
  memoryPercent: 50.0,
  diskTotal: 107374182400,
  diskUsed: 42949672960,
  diskPercent: 40.0,
  timestamp: new Date().toISOString(),
};

const mockContainers: ContainerStats[] = apps
  .filter(app => app.container)
  .map((app, i) => ({
    containerId: `abc${i}123def`,
    name: app.container!.name,
    status: 'running' as const,
    cpu: Math.random() * 30,
    memoryUsage: Math.random() * 500 * 1024 * 1024,
    memoryLimit: 512 * 1024 * 1024,
    memoryPercent: Math.random() * 60,
    networkRx: Math.random() * 100 * 1024 * 1024,
    networkTx: Math.random() * 50 * 1024 * 1024,
    blockRead: Math.random() * 1024 * 1024 * 1024,
    blockWrite: Math.random() * 512 * 1024 * 1024,
    user: app.id.includes('n8n') || app.id.includes('coolify') ? 'root' : 'nginx',
    uid: app.id.includes('n8n') || app.id.includes('coolify') ? 0 : 101,
    uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h`,
    restartCount: Math.floor(Math.random() * 3),
  }));

const mockSecurityAudits: SecurityAudit[] = mockContainers.map(c => ({
  containerId: c.containerId,
  containerName: c.name,
  user: c.user || 'root',
  uid: c.uid || 0,
  isRoot: c.uid === 0 || !c.user || c.user === 'root',
  lastAudit: new Date().toISOString(),
}));

const mockCronJobs: CronJob[] = cronJobs.map(job => ({
  ...job,
  lastRun: new Date(Date.now() - Math.random() * 1000 * 60 * 60).toISOString(),
  lastStatus: Math.random() > 0.1 ? 'success' as const : 'failed' as const,
}));

export default function Dashboard() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [containers, setContainers] = useState<ContainerStats[]>(mockContainers);
  const [security, setSecurity] = useState<SecurityAudit[]>(mockSecurityAudits);
  const [system, setSystem] = useState<SystemMetrics>(mockSystemMetrics);
  const [jobs, setJobs] = useState<CronJob[]>(mockCronJobs);

  useEffect(() => {
    const connectLive = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          setIsLive(true);
        }
      } catch {
        setIsLive(false);
      }
    };
    connectLive();

    const interval = setInterval(() => {
      setLastUpdate(new Date().toISOString());
      setContainers(prev => prev.map(c => ({
        ...c,
        cpu: Math.max(0, c.cpu + (Math.random() - 0.5) * 5),
        memoryPercent: Math.max(0, Math.min(100, c.memoryPercent + (Math.random() - 0.5) * 2)),
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getAppForContainer = (containerName: string) => {
    return apps.find(app => app.container?.name === containerName);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header system={system} lastUpdate={lastUpdate} isLive={isLive} />

      <main className="p-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">CONTAINERS</p>
            <p className="text-3xl font-data text-[var(--status-healthy)]">
              {containers.filter(c => c.status === 'running').length}
              <span className="text-lg text-[var(--text-muted)]">/{containers.length}</span>
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
              {((security.filter(s => !s.isRoot).length / security.length) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Non-Root Compliance</p>
          </div>

          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">SCHEDULED</p>
            <p className="text-3xl font-data text-[var(--status-info)]">
              {jobs.filter(j => j.lastStatus === 'success').length}
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

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Container Grid - 8 cols */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Container Status
              </h2>
              <span className="text-xs text-[var(--text-muted)] font-data">
                {containers.length} containers
              </span>
            </div>

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
          </div>

          {/* Side Panels - 4 cols */}
          <div className="col-span-4 space-y-6">
            <SecurityPanel audits={security} />
            <CronJobPanel jobs={jobs} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] px-6 py-4 mt-auto">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>VPS Command Center v0.1.0</span>
          <span className="font-data">{system.hostname}</span>
        </div>
      </footer>
    </div>
  );
}
