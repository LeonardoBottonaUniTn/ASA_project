import dotenv from 'dotenv'
import path from 'path'

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
})

export enum GameMode {
  SingleAgent = 'single-agent',
  CoOp = 'co-op',
}

interface Config {
  api: {
    host: string
    token: string | undefined
  }
  agent: {
    name: string
  }
  mode: GameMode
  usePddl: boolean
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
  mode: GameMode.SingleAgent,
  usePddl: true, // use PDDL to generate plans
}

export default config
