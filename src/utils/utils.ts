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
 * Calculates the utility of a parcel.
 * @param parcel The parcel to calculate the utility for.
 * @param agent The agent that is calculating the utility.
 * @param grid The grid of the environment.
 * @param config The game config.
 * @param deliveryZones The delivery zones of the environment.
 * @param pathfinder The pathfinder to use for calculating the path.
 * @returns The utility of the parcel.
 */
export const calculateParcelUtility = async (
  parcel: Parcel,
  agent: Agent,
  grid: Grid,
  config: GameConfig,
  deliveryZones: Point[],
  pathfinder: Pathfinder,
): Promise<number> => {
  const pickupPath = await pathfinder.findPath(
    grid,
    { x: agent.x, y: agent.y },
    { x: parcel.x, y: parcel.y },
  )

  if (!pickupPath) {
    return -Infinity
  }

  const timeToPickup = pickupPath.cost * config.MOVEMENT_DURATION

  const numDecays = Math.floor(
    timeToPickup /
      parcelDecadingIntervalMapper[config.PARCEL_DECADING_INTERVAL],
  )
  const futureReward = parcel.reward - numDecays * 1 // @TODO: is it 1?

  // e.g. if the parcel is already decayed
  if (futureReward <= 0) {
    return -Infinity
  }

  let minTimeToDeliver = Infinity

  for (const deliveryZone of deliveryZones) {
    const timeToDeliverPath = await pathfinder.findPath(
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
 * @returns The closest delivery zone.
 *
 * @todo it might be a better solution to pre-compute a map of the closest
 * delivery zone to each tile in the map such that to avoid useless re-computations
 * during the game.
 */
export const findClosestDeliveryZone = async (
  point: Point,
  deliveryZones: Point[],
  grid: Grid,
  pathfinder: Pathfinder,
): Promise<Point | null> => {
  let closestDeliveryZone: Point | null = null
  let minDistance = Infinity

  for (const deliveryZone of deliveryZones) {
    const path = await pathfinder.findPath(grid, point, deliveryZone)
    if (path) {
      if (path.cost < minDistance) {
        minDistance = path.cost
        closestDeliveryZone = deliveryZone
      }
    }
  }

  return closestDeliveryZone
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
 * Mapper for parcel decading interval (game config. property).
 * Maps interval string to milliseconds.
 */
const parcelDecadingIntervalMapper: Record<string, number> = {
  '1s': 1000,
  '2s': 2000,
  '5s': 5000,
  '10s': 10000,
  infinite: Infinity,
} as const
