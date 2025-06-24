import config from '../config.js'
import { Agent, Parcel, Grid, Point, TileType } from '../types/index.js'
import Logger from '../utils/Logger.js'

const log = Logger('BeliefSet')

class BeliefSet {
  private me: Partial<Agent> = {}
  private carrying: Parcel | null = null
  private grid: Partial<Grid> = {}
  private parcels: Map<string, Parcel> = new Map()
  private deliveryZones: Point[] = []
  private otherAgents: Map<string, Agent> = new Map()

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
   * Returns the current agent's carrying state.
   * @returns {Parcel | null}
   */
  getCarrying(): Parcel | null {
    return this.carrying
  }

  /**
   * Updates the agent's carrying state.
   * @param {Parcel | null} parcel - The parcel being carried or null if not carrying.
   */
  setCarrying(parcel: Parcel | null) {
    this.carrying = parcel
    log.info(`Carrying updated: ${!!this.carrying}`)
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
   * @returns {Map<string, Parcel>}
   */
  getParcels(): Map<string, Parcel> {
    return this.parcels
  }

  /**
   * Returns the list of other agents.
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
   * Updates agent's own state.
   * @param {Agent} data - Data from onYou event.
   */
  updateFromYou(data: Agent) {
    this.me = data
    log.info('Agent state updated:', this.me)
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
    for (const p of parcelsData) {
      this.parcels.set(p.id, p)
      seenParcels.add(p.id)
    }

    // Remove parcels that are no longer visible
    for (const id of this.parcels.keys()) {
      if (!seenParcels.has(id)) {
        this.parcels.delete(id)
      }
    }
    log.debug(`Parcels updated: ${this.parcels.size} visible.`)
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
  getParcel(id: string): Parcel | undefined {
    return this.parcels.get(id)
  }

  getClosestParcel(position: Point): Parcel | null {
    let closestParcel: Parcel | null = null
    let minDistance = Infinity

    for (const parcel of this.parcels.values()) {
      if (!parcel.carriedBy) {
        const distance =
          Math.abs(position.x - parcel.x) + Math.abs(position.y - parcel.y)
        if (distance < minDistance) {
          minDistance = distance
          closestParcel = parcel
        }
      }
    }
    return closestParcel
  }
}

export default BeliefSet
