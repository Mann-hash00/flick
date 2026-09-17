#!/bin/bash
set -euo pipefail

# Only needed in Claude Code on the web, where each session starts from a
# fresh container and the /brag skill's runtime deps aren't preinstalled.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Installing ffmpeg..."
  apt-get update -qq
  apt-get install -y -qq ffmpeg
fi

echo "Ensuring Hyperframes browser (for /brag rendering)..."
npx --yes hyperframes browser ensure
