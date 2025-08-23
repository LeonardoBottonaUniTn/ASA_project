import { Intention } from './Intention.js'
import { beliefSet } from '../DeliverooDriver.js'
import { DesireType, Predicate } from '../types/index.js'

export class BDI_Agent {
  #intentionQueue: Intention[] = new Array<Intention>()

  /**
   * IntentionRevisionReplace loop
   */
  async loop() {
    while (true) {
      // Consumes intention_queue if not empty
      if (this.#intentionQueue.length > 0) {
        console.log(
          'intentionRevision.loop',
          this.#intentionQueue.map((i) => i.predicate),
        )

        // Current intention
        const intention = this.#intentionQueue[0]
        const predicate = intention.predicate

        // Checks if the current intention is still valid. If not, removing it
        if (predicate.type === DesireType.DELIVER && !beliefSet.hasCarryingParcels()) {
          this.#intentionQueue.shift()
          continue
        }

        if (predicate.type === DesireType.PICKUP && predicate.parcel_id) {
          const parcel = beliefSet.getParcel(predicate.parcel_id)

          if (parcel && parcel.carriedBy) {
            this.#intentionQueue.shift()
            continue
          }
        }

        // Start achieving intention
        const result = await intention
          .achieve()
          // Catch eventual error and continue
          .catch((error) => {
            console.log('Failed intention', intention.predicate, 'with error:', ...error)
            return false
          })

        if (!result) {
          this.log("Couldn't complete intention:", intention)
        }

        // Remove from the queue
        this.#intentionQueue.shift()
      }
      // Postpone next iteration at setImmediate
      await new Promise((res) => setImmediate(res))
    }
  }

  async push(predicate: Predicate) {
    // add utility threshold to prevent rapid intention switching
    const UTILITY_THRESHOLD = 0.05

    // this.log('Revising intention queue. Received:', predicate)

    // check if already queued
    const lastIndex = this.#intentionQueue.length - 1
    const last = lastIndex >= 0 ? this.#intentionQueue[lastIndex] : null

    if (last && JSON.stringify(last.predicate) === JSON.stringify(predicate)) {
      return // intention is already being achieved
    }

    const createAndPushIntention = () => {
      this.log('IntentionRevisionReplace.push', predicate)
      const intention = new Intention(this, predicate)
      this.#intentionQueue.push(intention)
    }

    if (this.#intentionQueue.length > 0) {
      const current = this.#intentionQueue[0]

      // only switch if new intention is significantly better
      if (predicate.utility > current.predicate.utility + UTILITY_THRESHOLD) {
        createAndPushIntention()

        // stop current intention if it exists
        if (current) {
          current.stop()
        }
      }
    } else {
      createAndPushIntention()
    }
  }

  log(...args: any[] | [object]) {
    const formattedArgs = args.map((arg) => {
      if (arg && typeof arg === 'object') {
        return JSON.stringify(arg, null, 2)
      }
      return arg
    })
    console.log('[BDI_Agent]', ...formattedArgs)
  }
}

export default BDI_Agent
