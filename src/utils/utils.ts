import { Agent, Grid, Parcel, Path, Point, TileType } from '../types/index.js'
import { beliefSet, pathFinder } from '../DeliverooDriver.js'
import config, { GameMode } from '../config.js'

/**
 * Calculates the Manhattan distance between two points.
 * @param a The first point.
 * @param b The second point.
 */
export const manhattanDistance = (a: Point, b: Point): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Finds the closest delivery zone to a given point.
 * @param point The point to find the closest delivery zone to.
 * @returns The closest delivery zone to the given point, along with the path to
 * reach it.
 *
 * @todo it might be a better solution to pre-compute a map of the closest
 * delivery zone to each tile in the map such that to avoid useless re-computations
 * during the game.
 * @todo we could also account for potential business in the delivery zone.
 */
export function findClosestDeliveryZone(point: Point): {
  deliveryZone: Point
  path: Path
} | null {
  let closestDeliveryZone: Point | null = null
  let closestPath: Path | null = null
  let minDistance = Infinity

  const deliveryZones = beliefSet.getDeliveryZones()

  if (deliveryZones.length === 0) {
    return null
  }

  for (const deliveryZone of deliveryZones) {
    const path = pathFinder.findPath(point, deliveryZone)
    if (path) {
      if (path.cost < minDistance) {
        minDistance = path.cost
        closestDeliveryZone = deliveryZone
        closestPath = path
      }
    }
  }

  if (!closestDeliveryZone || !closestPath) {
    console.warn('No reachable delivery zone found')
    return null
  }

  return {
    deliveryZone: closestDeliveryZone,
    path: closestPath,
  }
}

/**
 * Finds an available, walkable, and reachable position next to the teammate.
 * This is useful for resolving situations where the teammate is blocking a path.
 * @returns {Point | null} An available point near the teammate, or null if none is found.
 */
export function findAvailablePositionNearTeammate(): Point | null {
  const teammate = beliefSet.getTeammate()
  const me = beliefSet.getMe()
  if (!teammate || !me) {
    return null
  }

  const grid = beliefSet.getGrid()
  if (!grid) {
    return null
  }

  const teammatePos = { x: Math.round(teammate.x), y: Math.round(teammate.y) }
  const myPos = { x: Math.round(me.x), y: Math.round(me.y) }

  const directions = [
    { dx: 0, dy: 1 }, // up
    { dx: 0, dy: -1 }, // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 }, // right
  ]

  const occupiedPositions = beliefSet.getOccupiedPositions()

  for (const dir of directions) {
    const neighborPos = { x: teammatePos.x + dir.dx, y: teammatePos.y + dir.dy }

    // Check bounds
    if (neighborPos.x < 0 || neighborPos.x >= grid.width || neighborPos.y < 0 || neighborPos.y >= grid.height) {
      continue
    }

    // Check if walkable
    const tile = grid.tiles[neighborPos.y][neighborPos.x]
    if (tile.type === TileType.NonWalkable) {
      continue
    }

    // Check if occupied
    const neighborKey = `${neighborPos.x},${neighborPos.y}`
    if (occupiedPositions.has(neighborKey)) {
      continue
    }

    // Check if reachable from my position
    const path = pathFinder.findPath(myPos, neighborPos)
    if (path) {
      return neighborPos // Found a reachable, available position
    }
  }

  return null // No suitable position found
}

/**
 * Generates a random grid with the given width, height, and density.
 
 * @returns The generated grid.
 */
export function printGrid(grid: Grid): void {
  let gridString = '┌' + '─'.repeat(grid.width * 2 + 1) + '┐\n'

  // Print grid rows
  for (let y = 0; y < grid.height; y++) {
    let row = '│ '
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.tiles[y][x]
      switch (tile.type) {
        case TileType.NonWalkable:
          row += '█'
          break
        case TileType.ParcelGenerator:
          row += 'P'
          break
        case TileType.Walkable:
          row += '·'
          break
        case TileType.Delivery:
          row += 'D'
          break
      }
      row += ' '
    }
    row += '│\n'
    gridString += row
  }

  gridString += '└' + '─'.repeat(grid.width * 2 + 1) + '┘'
  console.log(`Grid:\n${gridString}`)
}

/**
 * Parses time interval strings like "10s", "1000ms" into milliseconds
 */
export const parseTimeInterval = (interval: string) => {
  const match = interval.match(/^(\d+)(ms|s|m|h)?$/)
  if (!match) return 0

  const value = parseInt(match[1])
  const unit = match[2] || 'ms'

  switch (unit) {
    case 'ms':
      return value
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    default:
      return 0
  }
}

/**
 * Calculates the utility value of picking up a specific parcel, accounting for:
 * - Time needed to pickup and deliver the parcel
 * - Reward decay of currently carried parcels during travel
 * - Reward decay of the target parcel
 * - Threat level from other agents
 *
 * The utility is calculated as: (final total reward) / (total time needed)
 * where final total reward includes both carried parcels and target parcel
 * after accounting for all decay periods.
 *
 * @param parcel - The parcel to evaluate
 * @param agentPos - Current position of the agent
 * @param totalCarriedReward - Sum of rewards of all carried parcels
 * @param numCarriedParcels - Number of parcels currently being carried
 * @returns Utility value (reward/time) for picking up the parcel, or -Infinity if unreachable
 */
export const calculateParcelUtility = (
  parcel: Parcel,
  agentPos: Point,
  totalCarriedReward: number,
  numCarriedParcels: number,
): number => {
  const decayIntervalMs = parseTimeInterval(beliefSet.getConfig().PARCEL_DECADING_INTERVAL!)
  const movementDuration = beliefSet.getConfig().MOVEMENT_DURATION!
  const pickupPath = pathFinder.findPath(agentPos, { x: parcel.x, y: parcel.y })
  if (!pickupPath) return -Infinity
  const closestDeliveryPath = findClosestDeliveryZone({ x: parcel.x, y: parcel.y })?.path
  if (!closestDeliveryPath) return -Infinity

  // time to pickup and deliver the target parcel
  const timeToPickup = pickupPath.cost * movementDuration
  const timeToDeliver = closestDeliveryPath.cost * movementDuration
  const totalTime = timeToPickup + timeToDeliver

  // compute final total reward of currently carried parcels
  let finalCarriedReward = totalCarriedReward
  const decaysUntilPickup = Math.ceil(timeToPickup / decayIntervalMs) // carrying N parcels
  const decaysUntilDelivery = Math.ceil(timeToDeliver / decayIntervalMs) // carrying N+1 parcels

  if (numCarriedParcels > 0) {
    finalCarriedReward -= decaysUntilPickup * numCarriedParcels
    finalCarriedReward -= decaysUntilDelivery * (numCarriedParcels + 1)
  }

  // compute final reward of the target parcel
  const threat = calculateParcelThreat(parcel)
  const rewardAtPickup = parcel.reward - decaysUntilPickup - threat
  const finalTargetReward = rewardAtPickup - decaysUntilDelivery * (numCarriedParcels + 1)

  // final utility
  const totalFinalReward = Math.max(0, finalCarriedReward) + Math.max(0, finalTargetReward)

  return totalFinalReward / totalTime
}

/**
 * Calculates the utility value of delivering currently carried parcels to the closest delivery zone.
 *
 * The utility is calculated as the final reward divided by the time needed to deliver,
 * accounting for reward decay during travel time.
 *
 * @param agentPos - Current position of the agent
 * @param totalCarriedReward - Sum of rewards of all carried parcels
 * @param numCarriedParcels - Number of parcels currently being carried
 * @returns Utility value (reward/time) for delivering parcels, or -Infinity if no delivery zone is reachable
 */
export const calculateDeliveryUtility = (
  agentPos: Point,
  totalCarriedReward: number,
  numCarriedParcels: number,
): number => {
  const closestDeliveryPath = findClosestDeliveryZone(agentPos)?.path
  if (!closestDeliveryPath) return -Infinity

  const decayIntervalMs = parseTimeInterval(beliefSet.getConfig().PARCEL_DECADING_INTERVAL!)
  const movementDuration = beliefSet.getConfig().MOVEMENT_DURATION!
  const timeToDeliver = closestDeliveryPath.cost * movementDuration

  // compute decay that will occur during travel
  const decays = Math.ceil(timeToDeliver / decayIntervalMs)
  const totalDecayAmount = decays * numCarriedParcels

  const finalReward = totalCarriedReward - totalDecayAmount

  // --- 3. Compute Final Utility ---
  return Math.max(0, finalReward) / timeToDeliver
}

/**
 * Calculates the threat level for a single parcel based on other agents'
 * proximity and movement direction.
 *
 * ## Overview
 *
 * The threat assessment considers two factors:
 * 1. **Proximity Threat**: All nearby agents pose a baseline threat simply by being
 *    close to the parcel, as they could potentially move toward it at any time.
 * 2. **Directional Threat**: Moving agents receive an additional threat bonus based
 *    on how directly they're moving toward the parcel, representing immediate intent.
 *
 * ## Mathematical Formula
 *
 * For each agent, the threat is calculated as:
 *
 * ```
 * proximity_threat = THREAT_FACTOR / distance²
 *
 * For stationary agents:
 * agent_threat = proximity_threat × BASE_THREAT_MULTIPLIER
 *
 * For moving agents:
 * directionality = (movement_vector · parcel_vector) / ||parcel_vector||
 * agent_threat = proximity_threat × (BASE_THREAT_MULTIPLIER + DIRECTIONALITY_BONUS × directionality)
 *
 * total_threat = Σ(agent_threat) for all agents
 * ```
 *
 * Where:
 * - `distance` is the pathfinding distance from agent to parcel
 * - `movement_vector` is the agent's current movement direction (dx, dy)
 * - `parcel_vector` is the vector from agent position to parcel position
 * - `directionality` ∈ [0,1] represents how directly the agent moves toward the parcel
 * - The inverse square law (1/distance²) ensures nearby agents dominate the threat calculation
 *
 * @param parcel The parcel to evaluate threat for
 * @returns A numerical threat score where higher values indicate greater threat
 */
export function calculateParcelThreat(parcel: Parcel): number {
  // Tunable constants to control threat calculation
  const THREAT_FACTOR = parcel.reward
  const BASE_THREAT_MULTIPLIER = 0.3 // Base threat for stationary agents (fraction of moving threat)
  const DIRECTIONALITY_BONUS = 0.7 // Additional threat multiplier for agents moving toward parcel

  let totalThreat = 0
  const otherAgents = beliefSet.getOtherAgents()

  for (const agent of otherAgents.values()) {
    // Calculate actual distance to the parcel using pathfinder
    const path = pathFinder.findPath({ x: Math.round(agent.x), y: Math.round(agent.y) }, { x: parcel.x, y: parcel.y })
    const distanceToParcel = path?.cost

    // Avoid division by zero and threat from an agent already on the parcel
    if (distanceToParcel == null || distanceToParcel < 1) continue

    // Base threat calculation (proximity-based), the thread decays with the
    // square of the distance, not just linearly.
    const proximityThreat = THREAT_FACTOR / (distanceToParcel * distanceToParcel)
    let agentThreat = proximityThreat * BASE_THREAT_MULTIPLIER

    // Check if agent is moving and add directionality bonus
    const agentMovement = beliefSet.getAgentMovementDirection(agent)
    if (agentMovement) {
      // Calculate the vector from the agent to the parcel
      const vectorToParcel = {
        x: parcel.x - agent.x,
        y: parcel.y - agent.y,
      }

      // Dot product checks if the agent is moving towards the parcel
      const dotProduct = agentMovement.dx * vectorToParcel.x + agentMovement.dy * vectorToParcel.y

      if (dotProduct > 0) {
        // Normalize the dot product by the magnitude of the vector to parcel
        // This gives us a value between 0 and 1 representing how directly the agent is moving toward the parcel
        const vectorMagnitude = Math.sqrt(vectorToParcel.x * vectorToParcel.x + vectorToParcel.y * vectorToParcel.y)
        const normalizedDirectionality = dotProduct / vectorMagnitude

        // Add directionality bonus scaled by how directly the agent is moving toward the parcel
        agentThreat += proximityThreat * DIRECTIONALITY_BONUS * normalizedDirectionality
      }
    }

    totalThreat += agentThreat
  }

  return totalThreat
}

/**
 * Computes the longest path between any two strategic points on the map
 * (parcel generators and delivery zones).
 *
 * To optimize performance, this function first identifies the top K pairs of
 * points with the largest Manhattan distance. It then computes the actual
 * path cost for these candidate pairs using the A* algorithm and returns the
 * highest cost found. This avoids running expensive pathfinding on every
 * possible pair of points.
 *
 * @returns {number} The length of the longest path found.
 */
export function computeLongestPath(): number {
  const parcelGenerators = beliefSet.getParcelGenerators()
  const deliveryZones = beliefSet.getDeliveryZones()
  const strategicPoints = [...parcelGenerators, ...deliveryZones]

  if (strategicPoints.length < 2) {
    return 0
  }

  const K = 10 // Consider top K points with largest manhattan distance
  const allPairs: { p1: Point; p2: Point; distance: number }[] = []

  for (let i = 0; i < strategicPoints.length; i++) {
    for (let j = i + 1; j < strategicPoints.length; j++) {
      const p1 = strategicPoints[i]
      const p2 = strategicPoints[j]
      const distance = manhattanDistance(p1, p2)
      allPairs.push({ p1, p2, distance })
    }
  }

  allPairs.sort((a, b) => b.distance - a.distance)
  const candidates = allPairs.slice(0, K)

  let longestPath = 0

  for (const { p1, p2 } of candidates) {
    const path = pathFinder.findPath(p1, p2)
    if (path && path.cost > longestPath) {
      longestPath = path.cost
    }
  }

  console.info(`Computed longest path: ${longestPath}`)
  return longestPath
}
/**
 * Returns a random parcel generator from the agent's assigned Voronoi region.
 * This is used for exploration when the agent is idle.
 * @returns {Point | null} A random parcel generator point, or null if none are assigned.
 */
export function getParcelGeneratorInAssignedArea(): Point | null {
  const mode = config.mode
  const me = beliefSet.getMe()
  if (!me) return null

  // In single agent mode, return random generator
  if (mode === GameMode.SingleAgent) {
    const generators = beliefSet.getParcelGenerators()
    if (generators.length === 0) return null
    const randomIndex = Math.floor(Math.random() * generators.length)
    return generators[randomIndex]
  }

  // In CoOp mode, use Voronoi partitioning
  const partitioning = beliefSet.getMapPartitioning()
  const myGenerators: Point[] = []

  for (const [generatorKey, agentId] of partitioning.entries()) {
    if (agentId === me.id) {
      const [x, y] = generatorKey.split(',').map(Number)
      myGenerators.push({ x, y })
    }
  }

  if (myGenerators.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * myGenerators.length)
  return myGenerators[randomIndex]
}

export const getRandomPosition = () => {
  const grid = beliefSet.getGrid()!
  const randomX = Math.floor(Math.random() * grid.width)
  const randomY = Math.floor(Math.random() * grid.height)
  return { x: randomX, y: randomY }
}

/**
 * Computes the Voronoi-based partitioning of parcel generators for the two
 * collaborating agents, with an added capacity constraint.
 *
 * First, it assigns each generator to the closest agent (standard Voronoi).
 * Then, it iteratively rebalances the partitions to ensure each agent is
 * responsible for a roughly equal number of generators. Rebalancing occurs
 * by moving generators from over-capacity agents to under-capacity agents,
 * prioritizing reassignments with the lowest cost (smallest increase in distance).
 *
 * This method is called when the partitioning needs to be updated,
 * e.g., when a new parcel spawns or a delivery is completed.
 * @returns A Map where keys are generator coordinates ("x,y") and values are agent IDs
 */
export function computeParcelGeneratorPartitioning(): Map<string, string> {
  const partitioning = new Map<string, string>()
  const generators = beliefSet.getParcelGenerators()
  const me = beliefSet.getMe()
  const teammate = beliefSet.getTeammate()

  if (!me || !teammate) return partitioning

  const allAgents = [me, teammate] as Agent[]

  if (allAgents.length === 0 || generators.length === 0) {
    return partitioning
  }

  // Step 1: For each generator, find the distance to each agent.
  const generatorAgentDistances = new Map<string, { agentId: string; distance: number }[]>()
  for (const generator of generators) {
    const distances: { agentId: string; distance: number }[] = []
    for (const agent of allAgents) {
      const path = pathFinder.findPath({ x: Math.round(agent.x), y: Math.round(agent.y) }, generator)
      const pathCost = path?.cost ?? Infinity
      distances.push({ agentId: agent.id, distance: pathCost })
    }
    distances.sort((a, b) => a.distance - b.distance)
    const generatorKey = `${generator.x},${generator.y}`
    generatorAgentDistances.set(generatorKey, distances)
  }

  // Step 2: Initial Voronoi partitioning.
  const agentLoads = new Map<string, string[]>(allAgents.map((a) => [a.id, []]))
  for (const [generatorKey, distances] of generatorAgentDistances.entries()) {
    const bestAgentId = distances[0]?.agentId
    if (bestAgentId && distances[0].distance !== Infinity) {
      partitioning.set(generatorKey, bestAgentId)
      agentLoads.get(bestAgentId)?.push(generatorKey)
    }
  }

  // Step 3: Rebalance partitions to meet capacity constraints.
  const numAgents = allAgents.length
  const targetCapacity = Math.floor(generators.length / numAgents)
  const agentsWithExtraCapacity = generators.length % numAgents

  // Determine capacity for each agent
  const agentCapacity = new Map<string, number>()
  allAgents.forEach((agent, index) => {
    agentCapacity.set(agent.id, targetCapacity + (index < agentsWithExtraCapacity ? 1 : 0))
  })

  let rebalancingOccurred = true
  while (rebalancingOccurred) {
    rebalancingOccurred = false

    const overCapacityAgents = allAgents.filter(
      (agent) => (agentLoads.get(agent.id)?.length ?? 0) > (agentCapacity.get(agent.id) ?? 0),
    )
    const underCapacityAgents = allAgents.filter(
      (agent) => (agentLoads.get(agent.id)?.length ?? 0) < (agentCapacity.get(agent.id) ?? 0),
    )

    if (overCapacityAgents.length === 0 || underCapacityAgents.length === 0) {
      break // Balanced
    }

    let bestReassignment: {
      generatorKey: string
      fromAgentId: string
      toAgentId: string
      cost: number
    } | null = null

    for (const fromAgent of overCapacityAgents) {
      const fromAgentId = fromAgent.id
      const assignedGenerators = agentLoads.get(fromAgentId) ?? []

      for (const generatorKey of assignedGenerators) {
        const distances = generatorAgentDistances.get(generatorKey)
        if (!distances) continue

        const currentDist = distances.find((d) => d.agentId === fromAgentId)?.distance ?? Infinity

        for (const toAgent of underCapacityAgents) {
          const toAgentId = toAgent.id
          const newDist = distances.find((d) => d.agentId === toAgentId)?.distance ?? Infinity
          const cost = newDist - currentDist

          if (!bestReassignment || cost < bestReassignment.cost) {
            bestReassignment = { generatorKey, fromAgentId, toAgentId, cost }
          }
        }
      }
    }

    if (bestReassignment) {
      const { generatorKey, fromAgentId, toAgentId } = bestReassignment

      // Perform reassignment
      partitioning.set(generatorKey, toAgentId)

      // Update loads
      const fromAgentLoad = agentLoads.get(fromAgentId)
      if (fromAgentLoad) {
        agentLoads.set(
          fromAgentId,
          fromAgentLoad.filter((g) => g !== generatorKey),
        )
      }
      agentLoads.get(toAgentId)?.push(generatorKey)

      rebalancingOccurred = true
    }
  }

  return partitioning
}
