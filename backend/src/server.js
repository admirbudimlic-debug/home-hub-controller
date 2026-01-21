/**
 * BratesHUB Controller Backend
 * Main Express server for HP server management
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const healthRoutes = require('./routes/health');
const iloRoutes = require('./routes/ilo');
const channelsRoutes = require('./routes/channels');
const servicesRoutes = require('./routes/services');
const logsRoutes = require('./routes/logs');
const analyzeRoutes = require('./routes/analyze');

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const corsOrigins = config.corsOrigins;
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Optional API key authentication
if (config.apiKey) {
  app.use((req, res, next) => {
    // Skip auth for health check
    if (req.path === '/api/health') return next();
    
    const providedKey = req.headers['x-api-key'] || req.query.apiKey;
    if (providedKey !== config.apiKey) {
      logger.warn(`Unauthorized request from ${req.ip}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    }
    next();
  });
}

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/ilo', iloRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/analyze', analyzeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  logger.info('='.repeat(50));
  logger.info('BratesHUB Controller Backend');
  logger.info('='.repeat(50));
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`CORS origins: ${corsOrigins.join(', ')}`);
  logger.info(`API key auth: ${config.apiKey ? 'enabled' : 'disabled'}`);
  logger.info(`Channels: ${config.channelStart} - ${config.channelStart + config.channelCount - 1}`);
  logger.info('='.repeat(50));
  logger.info('Endpoints:');
  logger.info('  GET  /api/health');
  logger.info('  GET  /api/ilo/status');
  logger.info('  POST /api/ilo/power/:action');
  logger.info('  GET  /api/channels');
  logger.info('  GET  /api/channels/:id');
  logger.info('  POST /api/services/:channelId/:service/:action');
  logger.info('  POST /api/services/bulk/:service/:action');
  logger.info('  GET  /api/logs/:channelId/:service');
  logger.info('  GET  /api/analyze');
  logger.info('  GET  /api/analyze/:channelId');
  logger.info('  GET  /api/analyze/:channelId/bitrate');
  logger.info('='.repeat(50));
});

module.exports = app;
