import config from '../config.js'
import {
  Agent,
  Parcel,
  Grid,
  Point,
  TileType,
  GameConfig,
  ExtendedParcel,
} from '../types/index.js'
import Logger from '../utils/Logger.js'
import { parseTimeInterval } from '../utils/utils.js'

const log = Logger('BeliefSet')

class BeliefSet {
  private me: Partial<Agent> = {}
  private carrying: Parcel[] = []
  private grid: Partial<Grid> = {}
  private parcels: Map<string, ExtendedParcel> = new Map()
  private deliveryZones: Point[] = []
  private otherAgents: Map<string, Agent> = new Map()
  private config: Partial<GameConfig> = {}
  private decayTimer: NodeJS.Timeout | null = null

  constructor() {
    // Log state periodically for debugging
    setInterval(() => {
      log.debug('Current Beliefs:', {
        me: this.me,
        carrying: !!this.carrying,
        parcels: this.parcels.size,
        agents: this.otherAgents.size,
      })
    }, config.agent.logInterval)
  }

  /**
   * Returns the current agent's state.
   * @returns {Partial<Agent>}
   */
  getMe(): Partial<Agent> {
    return this.me
  }

  /**
   * Returns the current agent's carrying parcela.
   * @returns {Parcel[]}
   */
  getCarryingParcels(): Parcel[] {
    return this.carrying
  }

  /**
   * Returns the current map grid.
   * @returns {Partial<Grid>}
   */
  getGrid(): Partial<Grid> {
    return this.grid
  }

  /**
   * Returns the list of parcels.
   * @returns {Map<string, ExtendedParcel>}
   */
  getParcels(): Map<string, ExtendedParcel> {
    return this.parcels
  }

  /**
   * Returns the list of other agents' last known states.
   * @returns {Map<string, Agent>}
   */
  getOtherAgents(): Map<string, Agent> {
    return this.otherAgents
  }

  /**
   * Returns the list of delivery zones.
   * @returns {Point[]}
   */
  getDeliveryZones(): Point[] {
    return this.deliveryZones
  }

  /**
   * Returns the current simulation config.
   * @returns {Partial<GameConfig>}
   */
  getConfig(): Partial<GameConfig> {
    return this.config
  }

  /**
   * Updates the simulation config.
   * @param {GameConfig} data - Data from onConfig event.
   */
  updateFromConfig(data: GameConfig) {
    this.config = data
    // Restart decay timer with new interval if config changes
    this.startDecayTimer()
  }

  /**
   * Updates agent's own state.
   * @param {Agent} data - Data from onYou event.
   */
  updateFromYou(data: Agent) {
    this.me = data
  }

  /**
   * Updates the map grid.
   * @param {Grid} data - Data from onMap event.
   */
  updateFromMap(data: Grid) {
    this.grid = data
    // Find delivery zones from the map tiles
    this.deliveryZones = []
    for (let i = 0; i < data.height; i++) {
      for (let j = 0; j < data.width; j++) {
        if (data.tiles[i][j]?.type === TileType.Delivery) {
          this.deliveryZones.push({ x: j, y: i })
        }
      }
    }
    log.info(
      `Map updated: ${data.width}x${data.height}. Delivery zones found: ${this.deliveryZones.length}`,
    )
  }

  /**
   * Updates the state of known parcels.
   * @param {Parcel[]} parcelsData - Data from onParcelsSensing event.
   */
  updateFromParcels(parcelsData: Parcel[]) {
    const seenParcels = new Set<string>()
    const currentTime = Date.now()

    // Update parcels that are currently visible
    for (const p of parcelsData) {
      // Remove parcels that have been picked up by someone
      if (p.carriedBy !== null) {
        this.parcels.delete(p.id)
        continue
      }

      this.parcels.set(p.id, {
        ...p,
        outdated: false,
        lastSeenTimestamp: currentTime,
      })
      seenParcels.add(p.id)
    }

    // Mark parcels that are no longer visible as outdated and apply immediate decay
    for (const [id, parcel] of this.parcels.entries()) {
      if (!seenParcels.has(id) && !parcel.outdated) {
        const decayIntervalMs = parseTimeInterval(
          this.config.PARCEL_DECADING_INTERVAL!,
        )

        // Calculate immediate decay (at least 1 decay period has passed)
        const decayPeriods = decayIntervalMs > 0 ? 1 : 0
        const newReward = Math.max(0, parcel.reward - decayPeriods)

        if (newReward === 0) {
          // Remove parcel immediately if reward becomes 0
          this.parcels.delete(id)
        } else {
          this.parcels.set(id, {
            ...parcel,
            outdated: true,
            lastSeenTimestamp: currentTime,
            lastSeenReward: parcel.reward,
            reward: newReward,
          })
        }
      }
    }
  }

  /**
   * Updates the rewards of outdated parcels based on decay
   */
  private updateOutdatedParcelRewards() {
    const currentTime = Date.now()
    const decayIntervalMs = parseTimeInterval(
      this.config.PARCEL_DECADING_INTERVAL!,
    )

    if (decayIntervalMs <= 0) return

    for (const [id, parcel] of this.parcels.entries()) {
      if (
        parcel.outdated &&
        parcel.lastSeenTimestamp &&
        parcel.lastSeenReward !== undefined
      ) {
        const timeSinceLastSeen = currentTime - parcel.lastSeenTimestamp
        const decayPeriods = Math.floor(timeSinceLastSeen / decayIntervalMs)

        // Apply decay starting from the last seen reward (linear decay)
        const newReward = Math.max(0, parcel.lastSeenReward - decayPeriods)

        if (newReward !== parcel.reward && newReward < parcel.reward) {
          if (newReward === 0) {
            // Remove parcel from belief set when reward reaches 0
            this.parcels.delete(id)
          } else {
            this.parcels.set(id, {
              ...parcel,
              reward: newReward,
            })
          }
        }
      }
    }
  }

  /**
   * Starts the decay timer to update outdated parcel rewards
   */
  private startDecayTimer() {
    if (this.decayTimer) {
      clearInterval(this.decayTimer)
    }

    // Parse the decay interval
    const decayIntervalMs = parseTimeInterval(
      this.config.PARCEL_DECADING_INTERVAL!,
    )

    if (decayIntervalMs > 0) {
      this.decayTimer = setInterval(() => {
        this.updateOutdatedParcelRewards()
      }, decayIntervalMs)
    }
  }

  /**
   * Updates the state of other agents.
   * @param {Agent[]} agentsData - Data from onAgentsSensing event.
   */
  updateFromAgents(data: Agent[]) {
    const seenAgents = new Set<string>()
    for (const agent of data) {
      if (agent.id !== this.me.id) {
        this.otherAgents.set(agent.id, agent)
        seenAgents.add(agent.id)
      }
    }

    // Remove agents that are no longer visible
    for (const id of this.otherAgents.keys()) {
      if (!seenAgents.has(id)) {
        this.otherAgents.delete(id)
      }
    }
  }

  // Utility methods can be added here, e.g.,
  getParcel(id: string): ExtendedParcel | undefined {
    return this.parcels.get(id)
  }

  /**
   * Determines if an agent is currently moving based on their coordinates
   *
   * @param {Agent} agent - The agent to check
   * @returns {boolean} True if the agent is moving, false otherwise
   */
  isAgentMoving(agent: Agent): boolean {
    // Check if x or y coordinates have a decimal part
    const xDecimal = agent.x % 1
    const yDecimal = agent.y % 1

    // Agent is considered moving if coordinates are not whole numbers
    // Moving agents will have coordinates with 0.4 or 0.6 decimal parts
    return xDecimal !== 0 || yDecimal !== 0
  }

  getAgentMovementDirection(agent: Agent): { dx: number; dy: number } | null {
    if (!this.isAgentMoving(agent)) {
      return null
    }

    const xDecimal = agent.x % 1
    const yDecimal = agent.y % 1

    return {
      dx: xDecimal > 0.5 ? 1 : -1, // Moving right if decimal part > 0.5, else left
      dy: yDecimal < 0.5 ? 1 : -1, // Moving down if decimal part < 0.5, else up
    }
  }

  /**
   * Add parcels to the carrying array when pickup occurs
   */
  addCarryingParcel(parcel: Parcel): void {
    this.carrying.push({
      id: parcel.id,
      x: parcel.x,
      y: parcel.y,
      reward: parcel.reward,
      carriedBy: this.me.id,
    })
  }

  /**
   * Remove all parcels from carrying array when delivery occurs
   */
  clearCarryingParcels(): void {
    this.carrying = []
  }
}

export default BeliefSet
