// src/config.js
require('dotenv').config({
  path: require('path').resolve(process.cwd(), '.env'),
})

module.exports = {
  // Connection details for the Deliveroo simulation environment
  api: {
    host: process.env.API_HOST || 'http://localhost:8080',
    token: process.env.CLIENT_TOKEN,
  },

  // Agent-specific settings
  agent: {
    name: 'BDI-Agent-007',
    // The interval (in milliseconds) for the BDI engine's main loop
    loopInterval: 500,
    // The interval (in milliseconds) for logging the agent's belief state
    logInterval: 10000,
  },

  // Pathfinder settings
  pathfinder: {
    // 'bfs' or 'astar' (once implemented)
    algorithm: 'bfs',
  },

  // Debugging and logging
  logging: {
    level: 'info', // e.g., 'debug', 'info', 'warn', 'error'
  },
}
