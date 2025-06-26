import dotenv from 'dotenv'
import path from 'path'
import { LogLevel, logLevels } from './types/index.js'

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
})

interface Config {
  api: {
    host: string
    token: string | undefined
  }
  agent: {
    name: string
    loopInterval: number
    logInterval: number
  }
  logging: {
    level: LogLevel
  }
}

const config: Config = {
  // Connection details for the Deliveroo simulation environment
  api: {
    host: process.env.API_HOST || 'http://localhost:8080',
    token: process.env.CLIENT_TOKEN,
  },

  // Agent-specific settings
  agent: {
    name: 'BDI-Agent-007',
    // The interval (in milliseconds) for the BDI engine's main loop
    loopInterval: 50,
    // The interval (in milliseconds) for logging the agent's belief state
    logInterval: 10000,
  },

  // Debugging and logging
  logging: {
    level: 'info', // e.g., 'debug', 'info', 'warn', 'error'
  },
}

if (!logLevels.includes(config.logging.level)) {
  throw new Error(`Invalid log level: ${config.logging.level}`)
}

export default config
