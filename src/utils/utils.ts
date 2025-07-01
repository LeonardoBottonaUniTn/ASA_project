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

const log = Logger('Utils')

/**
 * Calculates the utility of a parcel. The utility is computed as the future reward divided by the total time cost.
 * The future reward is the reward of the parcel minus the number of decays multiplied by the average reward.
 * The total time cost is the time to pickup the parcel plus the time to deliver the parcel.
 * The time to pickup the parcel is the number of moves multiplied by the movement duration.
 *
 * @param parcel The parcel to calculate the utility for.
 * @param agent The agent that is calculating the utility.
 * @param grid The grid of the environment.
 * @param config The game config.
 * @param deliveryZones The delivery zones of the environment.
 * @param pathfinder The pathfinder to use for calculating the path.
 * @returns The utility of the parcel.
 */
export function calculateParcelUtility(
  parcel: Parcel,
  agent: Agent,
  grid: Grid,
  config: GameConfig,
  deliveryZones: Point[],
  pathfinder: Pathfinder,
): number {
  const pickupPath = pathfinder.findPath(
    grid,
    { x: Math.round(agent.x), y: Math.round(agent.y) }, // starting point
    { x: parcel.x, y: parcel.y }, // goal point
  )

  if (!pickupPath) {
    return -Infinity
  }

  const timeToPickup = pickupPath.moves.length * config.MOVEMENT_DURATION

  let minTimeToDeliver = Infinity

  for (const deliveryZone of deliveryZones) {
    const timeToDeliverPath = pathfinder.findPath(
      grid,
      { x: parcel.x, y: parcel.y },
      deliveryZone,
    )
    if (timeToDeliverPath) {
      const timeToDeliver = timeToDeliverPath.cost * config.MOVEMENT_DURATION
      if (timeToDeliver < minTimeToDeliver) {
        minTimeToDeliver = timeToDeliver
      }
    }
  }

  if (minTimeToDeliver === Infinity) {
    return -Infinity
  }

  const totalTimeCost = timeToPickup + minTimeToDeliver

  const numDecays = Math.floor(
    totalTimeCost /
      parcelDecadingIntervalMapper[config.PARCEL_DECADING_INTERVAL],
  )
  const futureReward = parcel.reward - numDecays

  // e.g. if the parcel is already decayed
  if (futureReward <= 0 || futureReward - numDecays <= 0) {
    return -Infinity
  }

  if (totalTimeCost === 0) {
    return Infinity
  }

  return futureReward / totalTimeCost
}

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
