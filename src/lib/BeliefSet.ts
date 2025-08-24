import { Agent, Parcel, Grid, Point, TileType, GameConfig, ExtendedParcel } from '../types/index.js'
import { computeLongestPath, parseTimeInterval } from '../utils/utils.js'

class BeliefSet {
  private me: Partial<Agent> = {}
  private carrying: Parcel[] = []
  private grid: Partial<Grid> = {}
  private parcels: Map<string, ExtendedParcel> = new Map()
  private deliveryZones: Point[] = []
  private parcelGenerators: Point[] = []
  private otherAgents: Map<string, Agent> = new Map()
  private config: Partial<GameConfig> = {}
  private activeParcelPositions: Set<string> = new Set()
  private occupiedPositions: Map<string, number> = new Map() // O(1) lookup for currently unavailable tiles using string keys
  private longestPathLength: number = 0 // longest path between strategic points on the map

  /**
   * Returns the current agent's state.
   * @returns {Partial<Agent>}
   */
  getMe(): Partial<Agent> {
    return this.me
  }

  /**
   * Returns the current agent's carrying parcels.
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
   * Returns the list of valid parcels (computes decay lazily and removes expired).
   * @returns {ExtendedParcel[]}
   */
  getParcels(): ExtendedParcel[] {
    this.cleanupExpiredParcels()
    return Array.from(this.parcels.values())
  }

  /**
   * Returns a specific valid parcel by its ID.
   * @param {string} id - The ID of the parcel.
   * @returns {ExtendedParcel | undefined}
   */
  getParcel(id: string): ExtendedParcel | undefined {
    this.cleanupExpiredParcels()
    return this.parcels.get(id)
  }

  /**
   * Cleans up all expired parcels by computing their current rewards.
   */
  private cleanupExpiredParcels() {
    const currentTime = Date.now()
    const decayIntervalMs = parseTimeInterval(this.config.PARCEL_DECADING_INTERVAL!)

    for (const [id, parcel] of this.parcels.entries()) {
      if (parcel.outdated && parcel.lastSeenTimestamp && parcel.lastSeenReward !== undefined) {
        const timeSinceLastSeen = currentTime - parcel.lastSeenTimestamp
        const decayPeriods = Math.floor(timeSinceLastSeen / decayIntervalMs)
        const newReward = Math.max(0, parcel.lastSeenReward - decayPeriods)

        if (newReward <= 0) {
          const posKey = `${parcel.x},${parcel.y}`
          this.activeParcelPositions.delete(posKey)
          this.parcels.delete(id)
        } else if (newReward !== parcel.reward) {
          parcel.reward = newReward
        }
      }
    }
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
   * Returns the list of tiles which are able to generate parcels.
   * @returns {Point[]}
   */
  getParcelGenerators(): Point[] {
    return this.parcelGenerators
  }

  /**
   * Returns the current simulation config.
   * @returns {Partial<GameConfig>}
   */
  getConfig(): Partial<GameConfig> {
    return this.config
  }

  /**
   * Returns the map of occupied positions along with their last seen occupation timestamp
   * @returns {Map<string, number>}
   */
  getOccupiedPositions(): Map<string, number> {
    return this.occupiedPositions
  }

  /**
   * Updates the simulation config.
   * @param {GameConfig} data - Data from onConfig event.
   */
  updateFromConfig(data: GameConfig) {
    this.config = data
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
    // Find delivery zones and tiles which generate parcels from the map tiles
    this.deliveryZones = []
    this.parcelGenerators = []

    for (let i = 0; i < data.height; i++) {
      for (let j = 0; j < data.width; j++) {
        if (data.tiles[i][j]?.type === TileType.Delivery) {
          this.deliveryZones.push({ x: j, y: i })
        }
        if (data.tiles[i][j]?.type === TileType.ParcelGenerator) {
          this.parcelGenerators.push({ x: j, y: i })
        }
      }
    }
    console.info(
      `Map updated: ${data.width}x${data.height}. Delivery zones found: ${this.deliveryZones.length}. Parcel generators found: ${this.parcelGenerators.length}`,
    )

    // Pre-compute the longest path on the map
    this.longestPathLength = computeLongestPath()
  }

  /**
   * Updates the state of known parcels.
   * @param {Parcel[]} parcelsData - Data from onParcelsSensing event.
   */
  updateFromParcels(parcelsData: Parcel[]) {
    const seenParcels = new Set<string>()
    const currentTime = Date.now()

    // Create a map of current parcel positions for quick lookup
    const currentParcelPositions = new Map<string, Parcel[]>()
    for (const p of parcelsData) {
      const posKey = `${p.x},${p.y}`
      if (!currentParcelPositions.has(posKey)) {
        currentParcelPositions.set(posKey, [])
      }
      currentParcelPositions.get(posKey)!.push(p)
    }

    // Update parcels that are currently visible
    for (const p of parcelsData) {
      this.parcels.set(p.id, {
        ...p,
        outdated: false,
        lastSeenTimestamp: currentTime,
        lastSeenReward: p.reward,
      })
      seenParcels.add(p.id)
    }

    // Handle parcels not currently visible
    for (const [id, parcel] of this.parcels.entries()) {
      if (!seenParcels.has(id) && !parcel.outdated) {
        const posKey = `${parcel.x},${parcel.y}`
        if (currentParcelPositions.has(posKey)) {
          // Position is sensed
          const parcelsAtPosition = currentParcelPositions.get(posKey)!
          if (!parcelsAtPosition.some((p) => p.id === id)) {
            // Parcel not present in sensed position, assume picked up or gone
            this.parcels.delete(id)
            continue
          }
        } else {
          // Position not sensed, mark as outdated
          this.parcels.set(id, {
            ...parcel,
            outdated: true,
            lastSeenTimestamp: currentTime,
            lastSeenReward: parcel.reward,
          })
        }
      }
    }

    // Update active parcel positions for O(1) lookup
    this.activeParcelPositions.clear()
    for (const parcel of this.parcels.values()) {
      if (!parcel.carriedBy && parcel.reward > 0) {
        const posKey = `${parcel.x},${parcel.y}`
        this.activeParcelPositions.add(posKey)
      }
    }
  }

  /**
   * Updates the state of other agents.
   * @param {Agent[]} agentsData - Data from onAgentsSensing event.
   */
  updateFromAgents(data: Agent[]) {
    const seenAgents = new Set<string>()
    const now = Date.now()

    for (const agent of data) {
      if (agent.id !== this.me.id) {
        // If we've seen this agent before, remove its old position from the occupied map.
        if (this.otherAgents.has(agent.id)) {
          const oldAgent = this.otherAgents.get(agent.id)!
          const oldPosKey = `${Math.round(oldAgent.x)},${Math.round(oldAgent.y)}`
          this.occupiedPositions.delete(oldPosKey)
        }

        const posKey = `${Math.round(agent.x)},${Math.round(agent.y)}`
        this.otherAgents.set(agent.id, agent)
        this.occupiedPositions.set(posKey, now)
        seenAgents.add(agent.id)
      }
    }

    // Remove agents that are no longer visible
    for (const id of Array.from(this.otherAgents.keys())) {
      if (!seenAgents.has(id)) {
        this.otherAgents.delete(id)
      }
    }

    // Cleanup very old timestamps so the map doesn't grow forever. The forget
    // time is an estimate set as the time it takes for an agent to move along
    // the longest path on the map.
    const forgetMs = this.longestPathLength * this.config.MOVEMENT_DURATION!

    for (const [posKey, ts] of this.occupiedPositions.entries()) {
      if (now - ts > forgetMs) {
        this.occupiedPositions.delete(posKey)
      }
    }
  }

  // ------------------------ Utility methods  ------------------------

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
  addCarryingParcel(parcelId: string): void {
    const parcel = this.parcels.get(parcelId)
    if (parcel) {
      this.carrying.push({
        id: parcelId,
        x: parcel.x,
        y: parcel.y,
        reward: parcel.reward,
        carriedBy: this.me.id,
      })
    }
  }

  /**
   * Remove all parcels from carrying array when delivery occurs
   */
  clearCarryingParcels(): void {
    this.carrying = []
  }

  /**
   * Checks if agent has any carrying parcels
   * @returns {boolean} True if agent is carrying parcels
   */
  hasCarryingParcels(): boolean {
    return this.carrying.length > 0
  }

  /**
   * Checks if the agent is currently on a delivery tile.
   * @returns {boolean} True if on a delivery tile, false otherwise.
   */
  isOnDeliveryTile(): boolean {
    if (!this.me.x || !this.me.y || !this.grid.tiles) {
      return false
    }
    const x = Math.floor(this.me.x)
    const y = Math.floor(this.me.y)
    const tile = this.grid.tiles[y][x]
    return tile?.type === TileType.Delivery
  }

  /**
   * Checks if the agent is currently on tile with an active parcel.
   * @returns {boolean} True if on a tile with an active parcel, false otherwise.
   */
  isOnTileWithParcels(): boolean {
    if (!this.me.x || !this.me.y || !this.grid.tiles) {
      return false
    }
    const x = Math.round(this.me.x)
    const y = Math.round(this.me.y)
    if (y < 0 || y >= this.grid.height! || x < 0 || x >= this.grid.width!) {
      return false
    }
    const posKey = `${x},${y}`
    return this.activeParcelPositions.has(posKey)
  }
}

export default BeliefSet
