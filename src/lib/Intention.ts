import { DesireType, Point } from '../types/index.js'
import Logger from '../utils/Logger.js'
const log = Logger('Intention')

export class Intention {
  public desireType: DesireType
  public goal: Point | null
  public finished: boolean

  /**
   * @param {DesireType} desire - The underlying desire.
   * @param {object} goal - The target coordinates {x, y}.
   */
  constructor(desireType: DesireType, goal: Point | null) {
    this.desireType = desireType
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
      log.info(`Intention finished: ${this.desireType}`)
    }
  }
}
