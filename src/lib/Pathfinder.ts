import { Grid, Point, TileType } from '../types/index.js'

class Pathfinder {
  /**
   * Finds a path from start to goal using Breadth-First Search.
   * @param {Grid} grid - The map grid from BeliefSet.
   * @param {Point} start - The starting coordinates.
   * @param {Point} goal - The goal coordinates.
   * @returns {Array<string> | null} A sequence of moves ('up', 'down', 'left', 'right').
   */
  findPath(grid: Grid, start: Point, goal: Point): string[] | null {
    if (!grid.tiles || !start || !goal) {
      return null // Not enough info
    }

    const { width, height, tiles } = grid
    const queue: { x: number; y: number; path: string[] }[] = [
      { ...start, path: [] },
    ]
    const visited = new Set([`${start.x},${start.y}`])

    const directions: { [key: string]: Point } = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    }

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.x === goal.x && current.y === goal.y) {
        return current.path // Path found
      }

      for (const [move, dir] of Object.entries(directions)) {
        const nextX = current.x + dir.x
        const nextY = current.y + dir.y
        const nextKey = `${nextX},${nextY}`

        // Check bounds and if visited
        if (
          nextX >= 0 &&
          nextX < width &&
          nextY >= 0 &&
          nextY < height &&
          !visited.has(nextKey) &&
          tiles[nextY][nextX].type !== TileType.NonWalkable // Check for obstacles
        ) {
          visited.add(nextKey)
          const newPath = [...current.path, move]
          queue.push({ x: nextX, y: nextY, path: newPath })
        }
      }
    }

    return null // No path found
  }
}

export default Pathfinder
