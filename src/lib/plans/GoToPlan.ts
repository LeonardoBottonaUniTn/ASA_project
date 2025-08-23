import { Plan } from './Plan.js'
import { DesireType, Point, Predicate } from '../../types/index.js'
import { beliefSet, pathFinder } from '../../DeliverooDriver.js'
import { actionHandler as client } from '../../DeliverooDriver.js'

export class GoToPlan extends Plan {
  static isApplicableTo(desire: DesireType) {
    return desire === DesireType.GO_TO || desire === DesireType.EXPLORATION
  }

  async execute(predicate: Predicate): Promise<boolean> {
    if (this.stopped) throw ['stopped'] // if stopped then quit

    const me = beliefSet.getMe()
    const path = pathFinder.findPath({ x: me.x!, y: me.y! }, predicate.destination)

    if (!path) {
      throw ['no path found']
    }
    if (path.moves.length === 0) {
      return true // already at destination
    }

    for (const move of path.moves) {
      if (this.stopped) throw ['stopped']

      const result = await client.move(move)

      if (!result) {
        this.log('Move failed')
        throw ['move failed']
      }
    }

    return true
  }
}
