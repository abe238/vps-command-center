import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';

const DB_PATH = process.env.METRICS_DB_PATH || '/data/metrics/metrics.db';

type TimeRange = '1h' | '24h' | '7d' | '30d';

interface MetricPoint {
  timestamp: number;
  containers: Record<string, { cpu: number; mem: number }>;
}

function getRangeParams(range: TimeRange): { startTime: number; table: string; timeColumn: string } {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case '1h':
      return { startTime: now - 3600, table: 'metrics_raw', timeColumn: 'timestamp' };
    case '24h':
      return { startTime: now - 86400, table: 'metrics_raw', timeColumn: 'timestamp' };
    case '7d':
      return { startTime: now - 604800, table: 'metrics_hourly', timeColumn: 'hour' };
    case '30d':
      return { startTime: now - 2592000, table: 'metrics_daily', timeColumn: 'day' };
    default:
      return { startTime: now - 86400, table: 'metrics_raw', timeColumn: 'timestamp' };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = (searchParams.get('range') || '24h') as TimeRange;
  const containersParam = searchParams.get('containers');
  const containers = containersParam ? containersParam.split(',') : null;

  if (!existsSync(DB_PATH)) {
    return NextResponse.json({
      range,
      resolution: range === '1h' || range === '24h' ? '5min' : range === '7d' ? 'hourly' : 'daily',
      data: [],
      message: 'No historical data yet. Metrics collection starts after cron setup.',
    });
  }

  try {
    const db = new Database(DB_PATH, { readonly: true });
    const { startTime, table, timeColumn } = getRangeParams(range);

    let query: string;
    let params: (string | number)[] = [startTime];

    if (table === 'metrics_raw') {
      query = `
        SELECT ${timeColumn} as ts, container_name, cpu_percent as cpu, mem_usage as mem
        FROM ${table}
        WHERE ${timeColumn} >= ?
        ${containers ? `AND container_name IN (${containers.map(() => '?').join(',')})` : ''}
        ORDER BY ${timeColumn} ASC
      `;
    } else if (table === 'metrics_hourly') {
      query = `
        SELECT ${timeColumn} as ts, container_name, cpu_avg as cpu, mem_avg as mem
        FROM ${table}
        WHERE ${timeColumn} >= ?
        ${containers ? `AND container_name IN (${containers.map(() => '?').join(',')})` : ''}
        ORDER BY ${timeColumn} ASC
      `;
    } else {
      query = `
        SELECT ${timeColumn} as ts, container_name, cpu_avg as cpu, mem_avg as mem
        FROM ${table}
        WHERE ${timeColumn} >= ?
        ${containers ? `AND container_name IN (${containers.map(() => '?').join(',')})` : ''}
        ORDER BY ${timeColumn} ASC
      `;
    }

    if (containers) {
      params = [...params, ...containers];
    }

    const rows = db.prepare(query).all(...params) as Array<{
      ts: number;
      container_name: string;
      cpu: number;
      mem: number;
    }>;
    db.close();

    const dataByTimestamp = new Map<number, Record<string, { cpu: number; mem: number }>>();
    for (const row of rows) {
      if (!dataByTimestamp.has(row.ts)) {
        dataByTimestamp.set(row.ts, {});
      }
      dataByTimestamp.get(row.ts)![row.container_name] = {
        cpu: row.cpu,
        mem: row.mem,
      };
    }

    const data: MetricPoint[] = Array.from(dataByTimestamp.entries())
      .map(([timestamp, containers]) => ({ timestamp, containers }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      range,
      resolution: range === '1h' || range === '24h' ? '5min' : range === '7d' ? 'hourly' : 'daily',
      data,
    });
  } catch (error) {
    console.error('Failed to get historical metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get historical metrics', details: String(error) },
      { status: 500 }
    );
  }
}
