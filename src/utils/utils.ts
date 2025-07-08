import {
  Agent,
  GameConfig,
  Grid,
  Parcel,
  Point,
  TileType,
} from '../types/index.js'
import Logger from '../utils/Logger.js'
import Pathfinder from '../lib/Pathfinder.js'
import BeliefSet from '../lib/BeliefSet.js'
import path from 'path'

const log = Logger('Utils')

/**
 * Finds the closest delivery zone to a given point.
 * @param point The point to find the closest delivery zone to.
 * @param deliveryZones The delivery zones of the environment.
 * @param grid The grid of the environment.
 * @param pathfinder The pathfinder to use for calculating the path.
 * @returns The closest delivery zone to the given point.
 *
 * @todo it might be a better solution to pre-compute a map of the closest
 * delivery zone to each tile in the map such that to avoid useless re-computations
 * during the game.
 */
export function findClosestDeliveryZone(
  point: Point,
  deliveryZones: Point[],
  grid: Grid,
  pathfinder: Pathfinder,
): Point {
  let closestDeliveryZone: Point | null = null
  let minDistance = Infinity

  for (const deliveryZone of deliveryZones) {
    const path = pathfinder.findPath(grid, point, deliveryZone)
    if (path) {
      if (path.cost < minDistance) {
        minDistance = path.cost
        closestDeliveryZone = deliveryZone
      }
    }
  }

  return closestDeliveryZone || deliveryZones[0]
}

/**
 * Generates a random grid with the given width, height, and density.
 * @param width - The width of the grid.
 * @param height - The height of the grid.
 * @param density - The density of the grid.
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
  log.info(`Grid:\n${gridString}`)
}

/**
 * Returns a random walkable tile from the grid.
 *
 * @returns {Point} A random walkable tile.
 */
export const getRandomWalkableTile = (grid: Grid): Point => {
  while (true) {
    const x = Math.floor(Math.random() * grid.width)
    const y = Math.floor(Math.random() * grid.height)

    if (grid.tiles[y][x].type === TileType.Walkable) {
      return { x, y }
    }
  }
}

/**
 * Mapper for parcel decading interval (game config. property).
 * Maps interval string to milliseconds.
 */
export const parcelDecadingIntervalMapper: Record<string, number> = {
  '1s': 1000,
  '2s': 2000,
  '5s': 5000,
  '10s': 10000,
  infinite: Infinity,
} as const

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
 * Calculates the threat level for a single parcel based on other agents'
 * proximity, movement direction, and potential to reach the parcel quickly.
 * @param parcel The parcel to evaluate.
 * @param beliefSet The agent's current belief set.
 * @param pathfinder The pathfinder to use for calculating distances.
 * @param grid
 * @returns A numerical threat score. Higher is more threatened.
 */
export function calculateParcelThreat(
  parcel: Parcel,
  beliefSet: BeliefSet,
  pathfinder: Pathfinder,
  grid: Grid,
): number {
  // Base threat factor - independent of parcel reward for more balanced assessment
  const BASE_THREAT_FACTOR = 1.0
  // Maximum distance to consider for threat calculation (beyond this, threat is negligible)
  const MAX_THREAT_DISTANCE = 20
  // Minimum distance to avoid division by zero
  const MIN_DISTANCE = 1
  // Factor to control how much movement direction affects threat
  const MOVEMENT_DIRECTION_WEIGHT = 0.7
  // Factor to control how much proximity affects threat
  const PROXIMITY_WEIGHT = 0.3

  let totalThreat = 0
  const otherAgents = beliefSet.getOtherAgents()

  for (const agent of otherAgents.values()) {
    // Calculate actual path distance to the parcel
    const distanceToParcel = pathfinder.findPath(
      grid,
      { x: Math.round(agent.x), y: Math.round(agent.y) },
      { x: parcel.x, y: parcel.y },
    )?.cost

    // Skip if no path exists or agent is too close (already on parcel)
    if (distanceToParcel == null || distanceToParcel < MIN_DISTANCE) continue

    // Skip if agent is too far away to be a meaningful threat
    if (distanceToParcel > MAX_THREAT_DISTANCE) continue

    // Calculate proximity-based threat (closer = higher threat)
    // Use inverse square relationship but with smoother falloff
    const proximityThreat =
      PROXIMITY_WEIGHT * (1 / (1 + distanceToParcel * 0.5))

    // Calculate movement direction threat
    let movementThreat = 0
    const agentMovement = beliefSet.getAgentMovementDirection(agent)

    if (agentMovement) {
      // Calculate the vector from the agent to the parcel
      const vectorToParcel = {
        x: parcel.x - agent.x,
        y: parcel.y - agent.y,
      }

      // Normalize the vector to parcel
      const distance = Math.sqrt(
        vectorToParcel.x * vectorToParcel.x +
          vectorToParcel.y * vectorToParcel.y,
      )
      if (distance > 0) {
        const normalizedVectorToParcel = {
          x: vectorToParcel.x / distance,
          y: vectorToParcel.y / distance,
        }

        // Calculate dot product to determine if agent is moving towards parcel
        const dotProduct =
          agentMovement.dx * normalizedVectorToParcel.x +
          agentMovement.dy * normalizedVectorToParcel.y

        // Only consider positive dot product (moving towards parcel)
        if (dotProduct > 0) {
          // Movement threat increases with how directly the agent is moving towards the parcel
          movementThreat = MOVEMENT_DIRECTION_WEIGHT * dotProduct
        }
      }
    } else {
      // Agent is stationary - still a threat if very close
      if (distanceToParcel <= 3) {
        movementThreat = MOVEMENT_DIRECTION_WEIGHT * 0.3 // Stationary threat
      }
    }

    // Combine proximity and movement threats
    const agentThreat = BASE_THREAT_FACTOR * (proximityThreat + movementThreat)

    // Apply distance-based attenuation for very distant agents
    const distanceAttenuation = Math.max(
      0.1,
      1 - distanceToParcel / MAX_THREAT_DISTANCE,
    )

    totalThreat += agentThreat * distanceAttenuation
  }

  return totalThreat
}

/**
 * Calculates the relative threat level for a parcel by considering the agent's own
 * distance to the parcel compared to other agents' distances.
 * This helps in making competitive decisions about whether to pursue a parcel.
 * @param parcel The parcel to evaluate.
 * @param beliefSet The agent's current belief set.
 * @param pathfinder The pathfinder to use for calculating distances.
 * @param grid
 * @returns A numerical relative threat score. Positive values indicate the agent
 *          has an advantage, negative values indicate disadvantage.
 */
export function calculateRelativeParcelThreat(
  parcel: Parcel,
  beliefSet: BeliefSet,
  pathfinder: Pathfinder,
  grid: Grid,
): number {
  const myPosition = {
    x: Math.round(beliefSet.getMe().x!),
    y: Math.round(beliefSet.getMe().y!),
  }

  // Calculate my distance to the parcel
  const myPath = pathfinder.findPath(grid, myPosition, {
    x: parcel.x,
    y: parcel.y,
  })
  if (!myPath) return -Infinity // I can't reach the parcel

  const myDistance = myPath.cost
  let closestCompetitorDistance = Infinity
  let totalCompetitorThreat = 0

  const otherAgents = beliefSet.getOtherAgents()

  for (const agent of otherAgents.values()) {
    const agentPath = pathfinder.findPath(
      grid,
      { x: Math.round(agent.x), y: Math.round(agent.y) },
      { x: parcel.x, y: parcel.y },
    )

    if (!agentPath) continue // Agent can't reach the parcel

    const agentDistance = agentPath.cost

    // Track the closest competitor
    if (agentDistance < closestCompetitorDistance) {
      closestCompetitorDistance = agentDistance
    }

    // Calculate individual agent threat (similar to calculateParcelThreat but simplified)
    const agentMovement = beliefSet.getAgentMovementDirection(agent)
    let agentThreat = 1 / (1 + agentDistance * 0.3) // Base proximity threat

    if (agentMovement) {
      const vectorToParcel = {
        x: parcel.x - agent.x,
        y: parcel.y - agent.y,
      }
      const distance = Math.sqrt(
        vectorToParcel.x * vectorToParcel.x +
          vectorToParcel.y * vectorToParcel.y,
      )

      if (distance > 0) {
        const normalizedVectorToParcel = {
          x: vectorToParcel.x / distance,
          y: vectorToParcel.y / distance,
        }

        const dotProduct =
          agentMovement.dx * normalizedVectorToParcel.x +
          agentMovement.dy * normalizedVectorToParcel.y

        if (dotProduct > 0) {
          agentThreat *= 1 + dotProduct * 0.5 // Boost threat if moving towards parcel
        }
      }
    }

    totalCompetitorThreat += agentThreat
  }

  // Calculate relative advantage
  // Positive values mean I have an advantage, negative means disadvantage
  const distanceAdvantage = closestCompetitorDistance - myDistance
  const threatDisadvantage = totalCompetitorThreat * 0.5 // Weight factor for competitor threat

  return distanceAdvantage - threatDisadvantage
}

/**
 * Comprehensive threat assessment that combines absolute threat with competitive positioning.
 * This function helps agents make strategic decisions about whether to pursue parcels
 * based on both the overall threat level and their competitive position.
 * @param parcel The parcel to evaluate.
 * @param beliefSet The agent's current belief set.
 * @param pathfinder The pathfinder to use for calculating distances.
 * @param grid
 * @returns An object containing both absolute threat and competitive assessment.
 */
export function assessParcelCompetition(
  parcel: Parcel,
  beliefSet: BeliefSet,
  pathfinder: Pathfinder,
  grid: Grid,
): {
  absoluteThreat: number
  relativeAdvantage: number
  competitiveScore: number
  shouldPursue: boolean
} {
  const absoluteThreat = calculateParcelThreat(
    parcel,
    beliefSet,
    pathfinder,
    grid,
  )
  const relativeAdvantage = calculateRelativeParcelThreat(
    parcel,
    beliefSet,
    pathfinder,
    grid,
  )

  // Calculate competitive score: positive values favor pursuit, negative values discourage
  // We weight relative advantage more heavily than absolute threat
  const competitiveScore = relativeAdvantage * 2 - absoluteThreat * 0.5

  // Decision logic: pursue if competitive score is positive or if we have significant advantage
  const shouldPursue = competitiveScore > 0 || relativeAdvantage > 3

  return {
    absoluteThreat,
    relativeAdvantage,
    competitiveScore,
    shouldPursue,
  }
}

/**
 * Test function to validate threat calculation logic.
 * This can be used for debugging and tuning the threat assessment parameters.
 * @param beliefSet The agent's current belief set.
 * @param pathfinder The pathfinder to use for calculating distances.
 * @param grid
 */
export function debugThreatCalculations(
  beliefSet: BeliefSet,
  pathfinder: Pathfinder,
  grid: Grid,
): void {
  const parcels = beliefSet.getParcels()
  const otherAgents = beliefSet.getOtherAgents()

  log.info(
    `Debugging threat calculations for ${parcels.size} parcels and ${otherAgents.size} other agents`,
  )

  for (const parcel of parcels.values()) {
    const absoluteThreat = calculateParcelThreat(
      parcel,
      beliefSet,
      pathfinder,
      grid,
    )
    const relativeAdvantage = calculateRelativeParcelThreat(
      parcel,
      beliefSet,
      pathfinder,
      grid,
    )
    const competition = assessParcelCompetition(
      parcel,
      beliefSet,
      pathfinder,
      grid,
    )

    log.info(`Parcel ${parcel.id} (reward: ${parcel.reward}):`, {
      absoluteThreat: absoluteThreat.toFixed(2),
      relativeAdvantage: relativeAdvantage.toFixed(2),
      competitiveScore: competition.competitiveScore.toFixed(2),
      shouldPursue: competition.shouldPursue,
    })
  }
}
