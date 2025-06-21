// Main entry point for the Deliveroo BDI Agent

import config from './config.js'
import Logger from './utils/Logger.js'
import { DeliverooApi } from '@unitn-asa/deliveroo-js-client'
import BeliefSet from './lib/BeliefSet.js'
import Pathfinder from './lib/Pathfinder.js'
import BDI_Engine from './lib/BDI_Engine.js'
import ActionHandler from './lib/ActionHandler.js'
import { TileType } from './types/index.js'

const log = Logger('DeliverooDriver')

async function main() {
  log.info(`Deliveroo BDI Agent [${config.agent.name}] starting...`)

  // 1. Initialize connection
  const client = new DeliverooApi(config.api.host, config.api.token!)
  log.info('Connecting to Deliveroo API...')

  // 2. Instantiate core components
  const beliefSet = new BeliefSet()
  const pathfinder = new Pathfinder()
  const actionHandler = new ActionHandler(client)
  const bdiEngine = new BDI_Engine(beliefSet, pathfinder, actionHandler)

  // 3. Register socket event listeners
  log.info('Registering event listeners...')
  client.onYou(
    (data: {
      id: string
      name: string
      x: number
      y: number
      score: number
      parcelId?: string
    }) => beliefSet.updateFromYou(data),
  )
  client.onMap(
    (
      width: number,
      height: number,
      tiles: { x: number; y: number; type: number }[],
    ) => {
      const grid: { type: TileType }[][] = Array(height)
        .fill(null)
        .map(() => Array(width).fill({ type: TileType.NonWalkable }))
      for (const tile of tiles) {
        // Invert the y coordinate to flip the map vertically
        const flippedY = height - 1 - tile.y
        grid[flippedY][tile.x] = { type: tile.type as TileType }
      }
      beliefSet.updateFromMap({ width, height, tiles: grid })
    },
  )

  client.onParcelsSensing(
    (
      parcels: {
        id: string
        x: number
        y: number
        carriedBy: string | null
        reward: number
      }[],
    ) => beliefSet.updateFromParcels(parcels),
  )
  client.onAgentsSensing(
    (
      agents: {
        id: string
        name: string
        x: number
        y: number
        score: number
      }[],
    ) => beliefSet.updateFromAgents(agents),
  )
  client.onConnect(() =>
    log.info('Successfully connected and registered to the environment.'),
  )
  client.onDisconnect(() => log.info('Disconnected from the environment.'))

  // 4. Kick off the main BDI loop
  log.info('Starting BDI engine...')
  bdiEngine.run()

  log.info('Agent is running and ready.')
}

main().catch((error) => {
  log.error('An unhandled error occurred:', error)
  process.exit(1)
})
