'use client';

import { SecurityAudit } from '@/types';
import { StatusLED } from './StatusLED';

interface SecurityPanelProps {
  audits: SecurityAudit[];
}

export function SecurityPanel({ audits }: SecurityPanelProps) {
  const rootContainers = audits.filter(a => a.isRoot);
  const nonRootContainers = audits.filter(a => !a.isRoot);
  const compliancePercent = audits.length > 0
    ? ((nonRootContainers.length / audits.length) * 100).toFixed(0)
    : '0';

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--status-warning)]">🔒</span>
            Security Audit
          </h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-data px-2 py-0.5 rounded ${
              rootContainers.length === 0
                ? 'bg-[var(--status-healthy)]/10 text-[var(--status-healthy)]'
                : 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]'
            }`}>
              {compliancePercent}% COMPLIANT
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-[var(--border-subtle)]">
        <div className="text-center">
          <p className="text-2xl font-data text-[var(--status-healthy)]">{nonRootContainers.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Non-Root</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-data ${rootContainers.length > 0 ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)]'}`}>
            {rootContainers.length}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Root</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-data text-[var(--text-primary)]">{audits.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Total</p>
        </div>
      </div>

      {/* Container List */}
      <div className="max-h-[300px] overflow-y-auto">
        <div className="divide-y divide-[var(--border-subtle)]">
          {audits.map(audit => (
            <div
              key={audit.containerId}
              className={`px-4 py-2 flex items-center justify-between hover:bg-[var(--bg-tertiary)]/50 transition-colors ${
                audit.isRoot ? 'bg-[var(--status-warning)]/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <StatusLED status={audit.isRoot ? 'warning' : 'healthy'} size="sm" pulse={false} />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{audit.containerName}</p>
                  <p className="text-xs text-[var(--text-muted)] font-data">{audit.containerId}</p>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-sm font-data ${
                  audit.isRoot ? 'text-[var(--status-warning)]' : 'text-[var(--status-healthy)]'
                }`}>
                  {audit.user}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-data">
                  UID: {audit.uid}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warning for root containers */}
      {rootContainers.length > 0 && (
        <div className="px-4 py-3 bg-[var(--status-warning)]/10 border-t border-[var(--status-warning)]/20">
          <p className="text-xs text-[var(--status-warning)]">
            ⚠ {rootContainers.length} container{rootContainers.length > 1 ? 's' : ''} running as root.
            Consider switching to non-root users for better security.
          </p>
        </div>
      )}
    </div>
  );
}
