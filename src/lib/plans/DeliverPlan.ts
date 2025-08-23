import { DesireType, Predicate } from '../../types/index.js'
import { Plan } from './Plan.js'
import { actionHandler as client } from '../../DeliverooDriver.js'

export class DeliverPlan extends Plan {
  static isApplicableTo(desire: DesireType) {
    return desire === DesireType.DELIVER
  }

  async execute(predicate: Predicate): Promise<Boolean> {
    if (this.stopped) throw ['stopped'] // if stopped then quit
    await this.subIntention({
      type: DesireType.GO_TO,
      destination: predicate.destination,
      utility: predicate.utility,
    })

    if (this.stopped) throw ['stopped'] // if stopped then quit
    await client.drop()
    if (this.stopped) throw ['stopped'] // if stopped then quit
    return true
  }
}
