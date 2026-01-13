/**
 * Configuration loader
 * Centralizes all environment variables and defaults
 */

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim()),
  
  // Optional API key for security
  apiKey: process.env.API_KEY || null,
  
  // iLO configuration
  ilo: {
    host: process.env.ILO_HOST || null,
    username: process.env.ILO_USERNAME || null,
    password: process.env.ILO_PASSWORD || null,
  },
  
  // Channel configuration
  channelStart: parseInt(process.env.CHANNEL_START, 10) || 5001,
  channelCount: parseInt(process.env.CHANNEL_COUNT, 10) || 9,
  
  // Service name patterns (use {port} as placeholder)
  servicePatterns: {
    rx: process.env.SERVICE_PATTERN_RX || 'rx{port}.service',
    rec: process.env.SERVICE_PATTERN_REC || 'rec{port}.service',
    rtmp: process.env.SERVICE_PATTERN_RTMP || 'rtmp{port}.service',
  },
  
  // Config file paths
  configPath: process.env.CONFIG_PATH || '/etc/brateshub',
  
  // Log settings
  logMaxLines: parseInt(process.env.LOG_MAX_LINES, 10) || 200,
};
