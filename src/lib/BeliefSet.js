// src/lib/BeliefSet.js

const { agent } = require('../config')
const Logger = require('../utils/Logger')

const log = Logger('BeliefSet')

class BeliefSet {
  constructor() {
    this.me = {} // { id, name, x, y, score }
    this.carrying = null // The parcel object
    this.grid = {} // { width, height, tiles }
    this.parcels = new Map() // id -> { x, y, reward, carriedBy }
    this.deliveryZones = [] // [{x, y}]
    this.otherAgents = new Map() // id -> { x, y, score }

    // Log state periodically for debugging
    setInterval(() => {
      log.debug('Current Beliefs:', {
        me: this.me,
        carrying: !!this.carrying,
        parcels: this.parcels.size,
        agents: this.otherAgents.size,
      })
    }, agent.logInterval)
  }

  /**
   * Updates agent's own state.
   * @param {object} data - Data from onYou event.
   */
  updateFromYou(data) {
    this.me = data
    if (data.parcelId) {
      this.carrying = this.parcels.get(data.parcelId) || { id: data.parcelId }
    } else {
      this.carrying = null
    }
    log.info('Agent state updated:', this.me)
  }

  /**
   * Updates the map grid.
   * @param {object} data - Data from onMap event.
   */
  updateFromMap(data) {
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
   * @param {Array<object>} parcelsData - Data from onParcelsSensing event.
   */
  updateFromParcels(parcelsData) {
    const seenParcels = new Set()
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
   * @param {Array<object>} agentsData - Data from onAgentsSensing event.
   */
  updateFromAgents(data) {
    const seenAgents = new Set()
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
  getParcel(id) {
    return this.parcels.get(id)
  }

  getClosestParcel(position) {
    let closestParcel = null
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

module.exports = BeliefSet
