import { Grid, Point, TileType, Path, Heuristic, Move } from '../types/index.js'
import { manhattanDistance } from '../utils/utils.js'
import { beliefSet } from '../DeliverooDriver.js'

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
   * Finds a path from start to goal using the A* algorithm.
   * It uses a heuristic to guide the search towards the goal.
   *
   * @param {Grid} grid - The map grid from BeliefSet.
   * @param {Point} start - The starting coordinates.
   * @param {Point} goal - The goal coordinates.
   * @returns {Array<Path> | null} A sequence of moves ('up', 'down', 'left', 'right').
   */

  private getNode(grid: Grid, x: number, y: number): { x: number; y: number; type: TileType } | null {
    if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) {
      return null // Out of bounds
    }
    // Ensure the tile exists before accessing its type
    if (!grid.tiles[y] || !grid.tiles[y][x]) {
      return null
    }
    return { x: x, y: y, type: grid.tiles[y][x].type } // Return tile type
  }

  private getNeighbors(currentNode: Point, grid: Grid): { point: Point; move: Move }[] {
    const directions = [
      { dx: 0, dy: 1, move: Move.UP },
      { dx: 0, dy: -1, move: Move.DOWN },
      { dx: -1, dy: 0, move: Move.LEFT },
      { dx: 1, dy: 0, move: Move.RIGHT },
    ]
    const neighbors: { point: Point; move: Move }[] = []
    const occupiedPositions = beliefSet.getOccupiedPositions()

    for (const { dx, dy, move } of directions) {
      const neighborNode = this.getNode(grid, currentNode.x + dx, currentNode.y + dy)

      if (
        neighborNode &&
        neighborNode.type !== TileType.NonWalkable &&
        !occupiedPositions.has(`${neighborNode.x},${neighborNode.y}`)
      ) {
        neighbors.push({
          point: { x: neighborNode.x, y: neighborNode.y },
          move,
        })
      }
    }
    return neighbors
  }

  // Helper to create a unique string key for a point
  private pointToKey(point: Point): string {
    return `${point.x},${point.y}`
  }

  private samePoint(p1: Point, p2: Point): boolean {
    return p1.x === p2.x && p1.y === p2.y
  }

  findPath(start: Point, goal: Point, heuristic: Heuristic = manhattanDistance): Path | null {
    const grid = beliefSet.getGrid() as Grid

    if (!grid.tiles || !start || !goal) {
      console.warn('findPath called with incomplete information (grid, start, or goal missing).')
      return null // Not enough info
    }

    // Check if start or goal are non-walkable or out of bounds
    const startNode = this.getNode(grid, start.x, start.y)
    const goalNode = this.getNode(grid, goal.x, goal.y)
    const occupiedPositions = beliefSet.getOccupiedPositions()

    if (!startNode || startNode.type === TileType.NonWalkable || occupiedPositions.has(`${start.x},${start.y}`)) {
      console.warn(`Start point (${start.x}, ${start.y}) is non-walkable, occupied by another agent or out of bounds.`)
      return null
    }
    if (!goalNode || goalNode.type === TileType.NonWalkable || occupiedPositions.has(`${goal.x},${goal.y}`)) {
      console.warn(`Goal point (${goal.x}, ${goal.y}) is non-walkable, occupied by another agent or out of bounds.`)
      return null
    }
    if (this.samePoint(start, goal)) {
      return { moves: [], cost: 0 } // Already at the goal, returning empty path
    }

    const distances = new Map<string, number>() // Stores the shortest distance from start to each node
    const previous = new Map<string, { point: Point; move: Move }>() // Stores the previous node and the move to get there
    const pq = new PriorityQueue<Point>()

    distances.set(this.pointToKey(start), 0)
    pq.enqueue(start, heuristic(start, goal)) // Priority is f_cost = g_cost (0) + h_cost

    while (!pq.isEmpty()) {
      const currentPoint = pq.dequeue()
      if (!currentPoint) continue

      const currentKey = this.pointToKey(currentPoint)

      if (this.samePoint(currentPoint, goal)) {
        const path: Move[] = []
        let tempCurrent: Point = goal
        while (!this.samePoint(tempCurrent, start)) {
          const prevInfo = previous.get(this.pointToKey(tempCurrent))
          if (!prevInfo) {
            console.error('Path reconstruction error: no previous information found.')
            return null
          }
          path.unshift(prevInfo.move)
          tempCurrent = prevInfo.point
        }
        return { moves: path, cost: distances.get(currentKey) || path.length }
      }

      const currentDistance = distances.get(currentKey) ?? Infinity

      const neighbors = this.getNeighbors(currentPoint, grid)

      for (const { point: neighborPoint, move } of neighbors) {
        const neighborKey = this.pointToKey(neighborPoint)
        const newDistance = currentDistance + 1 // g_cost

        if (newDistance < (distances.get(neighborKey) || Infinity)) {
          distances.set(neighborKey, newDistance)
          previous.set(neighborKey, { point: currentPoint, move })
          const priority = newDistance + heuristic(neighborPoint, goal) // f_cost = g_cost + h_cost
          pq.enqueue(neighborPoint, priority)
        }
      }
    }

    console.info('No path found (priority queue exhausted).')
    return null
  }
}

export default Pathfinder
