#!/bin/bash
set -e

DB_PATH="${METRICS_DB_PATH:-/data/metrics/metrics.db}"
DB_DIR=$(dirname "$DB_PATH")

mkdir -p "$DB_DIR"

if [ ! -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" <<'SQL'
CREATE TABLE IF NOT EXISTS metrics_raw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  container_name TEXT NOT NULL,
  cpu_percent REAL,
  mem_usage INTEGER,
  mem_limit INTEGER,
  mem_percent REAL,
  net_rx INTEGER,
  net_tx INTEGER
);
CREATE INDEX IF NOT EXISTS idx_raw_ts ON metrics_raw(timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_container ON metrics_raw(container_name, timestamp);

CREATE TABLE IF NOT EXISTS metrics_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour INTEGER NOT NULL,
  container_name TEXT NOT NULL,
  cpu_avg REAL,
  cpu_max REAL,
  mem_avg INTEGER,
  mem_max INTEGER,
  samples INTEGER,
  UNIQUE(hour, container_name)
);

CREATE TABLE IF NOT EXISTS metrics_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER NOT NULL,
  container_name TEXT NOT NULL,
  cpu_avg REAL,
  cpu_max REAL,
  mem_avg INTEGER,
  mem_max INTEGER,
  samples INTEGER,
  UNIQUE(day, container_name)
);
SQL
  echo "Database initialized at $DB_PATH"
fi

TIMESTAMP=$(date +%s)

docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}' | while IFS=$'\t' read -r name cpu mem_usage mem_perc net_io; do
  cpu_val=$(echo "$cpu" | tr -d '%')

  mem_used=$(echo "$mem_usage" | awk -F'/' '{print $1}' | tr -d ' ')
  mem_limit=$(echo "$mem_usage" | awk -F'/' '{print $2}' | tr -d ' ')

  convert_to_bytes() {
    local val=$1
    local num=$(echo "$val" | sed 's/[^0-9.]//g')
    local unit=$(echo "$val" | sed 's/[0-9.]//g')
    case "$unit" in
      KiB|kB|KB) echo "scale=0; $num * 1024 / 1" | bc ;;
      MiB|MB) echo "scale=0; $num * 1024 * 1024 / 1" | bc ;;
      GiB|GB) echo "scale=0; $num * 1024 * 1024 * 1024 / 1" | bc ;;
      B|"") echo "scale=0; $num / 1" | bc ;;
      *) echo "0" ;;
    esac
  }

  mem_used_bytes=$(convert_to_bytes "$mem_used")
  mem_limit_bytes=$(convert_to_bytes "$mem_limit")
  mem_perc_val=$(echo "$mem_perc" | tr -d '%')

  net_rx=$(echo "$net_io" | awk -F'/' '{print $1}' | tr -d ' ')
  net_tx=$(echo "$net_io" | awk -F'/' '{print $2}' | tr -d ' ')
  net_rx_bytes=$(convert_to_bytes "$net_rx")
  net_tx_bytes=$(convert_to_bytes "$net_tx")

  sqlite3 "$DB_PATH" "INSERT INTO metrics_raw (timestamp, container_name, cpu_percent, mem_usage, mem_limit, mem_percent, net_rx, net_tx) VALUES ($TIMESTAMP, '$name', $cpu_val, $mem_used_bytes, $mem_limit_bytes, $mem_perc_val, $net_rx_bytes, $net_tx_bytes);"
done

echo "$(date -Iseconds) Collected metrics for $(docker ps -q | wc -l | tr -d ' ') containers"
