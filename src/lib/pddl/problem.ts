import { BeliefSet } from '../BeliefSet.js'
import { Point, TileType } from '../../types/index.js'
import fs from 'fs'
import path from 'path'

// This class handles the PDDL problem creation based on the current map which
// will later be used by the PDDL online solver to find a plan.
export class PddlProblem {
  private beliefSet: BeliefSet

  constructor(beliefSet: BeliefSet) {
    this.beliefSet = beliefSet
  }

  generatePddlProblem(goal: Point): string {
    const grid = this.beliefSet.getGrid()
    if (!grid) throw ['no grid']
    const me = this.beliefSet.getMe()
    if (!me) throw ['no me']
    const myPos = { x: Math.round(me.x), y: Math.round(me.y) }

    const objects: string[] = []
    const init: string[] = []

    // Add agent
    objects.push('agent1 - agent')

    // Add tiles and create a set of walkable tiles for efficient lookup
    const walkableTilesSet = new Set<string>()
    const walkableTiles: Point[] = []
    if (grid.tiles) {
      for (let y = 0; y < grid.height!; y++) {
        for (let x = 0; x < grid.width!; x++) {
          if (grid.tiles[y][x].type !== TileType.NonWalkable) {
            const tileName = `tile-${x}-${y}`
            objects.push(`${tileName} - tile`)
            walkableTiles.push({ x, y })
            walkableTilesSet.add(`tile-${x}-${y}`)
          }
        }
      }
    }

    // Set agent's initial position
    init.push(`(at agent1 tile-${myPos.x}-${myPos.y})`)

    // Determine all occupied positions using the belief set's occupiedPositions map
    const occupiedPddlPositions = new Set<string>()

    const occupiedPositionsFromBeliefs = this.beliefSet.getOccupiedPositions()
    for (const posKey of occupiedPositionsFromBeliefs.keys()) {
      const [x, y] = posKey.split(',').map(Number)
      occupiedPddlPositions.add(`tile-${x}-${y}`)
    }

    // Set free tiles
    for (const tile of walkableTiles) {
      const tileName = `tile-${tile.x}-${tile.y}`
      if (!occupiedPddlPositions.has(tileName)) {
        init.push(`(free ${tileName})`)
      }
    }

    // Set adjacent tiles
    for (const tile of walkableTiles) {
      const { x, y } = tile
      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ]

      for (const neighbor of neighbors) {
        if (walkableTilesSet.has(`tile-${neighbor.x}-${neighbor.y}`)) {
          init.push(`(adjacent tile-${x}-${y} tile-${neighbor.x}-${neighbor.y})`)
        }
      }
    }

    const goalState = `(at agent1 tile-${goal.x}-${goal.y})`

    const pddlProblemString = `(define (problem deliveroo-problem)
  (:domain deliveroo-grid)
  (:objects
    ${objects.join('\n    ')}
  )
  (:init
    ${init.join('\n    ')}
  )
  (:goal ${goalState})
)`

    const filePath = path.join(process.cwd(), 'src', 'lib', 'pddl', 'problem.pddl')
    fs.writeFileSync(filePath, pddlProblemString)

    return pddlProblemString
  }
}
