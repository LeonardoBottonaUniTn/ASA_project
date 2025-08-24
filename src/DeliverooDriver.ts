// Main entry point for the Deliveroo BDI Agent

import config from './config.js'
import { DeliverooApi } from '@unitn-asa/deliveroo-js-client'
import BeliefSet from './lib/BeliefSet.js'
import Pathfinder from './lib/Pathfinder.js'
import Agent from './lib/BDIAgent.js'
import ActionHandler from './lib/ActionHandler.js'
import { DesireType, GameConfig, Parcel, Predicate, TileType } from './types/index.js'
import {
  calculateDeliveryUtility,
  calculateParcelUtility,
  findClosestDeliveryZone,
  getRandomParcelGenerator,
} from './utils/utils.js'

console.log(`Deliveroo BDI Agent [${config.agent.name}] starting...`)

// 1. Initialize connection
const client = new DeliverooApi(config.api.host, config.api.token!)
console.log('Connecting to Deliveroo API...')

// 2. Instantiate core components
const beliefSet = new BeliefSet()
const pathFinder = new Pathfinder()
const actionHandler = new ActionHandler(client)
const bdiAgent = new Agent()

// 3. Register socket event listeners
console.log('Registering event listeners...')

client.onConfig((config: GameConfig) => {
  beliefSet.updateFromConfig(config)
})

client.onYou((data: { id: string; name: string; x: number; y: number; score: number }) => {
  beliefSet.updateFromYou(data)
})

// this event is triggered once when the agent connects to the environment
client.onMap((width: number, height: number, tiles: { x: number; y: number; type: number }[]) => {
  const grid: { type: TileType }[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill({ type: TileType.NonWalkable }))
  for (const tile of tiles) {
    grid[tile.y][tile.x] = { type: tile.type as TileType }
  }
  beliefSet.updateFromMap({ width, height, tiles: grid })
})

client.onParcelsSensing(
  (
    parcels: {
      id: string
      x: number
      y: number
      carriedBy?: string
      reward: number
    }[],
  ) => {
    beliefSet.updateFromParcels(parcels)
  },
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
  ) => {
    beliefSet.updateFromAgents(agents)
  },
)
client.onConnect(() => console.log('Successfully connected and registered to the environment.'))
client.onDisconnect(() => console.log('Disconnected from the environment.'))

// 4. Kick off the main BDI loop
console.log('Starting BDI engine...')
bdiAgent.loop()
console.log('Agent is running and ready.')

const generateOptions = () => {
  const me = beliefSet.getMe()
  const myPos = {
    x: Math.round(me.x!),
    y: Math.round(me.y!),
  }
  const isCarrying = beliefSet.hasCarryingParcels()
  const isOnDeliveryTile = beliefSet.isOnDeliveryTile()
  const closestDeliveryZone = findClosestDeliveryZone({
    x: Math.round(myPos.x),
    y: Math.round(myPos.y),
  })?.deliveryZone
  const isOnParcel = beliefSet.isOnTileWithParcels()
  const availableParcels = beliefSet.getParcels().filter((parcel) => {
    return !parcel.carriedBy && parcel.reward > 0
  }) // @todo when adding the multi-agent coordination, filters those parcels which are only in the area of the current agent
  const carriedParcels = beliefSet.getCarryingParcels()
  const totalCarriedReward = carriedParcels.reduce((acc, parcel) => acc + parcel.reward, 0)
  const numCarriedParcels = carriedParcels.length
  let bestParcel: Parcel | null = null
  let maxUtility = -Infinity

  // 1. If currently on a tile with a parcel, pick it up immediately
  if (isOnParcel) {
    bdiAgent.push({
      type: DesireType.PICKUP,
      destination: {
        x: Math.round(beliefSet.getMe().x!),
        y: Math.round(beliefSet.getMe().y!),
      },
      utility: Infinity,
    })
    return
  }

  // 2. Deliver all carried parcels (if any) immediately if currently on a delivery zone
  if (isCarrying && isOnDeliveryTile && closestDeliveryZone) {
    bdiAgent.push({
      type: DesireType.DELIVER,
      destination: closestDeliveryZone,
      utility: Infinity,
    })
    return
  }

  const options: Predicate[] = []

  // 3. Generate all parcel options and choose the one with highest utility
  for (const parcel of availableParcels) {
    const utility = calculateParcelUtility(parcel, myPos, totalCarriedReward, numCarriedParcels)

    if (utility > maxUtility && utility > 0) {
      maxUtility = utility
      bestParcel = parcel
    }
  }

  if (bestParcel) {
    options.push({
      type: DesireType.PICKUP,
      destination: {
        x: bestParcel.x,
        y: bestParcel.y,
      },
      utility: maxUtility,
      parcel_id: bestParcel.id,
    })
  }

  // 4. Generate delivery options
  if (isCarrying && closestDeliveryZone) {
    const deliveryUtility = calculateDeliveryUtility(myPos, totalCarriedReward, numCarriedParcels)

    if (deliveryUtility > 0) {
      options.push({
        type: DesireType.DELIVER,
        destination: closestDeliveryZone,
        utility: deliveryUtility,
      })
    }
  }

  // 5. Randomly Explore if no other option is available
  if (options.length === 0) {
    const generator = getRandomParcelGenerator()
    bdiAgent.push({
      type: DesireType.EXPLORATION,
      destination: generator,
      utility: 0,
    })
    return
  }

  if (options.length > 0) {
    options.sort((a, b) => b.utility - a.utility)
    const bestOption = options[0]
    const currentIntention = bdiAgent.currentIntention

    if ((currentIntention && currentIntention.predicate.utility < bestOption.utility) || !currentIntention) {
      bdiAgent.push(bestOption)
    }
  }
}

setInterval(() => {
  generateOptions()
}, 50)

export { actionHandler, beliefSet, pathFinder }
