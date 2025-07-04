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
  // A tunable constant to control how much threat affects decisions.
  // Higher values make the agent more cautious.
  const THREAT_FACTOR = parcel.reward
  let totalThreat = 0
  const otherAgents = beliefSet.getOtherAgents()

  for (const agent of otherAgents.values()) {
    const agentMovement = beliefSet.getAgentMovementDirection(agent)

    if (!agentMovement) {
      continue // Agent is not moving.
    }

    // actual distance to the parcel using pathfinder
    const distanceToParcel = pathfinder.findPath(
      grid,
      { x: Math.round(agent.x), y: Math.round(agent.y) },
      { x: parcel.x, y: parcel.y },
    )?.cost
    // Avoid division by zero and threat from an agent already on the parcel
    if (distanceToParcel == null || distanceToParcel < 1) continue

    // Calculate the vector from the agent to the parcel
    const vectorToParcel = {
      x: parcel.x - agent.x,
      y: parcel.y - agent.y,
    }

    // Dot product checks if the agent is moving towards the parcel.
    const dotProduct =
      agentMovement.dx * vectorToParcel.x + agentMovement.dy * vectorToParcel.y

    if (dotProduct > 0) {
      // Threat is higher if the agent is closer and moving more directly towards the parcel.
      totalThreat +=
        (THREAT_FACTOR * dotProduct) / (distanceToParcel * distanceToParcel)
    }
  }

  return totalThreat
}
