import { DesireType, Point } from '../types/index.js'
import Logger from '../utils/Logger.js'
const log = Logger('Intention')

export class Intention {
  public desireType: DesireType
  public goal: Point | null
  public finished: boolean
  public utility: number

  /**
   * @param {DesireType} desire - The underlying desire.
   * @param {Point} goal - The target coordinates {x, y}.
   * @param {number} utility - The utility of the intention.
   */
  constructor(desireType: DesireType, goal: Point | null, utility = 0) {
    this.desireType = desireType
    this.goal = goal
    this.finished = false
    this.utility = utility
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
      log.info(`Intention finished: ${this.desireType}`)
    }
  }

  /**
   * Checks if this intention is better than another intention.
   * @param {Intention} other - The other intention to compare to.
   * @returns {boolean}
   */
  isBetterThan(other: Intention): boolean {
    return this.utility > other.utility
  }
}
