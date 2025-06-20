import Logger from '../utils/Logger.js'
const log = Logger('Intention')

/**
 * Enum for desire types.
 * @readonly
 * @enum {string}
 */
export enum Desire {
  GO_TO_AND_PICKUP = 'GO_TO_AND_PICKUP',
  DELIVER_CARRIED_PARCEL = 'DELIVER_CARRIED_PARCEL',
  EXPLORE_RANDOMLY = 'EXPLORE_RANDOMLY',
}

interface Goal {
  x: number
  y: number
}

export class Intention {
  public desire: Desire
  public goal: Goal | null
  public finished: boolean

  /**
   * @param {Desire} desire - The underlying desire.
   * @param {object} goal - The target coordinates {x, y}.
   */
  constructor(desire: Desire, goal: Goal | null) {
    this.desire = desire
    this.goal = goal
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
      log.info(`Intention finished: ${this.desire}`)
    }
  }
}
