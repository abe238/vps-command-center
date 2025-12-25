#!/bin/bash
set -e

SERVICE="${1:?Usage: $0 <service-name> [health-endpoint]}"
HEALTH_ENDPOINT="${2:-}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"
COMPOSE_DIR="${COMPOSE_DIR:-/home/deploy}"

cd "$COMPOSE_DIR"

echo "=== Zero-Downtime Deploy: $SERVICE ==="
echo "Time: $(date -Iseconds)"

OLD_CONTAINER=$(docker compose ps -q "$SERVICE" 2>/dev/null | head -1)
echo "[1/6] Current container: ${OLD_CONTAINER:-none}"

echo "[2/6] Pulling latest image..."
docker compose pull "$SERVICE"

echo "[3/6] Scaling up to 2 instances..."
docker compose up -d --scale "$SERVICE=2" --no-recreate
sleep 3

NEW_CONTAINER=$(docker compose ps -q "$SERVICE" | grep -v "${OLD_CONTAINER:-NONE}" | head -1)
if [ -z "$NEW_CONTAINER" ]; then
  echo "ERROR: Could not find new container"
  exit 1
fi
echo "  New container: $NEW_CONTAINER"

echo "[4/6] Waiting for health check..."
HEALTHY=false

for i in $(seq 1 "$HEALTH_RETRIES"); do
  STATUS=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$NEW_CONTAINER" 2>/dev/null || echo "unknown")

  if [ "$STATUS" = "healthy" ]; then
    HEALTHY=true
    echo "  ✓ Container healthy after $i attempts"
    break
  elif [ "$STATUS" = "no-healthcheck" ] && [ -n "$HEALTH_ENDPOINT" ]; then
    if curl -sf "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
      HEALTHY=true
      echo "  ✓ Endpoint healthy after $i attempts"
      break
    fi
  elif [ "$STATUS" = "no-healthcheck" ]; then
    RUNNING=$(docker inspect --format='{{.State.Running}}' "$NEW_CONTAINER" 2>/dev/null || echo "false")
    if [ "$RUNNING" = "true" ]; then
      sleep 5
      HEALTHY=true
      echo "  ✓ Container running (no healthcheck defined)"
      break
    fi
  fi

  echo "  Attempt $i/$HEALTH_RETRIES: $STATUS"
  sleep "$HEALTH_INTERVAL"
done

if [ "$HEALTHY" = "false" ]; then
  echo "ERROR: New container failed health check. Rolling back..."
  docker logs "$NEW_CONTAINER" --tail 20 2>&1 || true
  docker stop "$NEW_CONTAINER" 2>/dev/null || true
  docker rm "$NEW_CONTAINER" 2>/dev/null || true
  docker compose up -d --scale "$SERVICE=1"
  exit 1
fi

echo "[5/6] Stopping old container..."
if [ -n "$OLD_CONTAINER" ]; then
  docker stop "$OLD_CONTAINER" --time 10
  docker rm "$OLD_CONTAINER" 2>/dev/null || true
fi

echo "[6/6] Finalizing..."
docker compose up -d --scale "$SERVICE=1" --no-recreate
docker system prune -f --filter "until=1h" >/dev/null 2>&1 || true

echo ""
echo "=== Deploy Complete ==="
docker compose ps "$SERVICE"
