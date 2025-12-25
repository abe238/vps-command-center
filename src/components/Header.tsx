'use client';

import { SystemMetrics } from '@/types';
import { StatusLED } from './StatusLED';

interface HeaderProps {
  system?: SystemMetrics;
  lastUpdate?: string;
  isLive?: boolean;
}

export function Header({ system, lastUpdate, isLive = false }: HeaderProps) {
  return (
    <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[var(--status-healthy)]/20 flex items-center justify-center">
              <span className="text-[var(--status-healthy)] font-bold text-sm">⬡</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                VPS Command Center
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-data">
                {system?.hostname || 'srv944870.hstgr.cloud'}
              </p>
            </div>
          </div>
        </div>

        {/* System Quick Stats */}
        <div className="flex items-center gap-6">
          {system && (
            <>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">CPU</p>
                <p className={`font-data text-sm ${
                  system.cpuPercent > 80 ? 'text-[var(--status-critical)]' :
                  system.cpuPercent > 50 ? 'text-[var(--status-warning)]' :
                  'text-[var(--text-primary)]'
                }`}>
                  {(system.cpuPercent ?? 0).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">Memory</p>
                <p className={`font-data text-sm ${
                  system.memoryPercent > 80 ? 'text-[var(--status-critical)]' :
                  system.memoryPercent > 50 ? 'text-[var(--status-warning)]' :
                  'text-[var(--text-primary)]'
                }`}>
                  {(system.memoryPercent ?? 0).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">Disk</p>
                <p className={`font-data text-sm ${
                  system.diskPercent > 90 ? 'text-[var(--status-critical)]' :
                  system.diskPercent > 70 ? 'text-[var(--status-warning)]' :
                  'text-[var(--text-primary)]'
                }`}>
                  {(system.diskPercent ?? 0).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">Uptime</p>
                <p className="font-data text-sm text-[var(--text-primary)]">
                  {system.uptime}
                </p>
              </div>
            </>
          )}

          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded">
            <StatusLED status={isLive ? 'healthy' : 'offline'} size="sm" />
            <span className="text-xs text-[var(--text-secondary)]">
              {isLive ? 'LIVE' : 'OFFLINE'}
            </span>
            {lastUpdate && (
              <span className="text-xs text-[var(--text-muted)] font-data">
                {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
