// src/lib/BeliefSet.ts

import config from '../config'
import Logger from '../utils/Logger'

const log = Logger('BeliefSet')

// Type definitions
interface Agent {
  id: string
  name: string
  x: number
  y: number
  score: number
  parcelId?: string
}

interface Parcel {
  id: string
  x: number
  y: number
  reward: number
  carriedBy: string | null
}

interface Tile {
  delivery: boolean
}

interface Grid {
  width: number
  height: number
  tiles: Tile[][]
}

interface Point {
  x: number
  y: number
}

class BeliefSet {
  me: Partial<Agent> = {}
  carrying: Parcel | null = null
  grid: Partial<Grid> = {}
  parcels: Map<string, Parcel> = new Map()
  deliveryZones: Point[] = []
  otherAgents: Map<string, Agent> = new Map()

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
   * Updates agent's own state.
   * @param {Agent} data - Data from onYou event.
   */
  updateFromYou(data: Agent) {
    this.me = data
    if (data.parcelId) {
      this.carrying =
        this.parcels.get(data.parcelId) || ({ id: data.parcelId } as Parcel)
    } else {
      this.carrying = null
    }
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
        if (data.tiles[i][j].delivery) {
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
