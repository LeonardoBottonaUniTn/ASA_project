import { Grid, TileType } from '../types/index.js'
import Logger from '../utils/Logger.js'
const log = Logger('Utils')

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
