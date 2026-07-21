#!/bin/bash
set -e
WORKER_URL="${WORKER_URL:-https://a10lucky-data.hyclub.workers.dev}"
MARKET_FILE="docs/data/market/latest.json"
STRAT_FILE="docs/data/strategies/latest.json"
META_FILE="docs/data/market/meta.json"
INDEX_FILE="docs/data/archive/index.json"

body() {
  echo -n '{"market":'
  jq -c . "$MARKET_FILE"
  echo -n ',"strategies":'
  jq -c . "$STRAT_FILE"
  echo -n ',"meta":'
  jq -c . "$META_FILE"
  if [ -f "$INDEX_FILE" ]; then
    echo -n ',"archive_index":'
    jq -c . "$INDEX_FILE"
  fi
  echo -n '}'
}

body | curl -s -X POST "$WORKER_URL/api/push" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d @-
