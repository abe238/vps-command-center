import { NextResponse } from 'next/server';
import { getAllContainerMetrics, getSecurityAudit } from '@/lib/docker';
import { execSync } from 'child_process';

interface SystemMetrics {
  hostname: string;
  uptime: string;
  loadAvg: number[];
  cpuPercent: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryPercent: number;
  diskTotal: number;
  diskUsed: number;
  diskPercent: number;
  timestamp: string;
}

function getSystemMetrics(): SystemMetrics {
  try {
    const hostname = execSync('hostname').toString().trim();
    const uptimeOutput = execSync('uptime').toString();
    const uptimeMatch = uptimeOutput.match(/up\s+(\d+)\s+days?,?\s*(\d+):(\d+)/);
    const uptime = uptimeMatch
      ? `${uptimeMatch[1]}d ${uptimeMatch[2]}h`
      : uptimeOutput.match(/up\s+(\d+):(\d+)/)?.[0] || 'unknown';

    const loadAvgMatch = uptimeOutput.match(/load average[s]?:\s*([\d.]+),?\s*([\d.]+),?\s*([\d.]+)/);
    const loadAvg = loadAvgMatch
      ? [parseFloat(loadAvgMatch[1]), parseFloat(loadAvgMatch[2]), parseFloat(loadAvgMatch[3])]
      : [0, 0, 0];

    const memInfo = execSync('free -b').toString();
    const memMatch = memInfo.match(/Mem:\s+(\d+)\s+(\d+)/);
    const memoryTotal = memMatch ? parseInt(memMatch[1]) : 0;
    const memoryUsed = memMatch ? parseInt(memMatch[2]) : 0;
    const memoryPercent = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;

    const dfOutput = execSync('df -B1 /').toString();
    const dfMatch = dfOutput.match(/\d+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%/);
    const diskTotal = dfMatch ? parseInt(dfMatch[1]) + parseInt(dfMatch[2]) : 0;
    const diskUsed = dfMatch ? parseInt(dfMatch[1]) : 0;
    const diskPercent = dfMatch ? parseInt(dfMatch[4]) : 0;

    const cpuPercent = loadAvg[0] * 100 / 4;

    return {
      hostname,
      uptime,
      loadAvg,
      cpuPercent: Math.min(cpuPercent, 100),
      memoryTotal,
      memoryUsed,
      memoryPercent,
      diskTotal,
      diskUsed,
      diskPercent,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      hostname: 'unknown',
      uptime: 'unknown',
      loadAvg: [0, 0, 0],
      cpuPercent: 0,
      memoryTotal: 0,
      memoryUsed: 0,
      memoryPercent: 0,
      diskTotal: 0,
      diskUsed: 0,
      diskPercent: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function GET() {
  try {
    const [containers, security, system] = await Promise.all([
      getAllContainerMetrics(),
      getSecurityAudit(),
      Promise.resolve(getSystemMetrics()),
    ]);

    return NextResponse.json({
      containers,
      security,
      system,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get live metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get live metrics' },
      { status: 500 }
    );
  }
}
