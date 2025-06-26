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
   * @returns {Promise<{x: number, y: number} | false>}
   */
  async move(
    direction: 'up' | 'down' | 'left' | 'right' | { x: number; y: number },
  ): Promise<{ x: number; y: number } | false> {
    return this.api.emitMove(direction)
  }

  /**
   * Executes a pickup action.
   * @returns {Promise<{id: string}[]>}
   */
  async pickup(): Promise<{ id: string }[]> {
    return this.api.emitPickup()
  }

  /**
   * Executes a delivery action.
   * @returns {Promise<{id: string}[]>}
   */
  async drop(): Promise<{ id: string }[]> {
    return this.api.emitPutdown()
  }
}

export default ActionHandler
