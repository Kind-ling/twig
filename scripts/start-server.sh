#!/usr/bin/env bash
# Start Twig API server
# Usage: TWIG_PAYMENT_ADDRESS=0x... PORT=3002 ./scripts/start-server.sh
set -euo pipefail
export TWIG_PAYMENT_ADDRESS="${TWIG_PAYMENT_ADDRESS:?TWIG_PAYMENT_ADDRESS is required}"
export PORT="${PORT:-3002}"
node dist/src/server/index.js
