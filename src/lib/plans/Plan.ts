import { DesireType, Predicate } from '../../types/index.js'
import { Intention } from '../Intention.js'

/**
 * This represents the base class.
 */
export class Plan {
  #parent: any // refers to caller
  #stopped: boolean = false // used to stop the plan
  // this is an array of sub intention. Multiple ones could eventually be achieved in parallel.
  #sub_intentions: Intention[] = []

  constructor(parent: any) {
    this.#parent = parent
  }

  static isApplicableTo(type: DesireType) {
    return true
  }

  get stopped(): boolean {
    return this.#stopped
  }

  stop(): void {
    // this.log( 'stop plan' );
    this.#stopped = true
    for (const i of this.#sub_intentions) {
      i.stop()
    }
  }

  log(...args: any[]): void {
    if (this.#parent && this.#parent.log) this.#parent.log('\t', ...args)
    else console.log(...args)
  }

  async subIntention(predicate: Predicate): Promise<any> {
    const sub_intention = new Intention(this, predicate)
    this.#sub_intentions.push(sub_intention)
    return sub_intention.achieve()
  }
}
