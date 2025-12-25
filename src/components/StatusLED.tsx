'use client';

import { HealthStatus, ContainerStatus } from '@/types';

interface StatusLEDProps {
  status: HealthStatus | ContainerStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-[var(--status-healthy)]',
  running: 'bg-[var(--status-healthy)]',
  warning: 'bg-[var(--status-warning)]',
  restarting: 'bg-[var(--status-warning)]',
  critical: 'bg-[var(--status-critical)]',
  unhealthy: 'bg-[var(--status-critical)]',
  stopped: 'bg-[var(--status-critical)]',
  offline: 'bg-[var(--status-offline)]',
  unknown: 'bg-[var(--status-offline)]',
};

const pulseClasses: Record<string, string> = {
  healthy: 'pulse-healthy',
  running: 'pulse-healthy',
  warning: 'pulse-warning',
  restarting: 'pulse-warning',
  critical: 'pulse-critical',
  unhealthy: 'pulse-critical',
  stopped: '',
  offline: '',
  unknown: '',
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusLED({ status, size = 'md', pulse = true }: StatusLEDProps) {
  const colorClass = statusColors[status] || statusColors.unknown;
  const pulseClass = pulse ? pulseClasses[status] || '' : '';
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-block rounded-full ${sizeClass} ${colorClass} ${pulseClass}`}
      title={status}
    />
  );
}
