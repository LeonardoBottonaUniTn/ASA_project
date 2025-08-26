import { DesireType, Predicate } from '../../types/index.js'
import { Plan } from './Plan.js'
import { beliefSet, actionHandler as client, communication, bdiAgent } from '../../DeliverooDriver.js'
import config from '../../config.js'
import { GameMode } from '../../config.js'
import { computeParcelGeneratorPartitioning } from '../../utils/utils.js'

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
    const parcels = await client.pickup()

    if (parcels.length > 0) {
      for (const parcel of parcels) {
        beliefSet.addCarryingParcel(parcel.id)
      }
      // if in Co-Op mode and responsible for partitioning computation,
      // recompute partitioning after a successful pickup
      if (config.mode === GameMode.CoOp && bdiAgent.initiatedHandshake) {
        const newPartitioning = computeParcelGeneratorPartitioning()
        beliefSet.updateMapPartitioning(newPartitioning)
        await communication.sendMapPartitioning(newPartitioning) // send to teammate
      }
    }

    if (this.stopped) throw ['stopped'] // if stopped then quit
    return true
  }
}
