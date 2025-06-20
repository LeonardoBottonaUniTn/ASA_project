// src/lib/ActionHandler.ts

import Logger from '../utils/Logger.js'

const log = Logger('ActionHandler')

class ActionHandler {
  private api: any

  constructor(api: any) {
    this.api = api
  }

  /**
   * Executes a move action.
   * @param {string} direction - 'up', 'down', 'left', or 'right'.
   * @returns {Promise<void>}
   */
  async move(direction: string): Promise<void> {
    log.info(`Executing move: ${direction}`)
    return this.api.emitMove(direction)
  }

  /**
   * Executes a pickup action.
   * @returns {Promise<void>}
   */
  async pickup(): Promise<void> {
    log.info('Executing pickup action.')
    return this.api.emitPickup()
  }

  /**
   * Executes a drop/delivery action.
   * @returns {Promise<void>}
   */
  async drop(): Promise<void> {
    log.info('Executing drop action.')
    return this.api.emitPutdown() // Assuming drop is putdown
  }
}

export default ActionHandler
