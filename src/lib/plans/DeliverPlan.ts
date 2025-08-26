import { DesireType, Predicate } from '../../types/index.js'
import { Plan } from './Plan.js'
import { bdiAgent, beliefSet, actionHandler as client, communication } from '../../DeliverooDriver.js'
import config, { GameMode } from '../../config.js'
import { computeParcelGeneratorPartitioning } from '../../utils/utils.js'

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
    const parcels = await client.drop()
    if (parcels.length > 0) {
      beliefSet.clearCarryingParcels()

      // if in Co-Op mode and responsible for partitioning computation,
      // recompute partitioning after a successful delivery
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
