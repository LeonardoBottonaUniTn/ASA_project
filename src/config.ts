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
  TEAM_KEY: string
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
  mode: GameMode.CoOp,
  usePddl: false, // use PDDL to generate GO_TO plans
  TEAM_KEY: 'leonardo-gabriele-team',
}

export default config
