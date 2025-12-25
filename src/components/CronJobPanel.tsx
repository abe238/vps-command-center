'use client';

import { CronJob } from '@/types';
import { StatusLED } from './StatusLED';

interface CronJobPanelProps {
  jobs: CronJob[];
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function CronJobPanel({ jobs }: CronJobPanelProps) {
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--status-info)]">⏱</span>
            Scheduled Processes
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-data px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">
            {jobs.length} JOBS
          </span>
        </div>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {jobs.map(job => (
          <div key={job.id} className="px-4 py-3 hover:bg-[var(--bg-tertiary)]/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusLED
                  status={job.lastStatus === 'success' ? 'healthy' : job.lastStatus === 'failed' ? 'critical' : 'offline'}
                  size="md"
                />
                <div>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{job.name}</p>
                  <p className="text-xs text-[var(--text-muted)] font-data">{job.scheduleHuman}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-[var(--text-secondary)]">Last run</p>
                <p className={`text-xs font-data ${
                  job.lastStatus === 'success' ? 'text-[var(--status-healthy)]' :
                  job.lastStatus === 'failed' ? 'text-[var(--status-critical)]' :
                  'text-[var(--text-muted)]'
                }`}>
                  {timeAgo(job.lastRun)}
                  {job.lastStatus === 'success' && ' ✓'}
                  {job.lastStatus === 'failed' && ' ✗'}
                </p>
              </div>
            </div>

            {/* Command preview */}
            <div className="mt-2 px-8">
              <code className="text-xs text-[var(--text-muted)] font-data bg-[var(--bg-primary)] px-2 py-1 rounded block truncate">
                {job.command}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
