#!/usr/bin/env bash
# Sample server health + PM2 stats every N seconds during a load test.
# Run alongside k6:
#   loadtest/monitor.sh https://your-host 5 > loadtest/monitor.log &
#   k6 run loadtest/play.js
#   kill %1
#
# For local: loadtest/monitor.sh http://localhost:3000

BASE=${1:-http://localhost:3000}
INTERVAL=${2:-5}

echo "ts,health_status,health_ms"
while true; do
  START=$(date +%s%N)
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE/api/health")
  END=$(date +%s%N)
  MS=$(( (END - START) / 1000000 ))
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$STATUS,$MS"
  sleep "$INTERVAL"
done
