import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { getAllContainerMetrics } from '@/lib/docker';

const DB_PATH = process.env.METRICS_DB_PATH || '/data/metrics/metrics.db';

type TimeRange = '1h' | '24h' | '7d' | '30d';
type Metric = 'cpu' | 'memory';

interface TopConsumer {
  container: string;
  avg: number;
  max: number;
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
  const metric = (searchParams.get('metric') || 'memory') as Metric;
  const limit = parseInt(searchParams.get('limit') || '5', 10);

  if (!existsSync(DB_PATH)) {
    try {
      const liveMetrics = await getAllContainerMetrics();
      const sorted = [...liveMetrics].sort((a, b) => {
        if (metric === 'cpu') return b.cpu - a.cpu;
        return b.memoryUsage - a.memoryUsage;
      });

      return NextResponse.json({
        range: 'live',
        metric,
        top: sorted.slice(0, limit).map(c => ({
          container: c.name,
          avg: metric === 'cpu' ? c.cpu : c.memoryUsage,
          max: metric === 'cpu' ? c.cpu : c.memoryUsage,
        })),
        source: 'live',
        message: 'Using live data. Historical data available after cron setup.',
      });
    } catch {
      return NextResponse.json({
        range,
        metric,
        top: [],
        message: 'No data available',
      });
    }
  }

  try {
    const db = new Database(DB_PATH, { readonly: true });
    const { startTime, table, timeColumn } = getRangeParams(range);

    let query: string;
    if (table === 'metrics_raw') {
      if (metric === 'cpu') {
        query = `
          SELECT container_name as container, AVG(cpu_percent) as avg, MAX(cpu_percent) as max
          FROM ${table}
          WHERE ${timeColumn} >= ?
          GROUP BY container_name
          ORDER BY avg DESC
          LIMIT ?
        `;
      } else {
        query = `
          SELECT container_name as container, AVG(mem_usage) as avg, MAX(mem_usage) as max
          FROM ${table}
          WHERE ${timeColumn} >= ?
          GROUP BY container_name
          ORDER BY avg DESC
          LIMIT ?
        `;
      }
    } else {
      if (metric === 'cpu') {
        query = `
          SELECT container_name as container, AVG(cpu_avg) as avg, MAX(cpu_max) as max
          FROM ${table}
          WHERE ${timeColumn} >= ?
          GROUP BY container_name
          ORDER BY avg DESC
          LIMIT ?
        `;
      } else {
        query = `
          SELECT container_name as container, AVG(mem_avg) as avg, MAX(mem_max) as max
          FROM ${table}
          WHERE ${timeColumn} >= ?
          GROUP BY container_name
          ORDER BY avg DESC
          LIMIT ?
        `;
      }
    }

    const rows = db.prepare(query).all(startTime, limit) as TopConsumer[];
    db.close();

    return NextResponse.json({
      range,
      metric,
      top: rows,
      source: 'historical',
    });
  } catch (error) {
    console.error('Failed to get top consumers:', error);
    return NextResponse.json(
      { error: 'Failed to get top consumers', details: String(error) },
      { status: 500 }
    );
  }
}
