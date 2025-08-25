import { Intention } from './Intention.js'
import { beliefSet } from '../DeliverooDriver.js'
import { DesireType, Predicate } from '../types/index.js'

export class BDI_Agent {
  #intentionQueue: Intention[] = new Array<Intention>()
  #onQueueEmpty: (() => void) | null = null
  #handshakeComplete: boolean = false
  #teammateId: string | null = null
  #sessionId: string | null = null

  get intentionQueue(): Intention[] {
    return this.#intentionQueue
  }

  get currentIntention(): Intention | undefined {
    return this.#intentionQueue[0]
  }

  get handshakeComplete(): boolean {
    return this.#handshakeComplete
  }

  get teammateId(): string | null {
    return this.#teammateId
  }

  get sessionId(): string | null {
    return this.#sessionId
  }

  setHandshake(teammateId: string, sessionId: string): void {
    this.#teammateId = teammateId
    this.#sessionId = sessionId
    this.#handshakeComplete = true
  }

  set handshakeComplete(value: boolean) {
    this.#handshakeComplete = value
  }

  /**
   * Sets a callback to be executed when the intention queue becomes empty.
   * @param callback The function to call.
   */
  onQueueEmpty(callback: () => void) {
    this.#onQueueEmpty = callback
  }

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
          this.log("Couldn't complete intention:", intention.predicate)
        } else {
          this.log('Completed intention:', intention.predicate)
        }

        // Remove from the queue
        this.#intentionQueue.shift()

        // If the queue is now empty, trigger the callback to generate new options
        if (this.#intentionQueue.length === 0 && this.#onQueueEmpty) {
          this.log('Intention queue is empty, triggering option generation.')
          this.#onQueueEmpty()
        }
      }
      // Postpone next iteration at setImmediate
      await new Promise((res) => setImmediate(res))
    }
  }

  async push(predicate: Predicate) {
    // this.log('Revising intention queue. Received:', predicate)

    // check if already queued
    const lastIndex = this.#intentionQueue.length - 1
    const last = lastIndex >= 0 ? this.#intentionQueue[lastIndex] : null

    // Compare predicates ignoring the utility property
    if (
      last &&
      JSON.stringify({ ...last.predicate, utility: undefined }) === JSON.stringify({ ...predicate, utility: undefined })
    ) {
      return // intention is already being achieved
    }

    this.log('IntentionRevisionReplace.push', predicate)
    const intention = new Intention(this, predicate)
    this.#intentionQueue.push(intention)

    if (last) {
      last.stop()
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
