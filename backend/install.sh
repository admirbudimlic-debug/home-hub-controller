#!/bin/bash
#
# BratesHUB Controller Backend - Installation Script
# Run as root or with sudo
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}BratesHUB Controller Backend Installer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}Note: Some steps require root privileges.${NC}"
  echo -e "${YELLOW}You may be prompted for sudo password.${NC}"
  echo ""
fi

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/opt/brateshub-controller}"
SERVICE_USER="${SERVICE_USER:-brateshub}"
NODE_VERSION="20"

# Step 1: Check/Install Node.js
echo -e "${GREEN}[1/6] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
  NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  echo -e "  Found Node.js v$(node -v | cut -d'v' -f2)"
  if [ "$NODE_VER" -lt 18 ]; then
    echo -e "${YELLOW}  Warning: Node.js 18+ recommended. Current: v$NODE_VER${NC}"
  fi
else
  echo -e "  Node.js not found. Installing..."
  if command -v apt-get &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
    sudo dnf install -y nodejs
  else
    echo -e "${RED}  Please install Node.js 18+ manually${NC}"
    exit 1
  fi
fi

# Step 2: Create service user
echo -e "${GREEN}[2/6] Setting up service user...${NC}"
if id "$SERVICE_USER" &>/dev/null; then
  echo -e "  User '$SERVICE_USER' already exists"
else
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER" || true
  echo -e "  Created user '$SERVICE_USER'"
fi

# Step 3: Create installation directory
echo -e "${GREEN}[3/6] Setting up installation directory...${NC}"
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r . "$INSTALL_DIR/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
echo -e "  Installed to $INSTALL_DIR"

# Step 4: Install dependencies
echo -e "${GREEN}[4/6] Installing Node.js dependencies...${NC}"
cd "$INSTALL_DIR"
sudo -u "$SERVICE_USER" npm install --production
echo -e "  Dependencies installed"

# Step 5: Configure sudoers for systemctl
echo -e "${GREEN}[5/6] Configuring sudoers for service control...${NC}"
SUDOERS_FILE="/etc/sudoers.d/brateshub-controller"
sudo tee "$SUDOERS_FILE" > /dev/null << EOF
# Allow brateshub user to control streaming services
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl start rx*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop rx*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart rx*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl start rec*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop rec*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart rec*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl start rtmp*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop rtmp*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart rtmp*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl enable rx*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl disable rx*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl enable rec*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl disable rec*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl enable rtmp*.service
$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl disable rtmp*.service
EOF
sudo chmod 440 "$SUDOERS_FILE"
echo -e "  Sudoers configured"

# Step 6: Install and configure systemd service
echo -e "${GREEN}[6/6] Installing systemd service...${NC}"
sudo cp "$INSTALL_DIR/brateshub-controller.service" /etc/systemd/system/
sudo sed -i "s|/opt/brateshub-controller|$INSTALL_DIR|g" /etc/systemd/system/brateshub-controller.service
sudo sed -i "s|User=brateshub|User=$SERVICE_USER|g" /etc/systemd/system/brateshub-controller.service
sudo systemctl daemon-reload
echo -e "  Service installed"

# Create .env if not exists
if [ ! -f "$INSTALL_DIR/.env" ]; then
  sudo -u "$SERVICE_USER" cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  echo -e "${YELLOW}  Created .env from template - please edit it!${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Edit configuration:"
echo -e "     ${BLUE}sudo nano $INSTALL_DIR/.env${NC}"
echo ""
echo -e "  2. Start the service:"
echo -e "     ${BLUE}sudo systemctl start brateshub-controller${NC}"
echo ""
echo -e "  3. Enable auto-start on boot:"
echo -e "     ${BLUE}sudo systemctl enable brateshub-controller${NC}"
echo ""
echo -e "  4. Check status:"
echo -e "     ${BLUE}sudo systemctl status brateshub-controller${NC}"
echo ""
echo -e "  5. View logs:"
echo -e "     ${BLUE}sudo journalctl -u brateshub-controller -f${NC}"
echo ""
echo -e "API will be available at: http://localhost:3001"
echo ""
