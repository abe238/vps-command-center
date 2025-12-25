'use client';

import { useState, useEffect } from 'react';

type TimeRange = '1h' | '24h' | '7d' | '30d';

interface TopConsumer {
  container: string;
  avg: number;
  max: number;
}

interface TopResponse {
  range: string;
  metric: string;
  top: TopConsumer[];
  source?: string;
  message?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatContainerName(name: string): string {
  return name.replace(/^root[-_]?/, '').replace(/-1$/, '');
}

export function TopConsumersPanel() {
  const [range, setRange] = useState<TimeRange>('24h');
  const [cpuData, setCpuData] = useState<TopResponse | null>(null);
  const [memData, setMemData] = useState<TopResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [cpuRes, memRes] = await Promise.all([
          fetch(`/api/metrics/top?range=${range}&metric=cpu&limit=5`),
          fetch(`/api/metrics/top?range=${range}&metric=memory&limit=5`),
        ]);
        if (cpuRes.ok) setCpuData(await cpuRes.json());
        if (memRes.ok) setMemData(await memRes.json());
      } catch (err) {
        console.error('Failed to fetch top consumers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [range]);

  const maxCpu = cpuData?.top?.length ? Math.max(...cpuData.top.map(t => t.avg)) : 1;
  const maxMem = memData?.top?.length ? Math.max(...memData.top.map(t => t.avg)) : 1;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Top Consumers
        </h3>
        <div className="flex bg-[var(--bg-secondary)] rounded-md p-0.5">
          {(['1h', '24h', '7d', '30d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-xs rounded ${
                range === r
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-[var(--text-muted)]">
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              CPU Usage
            </p>
            {cpuData?.top?.length ? (
              <div className="space-y-2">
                {cpuData.top.map((item, i) => (
                  <div key={item.container} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-primary)] truncate">
                          {formatContainerName(item.container)}
                        </span>
                        <span className="text-xs font-data text-[var(--text-secondary)]">
                          {(item.avg ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--status-info)] rounded-full transition-all"
                          style={{ width: `${(item.avg / maxCpu) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No data</p>
            )}
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Memory Usage
            </p>
            {memData?.top?.length ? (
              <div className="space-y-2">
                {memData.top.map((item, i) => (
                  <div key={item.container} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-primary)] truncate">
                          {formatContainerName(item.container)}
                        </span>
                        <span className="text-xs font-data text-[var(--text-secondary)]">
                          {formatBytes(item.avg)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--status-warning)] rounded-full transition-all"
                          style={{ width: `${(item.avg / maxMem) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No data</p>
            )}
          </div>
        </div>
      )}

      {(cpuData?.source === 'live' || memData?.source === 'live') && (
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          Showing live data. Historical data available after cron setup.
        </p>
      )}
    </div>
  );
}
