# BratesHUB Controller Backend

Backend controller for managing HP server streaming services (RX, REC, RTMP) and HP iLO remote management.

## Features

- **Service Control**: Start, stop, restart streaming services via systemd
- **Service Status**: Monitor running services, PIDs, uptime, memory usage
- **Log Fetching**: Retrieve service logs from journalctl
- **iLO Integration**: Power control, health monitoring, temperature/fan data
- **Bulk Operations**: Control all channels or specific subsets at once
- **Security**: Optional API key authentication, restricted CORS

## Quick Start

### Option 1: Automated Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/brateshub-controller-backend.git
cd brateshub-controller-backend

# Run installer (requires sudo)
sudo ./install.sh
```

### Option 2: Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/brateshub-controller-backend.git
cd brateshub-controller-backend

# Install dependencies
npm install

# Copy and edit configuration
cp .env.example .env
nano .env

# Start the server
npm start
```

## Configuration

Edit `.env` file:

```env
# Server
PORT=3001
NODE_ENV=production

# CORS origins (your frontend URL)
CORS_ORIGINS=https://your-frontend.lovable.app

# Optional API key
API_KEY=your-secret-key

# iLO connection
ILO_HOST=192.168.1.100
ILO_USERNAME=Administrator
ILO_PASSWORD=your-password

# Channels (default: 5001-5009)
CHANNEL_START=5001
CHANNEL_COUNT=9

# Service patterns (customize for your setup)
SERVICE_PATTERN_RX=rx{port}.service
SERVICE_PATTERN_REC=rec{port}.service
SERVICE_PATTERN_RTMP=rtmp{port}.service
```

## API Endpoints

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic health check |
| `/api/health/full` | GET | Detailed health with connectivity checks |

### iLO Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ilo/status` | GET | Server status (power, health, temps, fans) |
| `/api/ilo/power/:action` | POST | Power control (powerOn, powerOff, reset, etc.) |
| `/api/ilo/credentials` | POST | Set iLO credentials |
| `/api/ilo/test` | POST | Test iLO connection |
| `/api/ilo/info` | GET | iLO network info and console URL |

### Channels

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/channels` | GET | List all channels with service status |
| `/api/channels/:id` | GET | Single channel details |
| `/api/channels/:id/config` | GET | Get channel configuration |
| `/api/channels/:id/config` | PUT | Update channel configuration |

### Services

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/:channelId/:service/:action` | POST | Control single service |
| `/api/services/bulk/:service/:action` | POST | Bulk operation on multiple channels |
| `/api/services/status` | GET | Status of all services |

Service types: `rx`, `rec`, `rtmp`
Actions: `start`, `stop`, `restart`

### Logs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs/:channelId/:service` | GET | Get logs for a service |
| `/api/logs/:channelId` | GET | Get logs for all services on a channel |

Query parameters:
- `lines` - Number of log lines (default: 100, max: 200)
- `since` - Filter logs since timestamp
- `until` - Filter logs until timestamp
- `level` - Filter by level (error, warn, info, debug)

## Examples

### Start a service
```bash
curl -X POST http://localhost:3001/api/services/5001/rx/start
```

### Restart all RTMP services
```bash
curl -X POST http://localhost:3001/api/services/bulk/rtmp/restart
```

### Get channel status
```bash
curl http://localhost:3001/api/channels/5001
```

### Get service logs
```bash
curl http://localhost:3001/api/logs/5001/rx?lines=50
```

### Control iLO power
```bash
curl -X POST http://localhost:3001/api/ilo/power/reset
```

## Running as a Service

The installer creates a systemd service. Manual setup:

```bash
# Copy service file
sudo cp brateshub-controller.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start and enable
sudo systemctl start brateshub-controller
sudo systemctl enable brateshub-controller

# Check status
sudo systemctl status brateshub-controller

# View logs
sudo journalctl -u brateshub-controller -f
```

## Security

### sudoers Configuration

The installer creates `/etc/sudoers.d/brateshub-controller` to allow the service user to control streaming services without a password. Only specific systemctl commands are allowed.

### API Key Authentication

Set `API_KEY` in `.env` to require authentication:

```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3001/api/channels
```

### CORS

Configure `CORS_ORIGINS` to restrict which domains can access the API.

## IPv6 Support

The server binds to `0.0.0.0` which supports both IPv4 and IPv6 on most systems. For IPv6-only binding, modify `src/server.js`:

```javascript
app.listen(PORT, '::', () => { ... });
```

## Troubleshooting

### Service not found
- Check service naming pattern in `.env`
- Verify services exist: `systemctl list-units 'rx*.service'`

### Permission denied
- Check sudoers configuration: `sudo visudo -cf /etc/sudoers.d/brateshub-controller`
- Verify user: `id brateshub`

### iLO connection failed
- Test direct access: `curl -k https://ILO_IP/redfish/v1/`
- Verify credentials in iLO web interface

### CORS errors
- Add your frontend URL to `CORS_ORIGINS`
- Restart the service after changing `.env`

## Development

```bash
# Run with auto-reload
npm run dev

# Enable debug logging
LOG_LEVEL=debug npm run dev
```

## License

MIT
