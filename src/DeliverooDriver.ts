// Main entry point for the Deliveroo BDI Agent

import config, { GameMode } from './config.js'
import { DeliverooApi } from '@unitn-asa/deliveroo-js-client'
import BeliefSet from './lib/BeliefSet.js'
import Pathfinder from './lib/Pathfinder.js'
import Agent from './lib/BDIAgent.js'
import ActionHandler from './lib/ActionHandler.js'
import { DesireType, GameConfig, Message, Parcel, Predicate, TileType, Agent as AgentType } from './types/index.js'
import {
  calculateDeliveryUtility,
  calculateParcelUtility,
  computeParcelGeneratorPartitioning,
  findClosestDeliveryZone,
  getParcelGeneratorInAssignedArea,
} from './utils/utils.js'
import Communication from './lib/Communication.js'

console.log(`Deliveroo BDI Agent [${config.agent.name}] starting...`)

// 1. Initialize connection
const client = new DeliverooApi(config.api.host, config.api.token!)
console.log('Connecting to Deliveroo API...')

// 2. Instantiate core components
const beliefSet = new BeliefSet()
const pathFinder = new Pathfinder()
const actionHandler = new ActionHandler(client)
const bdiAgent = new Agent()
const communication = new Communication()

// 3. Register socket event listeners
console.log('Registering event listeners...')

client.onConfig((config: GameConfig) => {
  beliefSet.updateFromConfig(config)
})

client.onYou((data: { id: string; name: string; x: number; y: number; score: number; penalty: number }) => {
  beliefSet.updateFromYou(data)

  if (config.mode === GameMode.CoOp) {
    communication.sendMyInfo(beliefSet.getMe() as AgentType)
  }

  if (config.usePddl) {
    generateOptions()
  }
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
    // Detect if a new parcel has spawned before updating the belief set.
    const newParcelSpawned = parcels.some((p) => !beliefSet.getParcel(p.id))

    beliefSet.updateFromParcels(parcels)
    if (config.mode === GameMode.CoOp && parcels.length > 0) {
      communication.sendParcelsSensed(parcels)
    }
    if (config.usePddl) {
      generateOptions()
    }
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
      penalty: number
    }[],
  ) => {
    beliefSet.updateFromAgents(agents)
    if (config.mode === GameMode.CoOp) {
      const teammateId = bdiAgent.teammateId
      const filteredAgents = agents.filter((agent) => agent.id !== teammateId)

      if (filteredAgents.length > 0) {
        communication.sendAgentsSensed(filteredAgents)
      }
    }
    if (config.usePddl) {
      generateOptions()
    }
  },
)

client.onMsg(async (id: string, _: string, msg: Message, reply: (msg: Message) => void) => {
  // Handle incoming messages from other agents and reply accordingly if necessary
  communication.handleMessage(id, msg, reply, generateOptions)
})

client.onConnect(() => {
  console.log('Successfully connected and registered to the environment.')
  if (config.mode === GameMode.CoOp) {
    let discoveryInterval = setInterval(() => {
      if (!bdiAgent.handshakeComplete) {
        communication.discover()
      } else {
        clearInterval(discoveryInterval)
      }
    }, 1000) // Periodically discover teammate until handshake is complete

    let partitioningInterval = setInterval(() => {
      if (bdiAgent.handshakeComplete && bdiAgent.initiatedHandshake) {
        const newPartitioning = computeParcelGeneratorPartitioning()
        console.log('new partitioning', newPartitioning)
        if (newPartitioning.size > 0) {
          beliefSet.updateMapPartitioning(newPartitioning)

          // communicate partitioning to the teammate
          communication.sendMapPartitioning(newPartitioning)
        }
      } else if (bdiAgent.handshakeComplete && !bdiAgent.initiatedHandshake) {
        clearInterval(partitioningInterval)
      }
    }, 1000) // Periodically update partitioning
  }
})

client.onDisconnect(() => console.log('Disconnected from the environment.'))

// 4. Kick off the main BDI loop
console.log('Starting BDI engine...')
bdiAgent.loop()
console.log('Agent is running and ready.')

const generateOptions = () => {
  const gameMode: GameMode = config.mode!
  const me = beliefSet.getMe()
  if (!me) {
    return
  }
  const currentIntention = bdiAgent.currentIntention
  const myPos = {
    x: Math.round(me.x),
    y: Math.round(me.y),
  }
  const isCarrying = beliefSet.hasCarryingParcels()
  const sittingOnDeliveryTile = beliefSet.isOnDeliveryTile()
  const closestDeliveryZone = findClosestDeliveryZone({
    x: Math.round(myPos.x),
    y: Math.round(myPos.y),
  })?.deliveryZone
  const sittingOnParcelId = beliefSet.getParcelIdAtCurrentPosition()
  const mapPartitioning = beliefSet.getMapPartitioning()
  const availableParcels = beliefSet.getParcels().filter((parcel) => {
    if (parcel.carriedBy || parcel.reward <= 0) {
      return false
    }
    if (gameMode === GameMode.SingleAgent) {
      return true
    }
    // In multi-agent mode, only pick up parcels in tiles assigned to this agent
    const posKey = `${parcel.x},${parcel.y}`
    const assignedAgent = mapPartitioning.get(posKey)
    return assignedAgent === me.id
  })
  const carriedParcels = beliefSet.getCarryingParcels()
  const totalCarriedReward = carriedParcels.reduce((acc, parcel) => acc + parcel.reward, 0)
  const numCarriedParcels = carriedParcels.length
  let bestParcel: Parcel | null = null
  let maxUtility = -Infinity

  // 1. If currently on a tile with a parcel, pick it up immediately (if parcel
  //    wasn't already as the target of the current intention)
  if (sittingOnParcelId != null && currentIntention?.predicate.parcel_id !== sittingOnParcelId) {
    bdiAgent.push({
      type: DesireType.PICKUP,
      destination: {
        x: Math.round(me.x),
        y: Math.round(me.y),
      },
      utility: Infinity,
      parcel_id: sittingOnParcelId,
    })
    return
  }

  // 2. Deliver all carried parcels (if any) immediately if currently on a
  //    delivery zone and that delivery zone is not the current intention.
  if (
    isCarrying &&
    sittingOnDeliveryTile != null &&
    closestDeliveryZone &&
    currentIntention?.predicate.destination.x !== sittingOnDeliveryTile.x &&
    currentIntention?.predicate.destination.y !== sittingOnDeliveryTile.y
  ) {
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

  // 5. Randomly Explore if no other option is available and there is no current intention
  if (options.length === 0 && !currentIntention) {
    const generator = getParcelGeneratorInAssignedArea()
    if (generator) {
      bdiAgent.push({
        type: DesireType.EXPLORATION,
        destination: generator,
        utility: 0,
      })
    }
    return
  }

  // 6. Push the best option if it has higher utility than the current intention
  if (options.length > 0) {
    options.sort((a, b) => b.utility - a.utility)
    const bestOption = options[0]

    if ((currentIntention && currentIntention.predicate.utility < bestOption.utility) || !currentIntention) {
      bdiAgent.push(bestOption)
    }
  }
}

if (config.usePddl) {
  bdiAgent.onQueueEmpty(generateOptions)
} else {
  setInterval(() => {
    generateOptions()
  }, 1000)
}

export { actionHandler, beliefSet, pathFinder, bdiAgent, communication }
