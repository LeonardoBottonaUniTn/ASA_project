import { Message } from '../types/index.js'

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
    return await this.api.emitMove(direction)
  }

  /**
   * Executes a pickup action.
   * @returns {Promise<{id: string}[]>}
   */
  async pickup(): Promise<{ id: string }[]> {
    return await this.api.emitPickup()
  }

  /**
   * Executes a delivery action.
   * @returns {Promise<{id: string}[]>}
   */
  async drop(): Promise<{ id: string }[]> {
    return await this.api.emitPutdown()
  }
  /**
   * Sends a message to an agent.
   * @param toId the id of the agent to say to
   * @param {Message} msg the message to say
   * @returns — 'successful' otherwise starts a blocking wait
   */
  async say(toId: string, msg: Message): Promise<'successful'> {
    return await this.api.emitSay(toId, msg)
  }

  /**
   * Sends a message to everyone.
   * @param {Message} msg the message to say
   * @returns — 'successful' otherwise starts a blocking wait
   */
  async shout(msg: Message): Promise<'successful'> {
    return await this.api.emitShout(msg)
  }

  /**
   * Sends a message to an agent and waits for a response.
   * @param toId the id of the agent to ask to
   * @param {Message} msg the message to ask
   * @returns — the message received
   */
  async ask(toId: string, msg: Message): Promise<Message> {
    return await this.api.emitAsk(toId, msg)
  }
}

export default ActionHandler
