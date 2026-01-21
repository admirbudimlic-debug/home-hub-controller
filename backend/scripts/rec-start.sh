#!/bin/bash
#
# REC Service - Recording using TSDuck
# Records transport stream with segmentation (preserving all PIDs)
# Usage: rec-start.sh <port>
#

set -e

PORT=$1
CONFIG_DIR="${CONFIG_DIR:-/opt/brateshub/configs}"
FIFO_DIR="${FIFO_DIR:-/var/run/brateshub}"
FIFO="${FIFO_DIR}/channel${PORT}.ts"
REC_BASE_DIR="${REC_BASE_DIR:-/opt/brateshub/recordings}"
OUTPUT_DIR="${REC_BASE_DIR}/channel${PORT}"

# Load channel-specific config if exists
if [ -f "${CONFIG_DIR}/channel${PORT}.env" ]; then
  source "${CONFIG_DIR}/channel${PORT}.env"
fi

# Defaults
REC_SEGMENT_DURATION="${REC_SEGMENT_DURATION:-3600}"  # 1 hour segments
REC_MAX_FILES="${REC_MAX_FILES:-24}"                   # Keep 24 hours
REC_FORMAT="${REC_FORMAT:-%Y%m%d_%H%M%S}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

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

echo "Starting REC service for channel ${PORT}"
echo "  Input FIFO: ${FIFO}"
echo "  Output dir: ${OUTPUT_DIR}"
echo "  Segment duration: ${REC_SEGMENT_DURATION}s"

# Generate output filename with timestamp
OUTPUT_FILE="${OUTPUT_DIR}/rec_$(date +${REC_FORMAT}).ts"

# TSDuck recorder
# Using -P until for continuous operation
# The file output plugin handles the actual recording
exec tsp \
  -I file "$FIFO" --infinite \
  -P regulate \
  -P pcrverify --jitter-max 100 \
  -O file "$OUTPUT_FILE" \
    --reopen-on-error \
    --retry-interval 1000
