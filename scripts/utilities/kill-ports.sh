#!/usr/bin/env bash
# Kill CECBS services listening on the configured application ports.

set -u

echo "🔪 Killing all CECBS processes on ports..."

kill_port() {
  local port="$1"
  local name="$2"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  elif command -v fuser >/dev/null 2>&1; then
    pids=$(fuser -n tcp "$port" 2>/dev/null | tr ' ' '\n' || true)
  elif command -v ss >/dev/null 2>&1; then
    pids=$(ss -ltnp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u)
  elif command -v netstat >/dev/null 2>&1; then
    pids=$(netstat -ano 2>/dev/null | awk -v port=":$port" '$0 ~ port && /LISTEN/ {print $NF}' | sort -u)
  fi

  if [ -z "$pids" ]; then
    echo "  ✓ Port $port is free (or process lookup is unavailable)"
    return
  fi

  while IFS= read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    [ "$pid" -gt 1 ] || continue
    echo "  Stopping $name on port $port (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
  done <<< "$pids"

  sleep 1
  if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  Force-stopping remaining listener(s) on port $port..."
    while IFS= read -r pid; do
      [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -gt 1 ] && kill -9 "$pid" 2>/dev/null || true
    done < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  fi
}

kill_port 3000 "UI (Next.js)"
kill_port 3001 "API (Express)"
kill_port 3002 "UI fallback"

# Remove only stale PID markers; port listeners above are the source of truth.
rm -f /tmp/cecbs-api.pid /tmp/cecbs-ui.pid

echo "✅ CECBS port cleanup complete"
