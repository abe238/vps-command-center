#!/bin/bash
set -e

DB_PATH="${METRICS_DB_PATH:-/data/metrics/metrics.db}"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH"
  exit 1
fi

echo "$(date -Iseconds) Starting metrics aggregation..."

CURRENT_HOUR=$(date +%s)
CURRENT_HOUR=$((CURRENT_HOUR - (CURRENT_HOUR % 3600)))
LAST_HOUR=$((CURRENT_HOUR - 3600))

sqlite3 "$DB_PATH" <<SQL
INSERT OR REPLACE INTO metrics_hourly (hour, container_name, cpu_avg, cpu_max, mem_avg, mem_max, samples)
SELECT
  $LAST_HOUR as hour,
  container_name,
  AVG(cpu_percent) as cpu_avg,
  MAX(cpu_percent) as cpu_max,
  AVG(mem_usage) as mem_avg,
  MAX(mem_usage) as mem_max,
  COUNT(*) as samples
FROM metrics_raw
WHERE timestamp >= $LAST_HOUR AND timestamp < $CURRENT_HOUR
GROUP BY container_name;
SQL

CURRENT_DAY=$(date +%s)
CURRENT_DAY=$((CURRENT_DAY - (CURRENT_DAY % 86400)))
LAST_DAY=$((CURRENT_DAY - 86400))

sqlite3 "$DB_PATH" <<SQL
INSERT OR REPLACE INTO metrics_daily (day, container_name, cpu_avg, cpu_max, mem_avg, mem_max, samples)
SELECT
  $LAST_DAY as day,
  container_name,
  AVG(cpu_avg) as cpu_avg,
  MAX(cpu_max) as cpu_max,
  AVG(mem_avg) as mem_avg,
  MAX(mem_max) as mem_max,
  SUM(samples) as samples
FROM metrics_hourly
WHERE hour >= $LAST_DAY AND hour < $CURRENT_DAY
GROUP BY container_name;
SQL

SEVEN_DAYS_AGO=$((CURRENT_HOUR - 604800))
THIRTY_DAYS_AGO=$((CURRENT_DAY - 2592000))

sqlite3 "$DB_PATH" <<SQL
DELETE FROM metrics_raw WHERE timestamp < $SEVEN_DAYS_AGO;
DELETE FROM metrics_hourly WHERE hour < $THIRTY_DAYS_AGO;
SQL

RAW_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM metrics_raw;")
HOURLY_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM metrics_hourly;")
DAILY_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM metrics_daily;")

echo "$(date -Iseconds) Aggregation complete. Raw: $RAW_COUNT, Hourly: $HOURLY_COUNT, Daily: $DAILY_COUNT"
