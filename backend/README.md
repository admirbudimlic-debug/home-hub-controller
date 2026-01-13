# HP iLO Proxy Server

Backend proxy server for HP iLO Redfish API communication. This server bridges your frontend application with the iLO management interface.

## Why is this needed?

Browsers cannot directly call iLO's Redfish API due to:
1. **CORS restrictions** - iLO doesn't send CORS headers
2. **Self-signed certificates** - Browsers block HTTPS to self-signed certs
3. **Network isolation** - iLO is typically on a management network

This proxy runs on your local network, handles authentication, and exposes a clean REST API.

## Quick Start

```bash
# Install dependencies
npm install

# Copy and edit environment config
cp .env.example .env
nano .env  # Edit with your settings

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

## Configuration

Edit `.env` file:

```env
PORT=3001
ILO_HOST=192.168.1.100
ILO_USERNAME=Administrator
ILO_PASSWORD=your-password
CORS_ORIGINS=http://localhost:5173,https://your-app.lovable.app
```

Or set credentials via API after starting.

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and whether iLO is configured.

### Set Credentials
```
POST /api/ilo/credentials
Content-Type: application/json

{
  "host": "192.168.1.100",
  "username": "Administrator",
  "password": "your-password"
}
```

### Test Connection
```
POST /api/ilo/test
Content-Type: application/json

{
  "host": "192.168.1.100",
  "username": "Administrator", 
  "password": "your-password"
}
```
Tests connection with provided credentials without saving them.

### Get Server Status
```
GET /api/ilo/status
```
Returns full server status including:
- Power state
- Health status
- Model and serial number
- Temperatures (inlet, CPU)
- Fan speeds
- Power consumption
- Uptime

### Power Actions
```
POST /api/ilo/power/:action
```

Available actions:
- `powerOn` - Power on the server
- `powerOff` - Graceful shutdown
- `forcePowerOff` - Immediate power off (may cause data loss)
- `reset` - Graceful restart
- `forceReset` - Immediate restart
- `powerCycle` - Power cycle (off then on)

### Get iLO Info
```
GET /api/ilo/info
```
Returns iLO network information and console URL.

## Running as a Service (systemd)

Create `/etc/systemd/system/ilo-proxy.service`:

```ini
[Unit]
Description=HP iLO Proxy Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ilo-proxy
sudo systemctl start ilo-proxy
```

## Security Considerations

1. **Run on trusted network** - This server handles iLO credentials
2. **Use HTTPS in production** - Set `SSL_CERT_PATH` and `SSL_KEY_PATH` 
3. **Restrict CORS origins** - Only allow your frontend domain
4. **Firewall** - Only expose to necessary networks

## Connecting from Frontend

Update your frontend to point to this server:

```javascript
const API_BASE = 'http://your-server:3001/api';

// Test connection
const response = await fetch(`${API_BASE}/ilo/status`);
const data = await response.json();
```

## Troubleshooting

### Connection refused
- Check if iLO is reachable: `curl -k https://ILO_IP/redfish/v1`
- Verify credentials work in iLO web interface

### CORS errors
- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Restart the server after changing `.env`

### Certificate errors
- The server ignores self-signed certificates by default
- If using custom CA, you may need to configure it

## IPv6 Support

The server binds to `0.0.0.0` which includes IPv6 on most systems. For IPv6-only:

```javascript
// In server.js, change the listen call to:
app.listen(PORT, '::', () => { ... });
```
