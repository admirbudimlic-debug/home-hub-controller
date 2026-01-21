#!/bin/bash
#
# RTMP Service - RTMP output using FFmpeg
# Remuxes transport stream to RTMP (copy codecs, no re-encoding)
# Usage: rtmp-start.sh <port>
#

set -e

PORT=$1
CONFIG_DIR="${CONFIG_DIR:-/opt/brateshub/configs}"
FIFO_DIR="${FIFO_DIR:-/var/run/brateshub}"
FIFO="${FIFO_DIR}/channel${PORT}.ts"

# Load channel-specific config if exists
if [ -f "${CONFIG_DIR}/channel${PORT}.env" ]; then
  source "${CONFIG_DIR}/channel${PORT}.env"
fi

# Defaults
RTMP_URL="${RTMP_URL:-rtmp://localhost/live/channel${PORT}}"
RTMP_RECONNECT="${RTMP_RECONNECT:-1}"
RTMP_RECONNECT_DELAY="${RTMP_RECONNECT_DELAY:-5}"

# Wait for FIFO to exist
WAIT_COUNT=0
while [ ! -p "$FIFO" ]; do
  echo "Waiting for RX service to create FIFO..."
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
  if [ $WAIT_COUNT -gt 30 ]; then
    echo "ERROR: FIFO not created after 30 seconds"
    exit 1
  fi
done

echo "Starting RTMP service for channel ${PORT}"
echo "  Input FIFO: ${FIFO}"
echo "  Output URL: ${RTMP_URL}"

# FFmpeg RTMP output
# -re: Read input at native frame rate (important for live streaming)
# -c copy: Copy codecs without re-encoding (preserves quality)
# -f flv: FLV container for RTMP
# -flvflags no_duration_filesize: Better for live streaming
exec ffmpeg -hide_banner \
  -re \
  -i "$FIFO" \
  -c:v copy \
  -c:a copy \
  -f flv \
  -flvflags no_duration_filesize \
  "$RTMP_URL"
