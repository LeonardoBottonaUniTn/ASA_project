import {
  Message,
  MessageType,
  HandshakeInitContent,
  HandshakeAckContent,
  HandshakeConfirmContent,
  HelloMessageContent,
  Parcel,
  Agent,
  ParcelsSensedContent,
  AgentsSensedContent,
  MyInfoContent,
  MapPartitioningContent,
} from '../types/index.js'
import { randomUUID } from 'crypto'
import config from '../config.js'
import { beliefSet, actionHandler, bdiAgent } from '../DeliverooDriver.js'

class Communication {
  private discoveredTeammates: Map<string, number> = new Map()

  /**
   * Broadcasts a hello message to discover other team members in the environment.
   *
   * The message allows the other team member to discover this agent's presence
   * and initiate handshake.
   *
   * @returns {Promise<void>} A promise that resolves when the message has been shouted
   */
  public async discover() {
    const me = beliefSet.getMe()
    if (!me) return

    const helloMessage: Message = {
      type: MessageType.HELLO,
      content: {
        teamId: config.TEAM_KEY,
        agentId: me.id,
        timestamp: Date.now(),
      } as HelloMessageContent,
    }
    await actionHandler.shout(helloMessage)
  }

  /**
   * Initiates a three-way handshake protocol with another agent to establish communication.
   *
   * The handshake process consists of three steps:
   * 1. Send an init message with a nonce to the partner
   * 2. Receive an acknowledgment containing the echoed nonce and a new session ID
   * 3. Send a confirmation message to complete the handshake
   *
   * @param partnerId - The ID of the agent to establish handshake with
   * @returns Promise that resolves when handshake is complete or fails
   * @throws Error if communication fails during handshake process
   */
  public async initiateHandshake(partnerId: string): Promise<void> {
    const myId = beliefSet.getMe()?.id
    if (!myId) return

    const nonce = randomUUID()
    const initMessage: Message = {
      type: MessageType.HANDSHAKE_INIT,
      content: {
        teamKey: config.TEAM_KEY,
        nonce,
        from: myId,
      } as HandshakeInitContent,
    }

    try {
      const ackMessage = await actionHandler.ask(partnerId, initMessage)
      const ackContent = ackMessage.content as HandshakeAckContent

      if (
        ackMessage.type === MessageType.HANDSHAKE_ACK &&
        ackContent.teamKey === config.TEAM_KEY &&
        ackContent.echoNonce === nonce
      ) {
        const sessionId = ackContent.sessionId
        const confirmMessage: Message = {
          type: MessageType.HANDSHAKE_CONFIRM,
          content: {
            sessionId,
            from: myId,
          } as HandshakeConfirmContent,
        }
        await actionHandler.say(partnerId, confirmMessage)
        bdiAgent.initiatedHandshake = true
        bdiAgent.setHandshake(partnerId, sessionId)
        console.log(`Handshake established with ${partnerId}, session ${sessionId}`)
      }
    } catch (error) {
      console.error(`Handshake with ${partnerId} failed:`, error)
    }
  }

  /**
   * Sends information about sensed parcels to the teammate agent.
   *
   * @param parcels - Array of sensed parcels.
   * @returns Promise that resolves when the message has been sent
   */
  public async sendParcelsSensed(parcels: Parcel[]): Promise<void> {
    const partnerId = bdiAgent.teammateId
    const sessionId = bdiAgent.sessionId

    if (!partnerId || !sessionId) return

    const message: Message = {
      type: MessageType.PARCELS_SENSED,
      content: {
        sessionId,
        parcels,
      } as ParcelsSensedContent,
    }

    await actionHandler.say(partnerId, message)
  }

  /**
   * Sends information about sensed (other) agents to the teammate agent.
   *
   * @param agents - Array of sensed (other) agents.
   * @returns Promise that resolves when the message has been sent
   */
  public async sendAgentsSensed(agents: Agent[]): Promise<void> {
    const partnerId = bdiAgent.teammateId
    const sessionId = bdiAgent.sessionId

    if (!partnerId || !sessionId) return

    const message: Message = {
      type: MessageType.AGENTS_SENSED,
      content: {
        sessionId,
        agents,
      } as AgentsSensedContent,
    }

    await actionHandler.say(partnerId, message)
  }

  /**
   * Sends the map partitioning to the teammate agent.
   *
   * @param partitioning - The map partitioning to send.
   * @returns Promise that resolves when the message has been sent
   */
  public async sendMapPartitioning(partitioning: Map<string, string>): Promise<void> {
    const partnerId = bdiAgent.teammateId
    const sessionId = bdiAgent.sessionId

    if (!partnerId || !sessionId) return

    // serialize the map partitioning
    const object = Object.fromEntries(partitioning)
    const json = JSON.stringify(object)

    const message: Message = {
      type: MessageType.MAP_PARTITIONING,
      content: {
        sessionId,
        partitioning: json,
      } as MapPartitioningContent,
    }

    await actionHandler.say(partnerId, message)
  }

  /**
   * Sends information about this agent to the teammate agent.
   *
   * @param {Agent} info - Information about this agent.
   * @returns Promise that resolves when the message has been sent
   */
  public async sendMyInfo(info: Agent): Promise<void> {
    const partnerId = bdiAgent.teammateId
    const sessionId = bdiAgent.sessionId

    if (!partnerId || !sessionId) return

    const message: Message = {
      type: MessageType.MY_INFO,
      content: {
        sessionId,
        info,
      } as MyInfoContent,
    }

    await actionHandler.say(partnerId, message)
  }

  /**
   * Handles incoming messages from other agents and processes them according to their type.
   *
   * - HELLO messages: Used for team member discovery
   * - HANDSHAKE_INIT messages: First step of the handshake protocol
   * - HANDSHAKE_CONFIRM messages: Final step of the handshake protocol
   * - PARCELS_SENSED messages: Used to update the teammate's sensed parcels
   * - AGENTS_SENSED messages: Used to update the teammate's sensed agents
   * - MY_INFO messages: Used to update the teammate's state
   * - MAP_PARTITIONING messages: Used to update this agent's map partitioning
   *
   * @param fromId - The ID of the agent sending the message
   * @param msg - The received message object
   * @param reply - Callback function to send a reply message
   * @param onSensedData - Callback function to call when sensed data is
   * received (used to trigger option generation)
   */
  public handleMessage(fromId: string, msg: Message, reply: (msg: Message) => void, onSensedData: () => void): void {
    const myId = beliefSet.getMe()?.id
    if (!myId) return

    switch (msg.type) {
      case MessageType.HELLO: {
        const { teamId, agentId } = msg.content as HelloMessageContent
        if (teamId === config.TEAM_KEY && agentId !== myId) {
          this.discoveredTeammates.set(agentId, Date.now())

          // Tie-breaking logic: lower ID initiates handshake
          if (myId < agentId && !bdiAgent.teammateId) {
            this.initiateHandshake(agentId)
          }
        }
        break
      }
      case MessageType.HANDSHAKE_INIT: {
        const { teamKey, nonce } = msg.content as HandshakeInitContent
        if (teamKey === config.TEAM_KEY) {
          const sessionId = randomUUID()
          const ackMessage: Message = {
            type: MessageType.HANDSHAKE_ACK,
            content: {
              teamKey: config.TEAM_KEY,
              sessionId,
              from: myId,
              echoNonce: nonce,
            } as HandshakeAckContent,
          }
          reply(ackMessage)
        }
        break
      }
      case MessageType.HANDSHAKE_CONFIRM: {
        const { sessionId } = msg.content as HandshakeConfirmContent
        bdiAgent.setHandshake(fromId, sessionId)
        console.log(`Handshake confirmed with ${fromId}, session ${sessionId}`)
        break
      }
      case MessageType.PARCELS_SENSED: {
        const { sessionId, parcels } = msg.content as ParcelsSensedContent
        if (sessionId === bdiAgent.sessionId) {
          console.log(`Received ${parcels.length} parcels from ${fromId}`)
          beliefSet.updateFromParcels(parcels)
          onSensedData() // triggers options generation
        }
        break
      }
      case MessageType.AGENTS_SENSED: {
        const { sessionId, agents } = msg.content as AgentsSensedContent
        if (sessionId === bdiAgent.sessionId) {
          console.log(`Received ${agents.length} agents from ${fromId}`)
          beliefSet.updateFromAgents(agents)
          onSensedData() // triggers options generation
        }
        break
      }
      case MessageType.MY_INFO: {
        const { sessionId, info } = msg.content as MyInfoContent
        if (sessionId === bdiAgent.sessionId) {
          console.log(`Received info from ${fromId} about their new status`)
          beliefSet.setTeammate(info)
          onSensedData() // triggers options generation
        }
        break
      }
      case MessageType.MAP_PARTITIONING: {
        const { sessionId, partitioning: partitioningJson } = msg.content as MapPartitioningContent
        if (sessionId === bdiAgent.sessionId) {
          console.log(`Received map partitioning from ${fromId}:`, partitioningJson)
          const partitioning: Map<string, string> = new Map(Object.entries(JSON.parse(partitioningJson)))
          beliefSet.updateMapPartitioning(partitioning)
        }
        break
      }
    }
  }
}

export default Communication
