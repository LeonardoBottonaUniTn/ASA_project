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
 * @param beliefSet The agent's current belief set containing other agents' positions
 * @param pathfinder The pathfinder instance for calculating actual distances
 * @param grid The grid representation of the environment
 * @returns A numerical threat score where higher values indicate greater threat
 */
export function calculateParcelThreat(
  parcel: Parcel,
  beliefSet: BeliefSet,
  pathfinder: Pathfinder,
  grid: Grid,
): number {
  // Tunable constants to control threat calculation
  const THREAT_FACTOR = parcel.reward
  const BASE_THREAT_MULTIPLIER = 0.3 // Base threat for stationary agents (fraction of moving threat)
  const DIRECTIONALITY_BONUS = 0.7 // Additional threat multiplier for agents moving toward parcel

  let totalThreat = 0
  const otherAgents = beliefSet.getOtherAgents()

  for (const agent of otherAgents.values()) {
    // Calculate actual distance to the parcel using pathfinder
    const distanceToParcel = pathfinder.findPath(
      grid,
      { x: Math.round(agent.x), y: Math.round(agent.y) },
      { x: parcel.x, y: parcel.y },
    )?.cost

    // Avoid division by zero and threat from an agent already on the parcel
    if (distanceToParcel == null || distanceToParcel < 1) continue

    // Base threat calculation (proximity-based), the thread decays with the
    // square of the distance, not just linearly.
    const proximityThreat =
      THREAT_FACTOR / (distanceToParcel * distanceToParcel)
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
      const dotProduct =
        agentMovement.dx * vectorToParcel.x +
        agentMovement.dy * vectorToParcel.y

      if (dotProduct > 0) {
        // Normalize the dot product by the magnitude of the vector to parcel
        // This gives us a value between 0 and 1 representing how directly the agent is moving toward the parcel
        const vectorMagnitude = Math.sqrt(
          vectorToParcel.x * vectorToParcel.x +
            vectorToParcel.y * vectorToParcel.y,
        )
        const normalizedDirectionality = dotProduct / vectorMagnitude

        // Add directionality bonus scaled by how directly the agent is moving toward the parcel
        agentThreat +=
          proximityThreat * DIRECTIONALITY_BONUS * normalizedDirectionality
      }
    }

    totalThreat += agentThreat
  }

  return totalThreat
}
