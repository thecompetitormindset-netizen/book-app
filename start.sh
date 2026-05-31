#!/bin/bash
# BookSummary — production launcher
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8000}"

echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │          BookSummary — starting          │"
echo "  └─────────────────────────────────────────┘"
echo ""

# 1. Build the frontend if dist is outdated or missing
DIST="$ROOT/frontend/dist/index.html"
SRC="$ROOT/frontend/src/App.jsx"
if [ ! -f "$DIST" ] || [ "$SRC" -nt "$DIST" ]; then
  echo "  → Building frontend..."
  cd "$ROOT/frontend"
  npm run build --silent
  echo "  ✓ Frontend built"
fi

# 2. Ensure Ollama is running
if ! curl -s http://localhost:11434 > /dev/null 2>&1; then
  echo "  → Starting Ollama..."
  ollama serve &>/dev/null &
  sleep 3
fi
echo "  ✓ Ollama ready"

# 3. Launch the single production server
cd "$ROOT/backend"
echo ""
echo "  App  → http://localhost:$PORT"
echo "  LAN  → http://$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 'your-ip'):$PORT"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

exec python3 -m uvicorn main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers 1
