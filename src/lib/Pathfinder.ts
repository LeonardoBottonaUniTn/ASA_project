import Logger from '../utils/Logger.js'
import { Grid, Point, TileType } from '../types/index.js'

const log = Logger('Pathfinder')

// Helper function for a min-priority queue behavior
class PriorityQueue<T> {
  private elements: { item: T; priority: number }[] = []

  enqueue(item: T, priority: number): void {
    this.elements.push({ item, priority })
    this.elements.sort((a, b) => a.priority - b.priority) // Simple sort for min-priority
  }

  dequeue(): T | undefined {
    return this.elements.shift()?.item
  }

  isEmpty(): boolean {
    return this.elements.length === 0
  }
}

class Pathfinder {
  /**
   * Finds a path from start to goal using Dijkstra's algorithm.
   * Assumes uniform edge weights (cost of 1 per move) for now,
   * but is structured to easily incorporate varying costs.
   * @param {Grid} grid - The map grid from BeliefSet.
   * @param {Point} start - The starting coordinates.
   * @param {Point} goal - The goal coordinates.
   * @returns {Array<string> | null} A sequence of moves ('up', 'down', 'left', 'right').
   */

  getNode(
    grid: Grid,
    x: number,
    y: number,
  ): { x: number; y: number; type: TileType } | null {
    if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) {
      return null // Out of bounds
    }
    // Ensure the tile exists before accessing its type
    if (!grid.tiles[y] || !grid.tiles[y][x]) {
      return null
    }
    return { x: x, y: y, type: grid.tiles[y][x].type } // Return tile type
  }

  getNeighbors(
    currentNode: Point,
    grid: Grid,
  ): { point: Point; move: string }[] {
    const directions = [
      { dx: 0, dy: 1, move: 'up' },
      { dx: 0, dy: -1, move: 'down' },
      { dx: -1, dy: 0, move: 'left' },
      { dx: 1, dy: 0, move: 'right' },
    ]
    const neighbors: { point: Point; move: string }[] = []

    for (const { dx, dy, move } of directions) {
      const neighborNode = this.getNode(
        grid,
        currentNode.x + dx,
        currentNode.y + dy,
      )
      if (neighborNode && neighborNode.type !== TileType.NonWalkable) {
        neighbors.push({
          point: { x: neighborNode.x, y: neighborNode.y },
          move,
        })
      }
    }
    return neighbors
  }

  // Helper to create a unique string key for a point
  pointToKey(point: Point): string {
    return `${point.x},${point.y}`
  }

  // Helper to convert a string key back to a point
  keyToPoint(key: string): Point {
    const parts = key.split(',').map(Number)
    return { x: parts[0], y: parts[1] }
  }

  samePoint(p1: Point, p2: Point): boolean {
    return p1.x === p2.x && p1.y === p2.y
  }

  async findPath(
    grid: Grid,
    start: Point,
    goal: Point,
  ): Promise<string[] | null> {
    if (!grid.tiles || !start || !goal) {
      log.warn(
        'findPath called with incomplete information (grid, start, or goal missing).',
      )
      return null // Not enough info
    }

    // Check if start or goal are non-walkable or out of bounds
    const startNode = this.getNode(grid, start.x, start.y)
    const goalNode = this.getNode(grid, goal.x, goal.y)

    if (!startNode || startNode.type === TileType.NonWalkable) {
      log.warn(
        `Start point (${start.x}, ${start.y}) is non-walkable or out of bounds.`,
      )
      return null
    }
    if (!goalNode || goalNode.type === TileType.NonWalkable) {
      log.warn(
        `Goal point (${goal.x}, ${goal.y}) is non-walkable or out of bounds.`,
      )
      return null
    }
    if (this.samePoint(start, goal)) {
      return [] // Already at the goal
    }

    const distances = new Map<string, number>() // Stores the shortest distance from start to each node
    const previous = new Map<string, { point: Point; move: string }>() // Stores the previous node and the move to get there
    const pq = new PriorityQueue<Point>()

    // Initialize distances
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const key = this.pointToKey({ x, y })
        distances.set(key, Infinity)
      }
    }

    distances.set(this.pointToKey(start), 0)
    pq.enqueue(start, 0)

    while (!pq.isEmpty()) {
      const currentPoint = pq.dequeue()
      if (!currentPoint) continue

      const currentKey = this.pointToKey(currentPoint)
      const currentDistance = distances.get(currentKey)

      // If we reached the goal, reconstruct and return the path
      if (this.samePoint(currentPoint, goal)) {
        const path: string[] = []
        let tempCurrent: Point = goal
        while (!this.samePoint(tempCurrent, start)) {
          const prevInfo = previous.get(this.pointToKey(tempCurrent))
          if (!prevInfo) {
            log.error(
              'Path reconstruction error: no previous information found.',
            )
            return null // Should not happen if a path was found
          }
          path.unshift(prevInfo.move) // Add move to the beginning of the path
          tempCurrent = prevInfo.point
        }
        return path
      }

      // If currentDistance is Infinity, it means we've processed all reachable nodes
      // or this node was enqueued with a higher priority but we found a shorter path earlier.
      // In a proper Dijkstra, we might have visited check here, but with priority queue,
      // it's handled by only processing if a shorter path is found.
      // However, if we've already found a shorter path to this node, skip.
      if (
        currentDistance === undefined ||
        currentDistance >
          (distances.get(this.pointToKey(currentPoint)) || Infinity)
      ) {
        continue
      }

      const neighbors = this.getNeighbors(currentPoint, grid)

      for (const { point: neighborPoint, move } of neighbors) {
        const neighborKey = this.pointToKey(neighborPoint)
        const newDistance = (currentDistance || 0) + 1 // Assuming uniform cost of 1 for now

        if (newDistance < (distances.get(neighborKey) || Infinity)) {
          distances.set(neighborKey, newDistance)
          previous.set(neighborKey, { point: currentPoint, move }) // Store the previous node and the move
          pq.enqueue(neighborPoint, newDistance)
        }
      }
    }

    log.info('No path found (priority queue exhausted).')
    return null
  }

  /**
   * Determines the move direction between two points.
   * This is generally not needed if path is reconstructed with moves,
   * but kept for existing usage if any.
   * @param {Point} from - The starting point.
   * @param {Point} to - The destination point.
   * @returns {string} The move direction ('up', 'down', 'left', 'right').
   */
  getMoveDirection(from: Point, to: Point): string {
    if (to.x === from.x && to.y === from.y + 1) return 'up'
    if (to.x === from.x && to.y === from.y - 1) return 'down'
    if (to.x === from.x - 1 && to.y === from.y) return 'left'
    if (to.x === from.x + 1 && to.y === from.y) return 'right'
    return '' // Should not happen in a valid path
  }
}

export default Pathfinder
