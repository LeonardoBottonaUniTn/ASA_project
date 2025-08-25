import {
  Message,
  MessageType,
  HandshakeInitContent,
  HandshakeAckContent,
  HandshakeConfirmContent,
  HelloMessageContent,
} from '../types/index.js'
import { randomUUID } from 'crypto'
import config from '../config.js'
import { beliefSet, actionHandler, bdiAgent } from '../DeliverooDriver.js'

class Communication {
  private discoveredTeammates: Map<string, number> = new Map()

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
        bdiAgent.setHandshake(partnerId, sessionId)
        console.log(`Handshake established with ${partnerId}, session ${sessionId}`)
      }
    } catch (error) {
      console.error(`Handshake with ${partnerId} failed:`, error)
    }
  }

  public handleMessage(fromId: string, msg: Message, reply: (msg: Message) => void): void {
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
    }
  }
}

export default Communication
