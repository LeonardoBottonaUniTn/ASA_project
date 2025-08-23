import dotenv from 'dotenv'
import path from 'path'

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
  },
}

export default config
