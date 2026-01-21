#!/bin/bash
#
# RX Service - SRT Receiver using TSDuck
# Receives SRT input and outputs to named pipe (FIFO)
# Usage: rx-start.sh <port>
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
SRT_LATENCY="${SRT_LATENCY:-200}"
SRT_RCVBUF="${SRT_RCVBUF:-12288000}"
SRT_PASSPHRASE="${SRT_PASSPHRASE:-}"
SRT_MODE="${SRT_MODE:-listener}"

# Create FIFO directory if not exists
mkdir -p "$FIFO_DIR"

# Create FIFO if not exists
if [ ! -p "$FIFO" ]; then
  mkfifo "$FIFO"
  chmod 660 "$FIFO"
fi

echo "Starting RX service on port ${PORT}"
echo "  Mode: ${SRT_MODE}"
echo "  Latency: ${SRT_LATENCY}ms"
echo "  Output FIFO: ${FIFO}"

# Build TSDuck command
TSP_CMD="tsp -I srt"

if [ "$SRT_MODE" = "listener" ]; then
  TSP_CMD="$TSP_CMD --listener --localport ${PORT}"
else
  # Caller mode - connect to remote
  TSP_CMD="$TSP_CMD --caller ${SRT_CALLER_HOST}:${SRT_CALLER_PORT:-${PORT}}"
fi

TSP_CMD="$TSP_CMD --latency ${SRT_LATENCY} --rcvbuf ${SRT_RCVBUF}"

# Add passphrase if set
if [ -n "$SRT_PASSPHRASE" ]; then
  TSP_CMD="$TSP_CMD --passphrase ${SRT_PASSPHRASE}"
fi

# Add analysis plugin for monitoring
TSP_CMD="$TSP_CMD -P analyze --interval 10 -O file ${FIFO}"

echo "Executing: ${TSP_CMD}"
exec $TSP_CMD
