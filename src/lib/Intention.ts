import { Predicate } from '../types/index.js'
import { PickUpPlan } from './plans/PickUpPlan.js'
import { DeliverPlan } from './plans/DeliverPlan.js'
import { GoToPlan } from './plans/GoToPlan.js'
import { Plan } from './plans/Plan.js'

const planLibrary: (typeof Plan)[] = []

planLibrary.push(PickUpPlan)
planLibrary.push(DeliverPlan)
planLibrary.push(GoToPlan)

/**
 * Intention
 */
export class Intention {
  #predicate: Predicate
  #parent: any // refers to caller
  #current_plan: any // Plan currently used for achieving the intention
  #started: boolean = false
  #stopped: boolean = false // used to stop the intention

  constructor(parent: any, predicate: Predicate) {
    this.#parent = parent
    this.#predicate = predicate
  }

  get stopped(): boolean {
    return this.#stopped
  }

  get predicate(): Predicate {
    return this.#predicate
  }

  /**
   * Stops the intention
   */
  stop(): void {
    // this.log('stop intention', ...this.#predicate);
    this.#stopped = true
    if (this.#current_plan) this.#current_plan.stop()
  }

  log(...args: any[]): void {
    if (this.#parent && this.#parent.log) this.#parent.log('\t', ...args)
    else console.log(...args)
  }

  /**
   * Using the plan library to achieve an intention
   */
  async achieve(): Promise<any> {
    // Cannot start twice
    if (this.#started) return this
    else this.#started = true

    // Trying all plans in the library
    for (const planClass of planLibrary) {
      // if stopped then quit
      if (this.stopped) throw ['stopped intention', this.predicate]

      // if plan is 'statically' applicable
      if (planClass.isApplicableTo(this.predicate.type)) {
        // plan is instantiated
        this.#current_plan = new planClass(this.#parent)
        this.log('achieving intention', this.predicate, 'with plan', planClass.name)
        // and plan is executed and result returned
        try {
          const plan_res = await this.#current_plan.execute(this.predicate)
          this.log('successful intention', this.predicate, 'with plan', planClass.name, 'with result:', plan_res)
          return plan_res
          // or errors are caught so to continue with next plan
        } catch (error) {
          this.log('failed intention', this.predicate, 'with plan', planClass.name, 'with error:', error)
        }
      }
    }

    // if stopped then quit
    if (this.stopped) throw ['stopped intention', this.predicate]

    // no plans have been found to satisfy the intention
    // this.log('no plan satisfied the intention ', ...this.predicate);
    throw ['no plan satisfied the intention ', this.predicate]
  }
}
