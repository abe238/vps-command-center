'use client';

import { ContainerStats } from '@/types';
import { StatusLED } from './StatusLED';

interface ContainerCardProps {
  container: ContainerStats;
  appName?: string;
  domain?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function ContainerCard({ container, appName, domain }: ContainerCardProps) {
  const isRunning = container.status === 'running';
  const cpuBeatDuration = isRunning ? Math.max(0.5, 2 - container.cpu / 50) : 0;

  return (
    <div className="card p-4 relative overflow-hidden">
      {/* Glow effect for running containers */}
      {isRunning && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top left, var(--accent-glow), transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={isRunning ? 'heartbeat' : ''}
              style={{ '--beat-duration': `${cpuBeatDuration}s` } as React.CSSProperties}
            >
              <StatusLED status={container.status} size="lg" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] truncate max-w-[180px]">
                {appName || container.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-data truncate max-w-[180px]">
                {container.name}
              </p>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-data ${
            isRunning ? 'bg-[var(--status-healthy)]/10 text-[var(--status-healthy)]' :
            'bg-[var(--status-critical)]/10 text-[var(--status-critical)]'
          }`}>
            {container.status.toUpperCase()}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">CPU</span>
              <span className="font-data text-[var(--text-primary)]">{formatPercent(container.cpu)}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(container.cpu, 100)}%`,
                  backgroundColor: container.cpu > 80 ? 'var(--status-critical)' :
                                   container.cpu > 50 ? 'var(--status-warning)' :
                                   'var(--status-healthy)',
                }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">MEM</span>
              <span className="font-data text-[var(--text-primary)]">{formatPercent(container.memoryPercent)}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(container.memoryPercent, 100)}%`,
                  backgroundColor: container.memoryPercent > 80 ? 'var(--status-critical)' :
                                   container.memoryPercent > 50 ? 'var(--status-warning)' :
                                   'var(--status-info)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Details Row */}
        <div className="flex items-center justify-between text-xs border-t border-[var(--border-subtle)] pt-3">
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-muted)]">
              <span className="text-[var(--text-secondary)]">↑</span> {container.uptime || '--'}
            </span>
            <span className={`${
              container.uid === 0 || container.user === 'root'
                ? 'text-[var(--status-warning)]'
                : 'text-[var(--text-muted)]'
            }`}>
              {container.user || 'root'}
            </span>
          </div>
          <div className="flex items-center gap-2 font-data text-[var(--text-muted)]">
            <span title="Network RX">↓{formatBytes(container.networkRx)}</span>
            <span title="Network TX">↑{formatBytes(container.networkTx)}</span>
          </div>
        </div>

        {/* Domain link */}
        {domain && (
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-xs text-[var(--status-info)] hover:underline truncate"
          >
            {domain}
          </a>
        )}
      </div>
    </div>
  );
}
