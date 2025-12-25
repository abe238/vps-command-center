'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TimeRange = '1h' | '24h' | '7d' | '30d';

interface MetricPoint {
  timestamp: number;
  containers: Record<string, { cpu: number; mem: number }>;
}

interface HistoryResponse {
  range: string;
  resolution: string;
  data: MetricPoint[];
  message?: string;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTime(timestamp: number, range: TimeRange): string {
  const date = new Date(timestamp * 1000);
  if (range === '1h' || range === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HistoricalMetricsChart() {
  const [range, setRange] = useState<TimeRange>('24h');
  const [metric, setMetric] = useState<'cpu' | 'memory'>('memory');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/metrics/history?range=${range}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [range]);

  const containerNames = data?.data?.length
    ? [...new Set(data.data.flatMap(d => Object.keys(d.containers)))]
    : [];

  const chartData = data?.data?.map(point => {
    const row: Record<string, number | string> = {
      time: formatTime(point.timestamp, range),
      timestamp: point.timestamp,
    };
    for (const name of containerNames) {
      const val = point.containers[name];
      if (val) {
        row[name] = metric === 'cpu' ? val.cpu : val.mem;
      }
    }
    return row;
  }) || [];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Resource Usage Over Time
        </h3>
        <div className="flex gap-2">
          <div className="flex bg-[var(--bg-secondary)] rounded-md p-0.5">
            {(['cpu', 'memory'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2 py-1 text-xs rounded ${
                  metric === m
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m === 'cpu' ? 'CPU' : 'Memory'}
              </button>
            ))}
          </div>
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
      </div>

      {loading && (
        <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
          Loading...
        </div>
      )}

      {error && (
        <div className="h-64 flex items-center justify-center text-[var(--status-error)]">
          {error}
        </div>
      )}

      {!loading && !error && data?.message && chartData.length === 0 && (
        <div className="h-64 flex items-center justify-center text-[var(--text-muted)] text-sm">
          {data.message}
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              stroke="var(--border-subtle)"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              stroke="var(--border-subtle)"
              tickFormatter={val => metric === 'cpu' ? `${(val ?? 0).toFixed(0)}%` : formatBytes(val ?? 0)}
              width={60}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const sorted = [...payload]
                  .filter(p => p.value !== undefined && p.value !== null)
                  .sort((a, b) => (b.value as number) - (a.value as number));
                return (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}>
                    <div style={{ marginBottom: '6px', color: 'var(--text-primary)' }}>{label}</div>
                    {sorted.map((entry) => (
                      <div key={entry.dataKey} style={{ color: entry.color, marginBottom: '2px' }}>
                        {String(entry.name).replace(/^root[-_]?/, '').replace(/-1$/, '')} : {
                          metric === 'cpu'
                            ? `${((entry.value as number) ?? 0).toFixed(2)}%`
                            : formatBytes((entry.value as number) ?? 0)
                        }
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={(value) => value.replace(/^root[-_]?/, '').replace(/-1$/, '')}
            />
            {containerNames.slice(0, 10).map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                name={name.replace(/^root[-_]?/, '').replace(/-1$/, '')}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
