import { DesireType, Predicate } from '../../types/index.js'
import { Plan } from './Plan.js'
import { PddlProblem } from '../pddl/problem.js'
import { beliefSet, actionHandler as client } from '../../DeliverooDriver.js'
// @ts-ignore
import { onlineSolver } from '@unitn-asa/pddl-client'
import fs from 'fs/promises'
import path from 'path'

export class PddlMove extends Plan {
  static isApplicableTo(desire: DesireType) {
    return desire === DesireType.GO_TO || desire === DesireType.EXPLORATION
  }

  async execute(predicate: Predicate): Promise<boolean> {
    if (this.stopped) throw ['stopped'] // if stopped then quit

    const pddlProblemGenerator = new PddlProblem(beliefSet)
    const problem = pddlProblemGenerator.generatePddlProblem(predicate.destination)

    const domainPath = path.join(process.cwd(), 'src', 'lib', 'pddl', 'domain.pddl')
    const domain = await fs.readFile(domainPath, 'utf8')

    const plan = await onlineSolver(domain, problem)

    if (!plan || plan.length === 0) {
      const me = beliefSet.getMe()
      const myPos = { x: Math.round(me.x!), y: Math.round(me.y!) }
      if (myPos.x === predicate.destination.x && myPos.y === predicate.destination.y) {
        return true // already at destination
      }
      throw ['no plan found']
    }

    for (const action of plan) {
      if (this.stopped) throw ['stopped']

      const me = beliefSet.getMe()
      const myPos = { x: Math.round(me.x!), y: Math.round(me.y!) }

      if (action.action.toUpperCase() !== 'MOVE') {
        continue
      }

      const fromTile = action.args[1] // e.g., 'TILE-1-3'
      const toTile = action.args[2] // e.g., 'TILE-1-4'

      const fromCoords = fromTile.split('-').slice(1).map(Number)
      const toCoords = toTile.split('-').slice(1).map(Number)

      if (myPos.x !== fromCoords[0] || myPos.y !== fromCoords[1]) {
        this.log(`State mismatch: plan expects agent at ${fromTile}, but agent is at tile-${myPos.x}-${myPos.y}`)
        throw ['state mismatch']
      }

      const toPoint = { x: toCoords[0], y: toCoords[1] }

      const dx = toPoint.x - myPos.x
      const dy = toPoint.y - myPos.y

      let moveDirection: 'up' | 'down' | 'left' | 'right' | undefined

      if (dx === 1 && dy === 0) moveDirection = 'right'
      else if (dx === -1 && dy === 0) moveDirection = 'left'
      else if (dx === 0 && dy === 1) moveDirection = 'up'
      else if (dx === 0 && dy === -1) moveDirection = 'down'

      if (moveDirection) {
        const result = await client.move(moveDirection)
        if (!result) {
          this.log('Move failed')
          throw ['move failed']
        }
      } else {
        // should not happen
        this.log('Invalid move in plan: not a valid adjacent tile')
        throw ['invalid move in plan']
      }
    }

    return true
  }
}
