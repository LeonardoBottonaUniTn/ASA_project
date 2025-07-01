import { DesireType, Tour } from '../types/index.js'
import Logger from '../utils/Logger.js'
const log = Logger('Intention')

export class Intention {
  public desireType: DesireType
  public tour: Tour | null
  public finished: boolean
  private executing: boolean = false

  /**
   * @param {DesireType} desire - The underlying desire.
   * @param {Tour} tour - The tour plan.
   */
  constructor(desireType: DesireType, tour: Tour | null) {
    this.desireType = desireType
    this.tour = tour
    this.finished = false
  }

  /**
   * Checks if the intention has been completed.
   * @returns {boolean}
   */
  isFinished(): boolean {
    return this.finished
  }

  /**
   * Marks the intention as completed.
   */
  setFinished() {
    if (!this.finished) {
      this.finished = true
    }
  }

  /**
   * Checks if this intention is better than another intention.
   * @param {Intention} other - The other intention to compare to.
   * @returns {boolean}
   */
  isBetterThan(other: Intention): boolean {
    if (!this.tour) return false
    if (!other.tour) return true
    return this.tour.utility > other.tour.utility
  }

  /**
   * Checks if the intention is currently being executed.
   */
  isExecuting(): boolean {
    return this.executing
  }

  /**
   * Sets the execution status of the intention.
   */
  setExecuting(status: boolean) {
    this.executing = status
  }
}
