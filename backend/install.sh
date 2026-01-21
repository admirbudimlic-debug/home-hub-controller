#!/bin/bash
#
# BratesHUB Controller - Complete Server Installation Script
# Installs TSDuck, FFmpeg, Node.js, and all streaming services
# Run as root or with sudo on a fresh Ubuntu/Debian server
#
# Usage: sudo ./install.sh [options]
#   --skip-deps     Skip system dependency installation
#   --skip-tsduck   Skip TSDuck installation
#   --channels N    Number of channels (default: 9)
#   --start-port P  Starting port number (default: 5001)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/opt/brateshub}"
SERVICE_USER="${SERVICE_USER:-brateshub}"
NODE_VERSION="20"
CHANNEL_COUNT=9
CHANNEL_START=5001
SKIP_DEPS=false
SKIP_TSDUCK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-deps) SKIP_DEPS=true; shift ;;
    --skip-tsduck) SKIP_TSDUCK=true; shift ;;
    --channels) CHANNEL_COUNT="$2"; shift 2 ;;
    --start-port) CHANNEL_START="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║     ${CYAN}BratesHUB Controller - Complete Server Setup${BLUE}          ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║     TSDuck (SRT/Recording) + FFmpeg (RTMP) + Controller    ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}ERROR: This script must be run as root (use sudo)${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  VERSION=$VERSION_ID
else
  echo -e "${RED}ERROR: Cannot detect OS${NC}"
  exit 1
fi

echo -e "${GREEN}Detected OS: ${OS} ${VERSION}${NC}"
echo -e "${GREEN}Channels: ${CHANNEL_COUNT} (ports ${CHANNEL_START}-$((CHANNEL_START + CHANNEL_COUNT - 1)))${NC}"
echo ""

# ============================================================================
# Phase 1: System Dependencies
# ============================================================================

if [ "$SKIP_DEPS" = false ]; then
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  Phase 1: Installing System Dependencies${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Update package lists
  echo -e "${GREEN}[1/4] Updating package lists...${NC}"
  apt-get update -qq

  # Install basic utilities
  echo -e "${GREEN}[2/4] Installing utilities...${NC}"
  apt-get install -y -qq curl wget git jq ca-certificates gnupg

  # Install Node.js
  echo -e "${GREEN}[3/4] Installing Node.js ${NODE_VERSION}...${NC}"
  if command -v node &> /dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -ge 18 ]; then
      echo -e "  Node.js v$(node -v | cut -d'v' -f2) already installed"
    else
      echo -e "  Upgrading Node.js from v${NODE_VER}..."
      curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
      apt-get install -y -qq nodejs
    fi
  else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs
  fi

  # Install FFmpeg
  echo -e "${GREEN}[4/4] Installing FFmpeg...${NC}"
  apt-get install -y -qq ffmpeg
  echo -e "  FFmpeg $(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3) installed"

  echo ""
fi

# ============================================================================
# Phase 2: TSDuck Installation
# ============================================================================

if [ "$SKIP_TSDUCK" = false ]; then
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  Phase 2: Installing TSDuck${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  if command -v tsp &> /dev/null; then
    echo -e "${GREEN}TSDuck already installed: $(tsversion 2>/dev/null || echo 'version unknown')${NC}"
  else
    echo -e "${GREEN}Installing TSDuck...${NC}"
    
    # Try apt first (Ubuntu/Debian repos may have it)
    if apt-cache show tsduck &> /dev/null; then
      apt-get install -y -qq tsduck
    else
      # Download from GitHub releases
      echo -e "  Downloading TSDuck from GitHub..."
      TSDUCK_VERSION="3.36-3520"
      ARCH=$(dpkg --print-architecture)
      
      if [ "$ARCH" = "amd64" ]; then
        TSDUCK_DEB="tsduck_${TSDUCK_VERSION}.ubuntu24_amd64.deb"
      else
        echo -e "${YELLOW}  Warning: TSDuck may need manual installation for ${ARCH}${NC}"
        TSDUCK_DEB=""
      fi
      
      if [ -n "$TSDUCK_DEB" ]; then
        wget -q "https://github.com/tsduck/tsduck/releases/download/v${TSDUCK_VERSION}/${TSDUCK_DEB}" -O /tmp/tsduck.deb
        dpkg -i /tmp/tsduck.deb || apt-get install -f -y
        rm /tmp/tsduck.deb
      fi
    fi
    
    # Verify installation
    if command -v tsp &> /dev/null; then
      echo -e "  TSDuck $(tsversion 2>/dev/null || echo '') installed successfully"
    else
      echo -e "${YELLOW}  Warning: TSDuck installation may have failed. Install manually.${NC}"
    fi
  fi
  
  echo ""
fi

# ============================================================================
# Phase 3: Create User and Directories
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Phase 3: Setting Up User and Directories${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create service user
echo -e "${GREEN}[1/3] Creating service user '${SERVICE_USER}'...${NC}"
if id "$SERVICE_USER" &>/dev/null; then
  echo -e "  User already exists"
else
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  echo -e "  User created"
fi

# Create directories
echo -e "${GREEN}[2/3] Creating directories...${NC}"
mkdir -p "${INSTALL_DIR}"/{bin,configs,recordings,logs,controller}
mkdir -p /var/run/brateshub

echo -e "  ${INSTALL_DIR}/bin        - Service scripts"
echo -e "  ${INSTALL_DIR}/configs    - Channel configurations"
echo -e "  ${INSTALL_DIR}/recordings - Recording storage"
echo -e "  ${INSTALL_DIR}/logs       - Application logs"
echo -e "  ${INSTALL_DIR}/controller - Backend API"

# Set permissions
echo -e "${GREEN}[3/3] Setting permissions...${NC}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" /var/run/brateshub
chmod 755 "${INSTALL_DIR}"

echo ""

# ============================================================================
# Phase 4: Install Service Scripts
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Phase 4: Installing Service Scripts${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy scripts from repository
echo -e "${GREEN}[1/2] Copying service scripts...${NC}"
if [ -d "${SCRIPT_DIR}/scripts" ]; then
  cp "${SCRIPT_DIR}/scripts/"*.sh "${INSTALL_DIR}/bin/"
  chmod +x "${INSTALL_DIR}/bin/"*.sh
  echo -e "  Copied: rx-start.sh, rec-start.sh, rtmp-start.sh"
else
  echo -e "${YELLOW}  Warning: scripts/ directory not found, skipping${NC}"
fi

# Copy systemd service templates
echo -e "${GREEN}[2/2] Installing systemd service templates...${NC}"
if [ -d "${SCRIPT_DIR}/systemd" ]; then
  cp "${SCRIPT_DIR}/systemd/"*.service /etc/systemd/system/
  systemctl daemon-reload
  echo -e "  Installed: rx@.service, rec@.service, rtmp@.service"
else
  echo -e "${YELLOW}  Warning: systemd/ directory not found, skipping${NC}"
fi

echo ""

# ============================================================================
# Phase 5: Install Backend Controller
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Phase 5: Installing Backend Controller${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Copy backend files
echo -e "${GREEN}[1/3] Copying backend files...${NC}"
cp -r "${SCRIPT_DIR}/src" "${INSTALL_DIR}/controller/"
cp "${SCRIPT_DIR}/package.json" "${INSTALL_DIR}/controller/"
cp "${SCRIPT_DIR}/.env.example" "${INSTALL_DIR}/controller/"

# Install dependencies
echo -e "${GREEN}[2/3] Installing Node.js dependencies...${NC}"
cd "${INSTALL_DIR}/controller"
sudo -u "$SERVICE_USER" npm install --production --silent

# Create .env if not exists
echo -e "${GREEN}[3/3] Configuring backend...${NC}"
if [ ! -f "${INSTALL_DIR}/controller/.env" ]; then
  cp "${INSTALL_DIR}/controller/.env.example" "${INSTALL_DIR}/controller/.env"
  
  # Update with actual values
  sed -i "s/CHANNEL_COUNT=9/CHANNEL_COUNT=${CHANNEL_COUNT}/" "${INSTALL_DIR}/controller/.env"
  sed -i "s/CHANNEL_START=5001/CHANNEL_START=${CHANNEL_START}/" "${INSTALL_DIR}/controller/.env"
  
  echo -e "  Created .env configuration"
else
  echo -e "  .env already exists, skipping"
fi

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}/controller"

echo ""

# ============================================================================
# Phase 6: Configure Sudoers
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Phase 6: Configuring Security (sudoers)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SUDOERS_FILE="/etc/sudoers.d/brateshub"

echo -e "${GREEN}Creating sudoers configuration...${NC}"
cat > "$SUDOERS_FILE" << EOF
# BratesHUB Controller - Allow service user to control streaming services
# Generated by install.sh on $(date)

# RX services (TSDuck SRT receiver)
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl start rx@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl stop rx@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart rx@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl enable rx@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl disable rx@*.service

# REC services (TSDuck recorder)
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl start rec@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl stop rec@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart rec@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl enable rec@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl disable rec@*.service

# RTMP services (FFmpeg output)
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl start rtmp@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl stop rtmp@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart rtmp@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl enable rtmp@*.service
${SERVICE_USER} ALL=(ALL) NOPASSWD: /bin/systemctl disable rtmp@*.service
EOF

chmod 440 "$SUDOERS_FILE"

# Verify sudoers syntax
if visudo -cf "$SUDOERS_FILE" &>/dev/null; then
  echo -e "  Sudoers configuration valid"
else
  echo -e "${RED}  ERROR: Invalid sudoers syntax!${NC}"
  rm "$SUDOERS_FILE"
  exit 1
fi

echo ""

# ============================================================================
# Phase 7: Install Controller Service
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Phase 7: Installing Controller Service${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create controller service file
cat > /etc/systemd/system/brateshub-controller.service << EOF
[Unit]
Description=BratesHUB Controller API
Documentation=https://github.com/yourusername/brateshub-controller
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}/controller
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
TimeoutStopSec=10

# Environment
Environment=NODE_ENV=production
EnvironmentFile=${INSTALL_DIR}/controller/.env

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=brateshub-controller

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo -e "  Controller service installed"

echo ""

# ============================================================================
# Phase 8: Create Channel Configurations
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Phase 8: Creating Channel Configurations${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}Creating default channel configs...${NC}"

for i in $(seq 0 $((CHANNEL_COUNT - 1))); do
  PORT=$((CHANNEL_START + i))
  CONFIG_FILE="${INSTALL_DIR}/configs/channel${PORT}.env"
  
  if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << EOF
# Channel ${PORT} Configuration
# Generated by install.sh on $(date)

# SRT Input
SRT_PORT=${PORT}
SRT_MODE=listener
SRT_LATENCY=200
SRT_PASSPHRASE=

# Recording
REC_ENABLED=true
REC_SEGMENT_DURATION=3600

# RTMP Output
RTMP_ENABLED=true
RTMP_URL=rtmp://localhost/live/channel${PORT}
EOF
    echo -e "  Created: channel${PORT}.env"
  else
    echo -e "  Exists:  channel${PORT}.env (skipped)"
  fi
done

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}/configs"

echo ""

# ============================================================================
# Installation Complete
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║              Installation Complete! ✓                      ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Installed Components:${NC}"
echo -e "  • TSDuck     - SRT receiver and recorder"
echo -e "  • FFmpeg     - RTMP output encoder"
echo -e "  • Controller - REST API for management"
echo ""
echo -e "${CYAN}Directory Structure:${NC}"
echo -e "  ${INSTALL_DIR}/"
echo -e "  ├── bin/        - Service scripts"
echo -e "  ├── configs/    - Channel configurations"
echo -e "  ├── controller/ - Backend API"
echo -e "  ├── logs/       - Application logs"
echo -e "  └── recordings/ - Recorded streams"
echo ""
echo -e "${CYAN}Quick Start:${NC}"
echo ""
echo -e "  ${YELLOW}1. Edit controller configuration:${NC}"
echo -e "     sudo nano ${INSTALL_DIR}/controller/.env"
echo ""
echo -e "  ${YELLOW}2. Start the controller API:${NC}"
echo -e "     sudo systemctl start brateshub-controller"
echo -e "     sudo systemctl enable brateshub-controller"
echo ""
echo -e "  ${YELLOW}3. Start a channel (example: 5001):${NC}"
echo -e "     sudo systemctl start rx@5001   # Start SRT receiver"
echo -e "     sudo systemctl start rec@5001  # Start recording"
echo -e "     sudo systemctl start rtmp@5001 # Start RTMP output"
echo ""
echo -e "  ${YELLOW}4. Check status:${NC}"
echo -e "     sudo systemctl status brateshub-controller"
echo -e "     sudo systemctl status rx@5001"
echo ""
echo -e "  ${YELLOW}5. View logs:${NC}"
echo -e "     sudo journalctl -u brateshub-controller -f"
echo -e "     sudo journalctl -u rx@5001 -f"
echo ""
echo -e "${CYAN}API Endpoint:${NC}"
echo -e "  http://localhost:3001"
echo ""
echo -e "${CYAN}Edit channel configs:${NC}"
echo -e "  sudo nano ${INSTALL_DIR}/configs/channel5001.env"
echo ""
