import { DesireType, Predicate } from '../../types/index.js'
import { Plan } from './Plan.js'
import { actionHandler as client } from '../../DeliverooDriver.js'

export class PickUpPlan extends Plan {
  static isApplicableTo(desire: DesireType) {
    return desire === DesireType.PICKUP
  }

  async execute(predicate: Predicate): Promise<boolean> {
    if (this.stopped) throw ['stopped'] // if stopped then quit

    await this.subIntention({
      type: DesireType.GO_TO,
      destination: predicate.destination,
      utility: predicate.utility,
      parcel_id: predicate.parcel_id,
    })

    if (this.stopped) throw ['stopped'] // if stopped then quit

    // todo check whether the pickup was successfull and update the belief set
    // accordingly with the newly carried parcel.
    const parcels = await client.pickup()

    if (this.stopped) throw ['stopped'] // if stopped then quit
    return true
  }
}
