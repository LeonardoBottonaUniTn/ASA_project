import { Intention } from './Intention.js'
import config from '../config.js'
import Logger from '../utils/Logger.js'
import { DesireType, Grid, TileType } from '../types/index.js'
import BeliefSet from './BeliefSet.js'
import Pathfinder from './Pathfinder.js'
import ActionHandler from './ActionHandler.js'
import { Desire } from '../types/index.js'

const log = Logger('BDI_Engine')

class BDI_Engine {
  private beliefSet: BeliefSet
  private pathfinder: Pathfinder
  private actionHandler: ActionHandler
  private currentIntention: Intention | null = null

  constructor(
    beliefSet: BeliefSet,
    pathfinder: Pathfinder,
    actionHandler: ActionHandler,
  ) {
    this.beliefSet = beliefSet
    this.pathfinder = pathfinder
    this.actionHandler = actionHandler
  }

  /**
   * The main agent loop.
   */
  run() {
    setInterval(() => {
      // If there's an ongoing intention, let it finish
      if (this.currentIntention && !this.currentIntention.isFinished()) {
        this.execute(this.currentIntention)
        return
      }

      // 1. SENSE: Beliefs are updated externally.

      // 2. DELIBERATE: Generate desires.
      const desires = this.deliberate()
      log.debug(
        'Generated desires:',
        desires.map((d) => d.type),
      )

      // 3. FILTER: Choose the best intention.
      const newIntention = this.filter(desires)
      if (newIntention) {
        this.currentIntention = newIntention
        log.info('New intention selected:', {
          type: this.currentIntention.desireType,
          goal: this.currentIntention.goal,
        })
      } else {
        this.currentIntention = null // No valid intention
      }

      // 4. EXECUTE: Act on the new intention.
      if (this.currentIntention) {
        this.execute(this.currentIntention)
      }
    }, config.agent.loopInterval)
  }

  /**
   * Generates a list of possible desires based on the current beliefs.
   * @returns {Desire[]}
   */
  deliberate(): Desire[] {
    const desires: Desire[] = []

    if (this.beliefSet.getCarrying()) {
      // Desire: Deliver the parcel we are carrying.
      desires.push({
        type: DesireType.DELIVER_CARRIED_PARCELS,
        parcel: this.beliefSet.getCarrying()!,
      })
    } else {
      // Desire: Go to and pick up any available parcel.
      for (const parcel of this.beliefSet.getParcels().values()) {
        if (!parcel.carriedBy) {
          desires.push({ type: DesireType.GO_TO_AND_PICKUP, parcel })
        }
      }
    }

    // If no other desires, explore.
    if (desires.length === 0) {
      desires.push({ type: DesireType.EXPLORE_RANDOMLY })
    }

    return desires
  }

  /**
   * Filters desires to select the most pressing intention.
   * @param {Desire[]} desires
   * @returns {Intention | null}
   */
  filter(desires: Desire[]): Intention | null {
    if (
      desires.length === 0 ||
      this.beliefSet.getMe().x === undefined ||
      this.beliefSet.getMe().y === undefined
    )
      return null

    // Priority: Deliver > Pickup > Explore
    const deliverDesire = desires.find(
      (d) => d.type === DesireType.DELIVER_CARRIED_PARCELS,
    )
    if (deliverDesire && this.beliefSet.getDeliveryZones().length > 0) {
      // Assume one delivery zone for now..
      // @TODO: get closest delivery zone or the one which
      // maximizes the reward considering nearby parcels and expiration times of
      // those I already picked up
      const deliveryZone = this.beliefSet.getDeliveryZones()[0]

      return new Intention(deliverDesire.type, deliveryZone)
    }

    const pickupDesires = desires.filter(
      (d) => d.type === DesireType.GO_TO_AND_PICKUP,
    )
    if (pickupDesires.length > 0) {
      // Find the closest parcel to pick up
      let closestDesire: Desire | null = null
      let minDistance = Infinity
      for (const desire of pickupDesires) {
        const distance =
          Math.abs(this.beliefSet.getMe().x! - desire.parcel!.x) +
          Math.abs(this.beliefSet.getMe().y! - desire.parcel!.y)
        if (distance < minDistance) {
          minDistance = distance
          closestDesire = desire
        }
      }
      return new Intention(closestDesire!.type, {
        x: closestDesire!.parcel!.x,
        y: closestDesire!.parcel!.y,
      })
    }

    const exploreDesire = desires.find(
      (d) => d.type === DesireType.EXPLORE_RANDOMLY,
    )
    if (exploreDesire) {
      // Pick a random tile to explore
      const { width, height, tiles } = this.beliefSet.getGrid()
      let randomGoal
      do {
        randomGoal = {
          x: Math.floor(Math.random() * width!),
          y: Math.floor(Math.random() * height!),
        }
      } while (tiles![randomGoal.y][randomGoal.x].type === TileType.Delivery)
      return new Intention(exploreDesire.type, randomGoal)
    }

    return null
  }

  /**
   * Executes the current intention.
   * @param {Intention} intention
   */
  async execute(intention: Intention) {
    if (intention.isFinished()) {
      this.currentIntention = null
      return
    }

    const me = this.beliefSet.getMe()
    const goal = intention.goal

    if (!goal) {
      intention.setFinished()
      return
    }

    // Are we at the goal?
    if (me.x === goal.x && me.y === goal.y) {
      switch (intention.desireType) {
        case DesireType.GO_TO_AND_PICKUP:
          const pickedParcelsIds = await this.actionHandler.pickup()
          const pickedParcelId = pickedParcelsIds[0].id

          const pickedParcel = await this.beliefSet.getParcel(pickedParcelId)

          if (pickedParcel) {
            this.beliefSet.setCarrying(pickedParcel)
            intention.setFinished()
          }

          break
        case DesireType.DELIVER_CARRIED_PARCELS:
          await this.actionHandler.drop()
          this.beliefSet.setCarrying(null)
          intention.setFinished()
          break
        case DesireType.EXPLORE_RANDOMLY:
          intention.setFinished() // Arrived at random spot
          break
      }
    } else {
      // Not at the goal, find a path and move.
      const path = await this.pathfinder.findPath(
        this.beliefSet.getGrid() as Grid,
        { x: me.x!, y: me.y! },
        goal,
      )
      log.debug(
        'Path to goal:',
        intention.goal,
        'from',
        { x: me.x, y: me.y },
        'is',
        path,
      )
      if (path && path.moves.length > 0) {
        const nextMove = path.moves[0]
        await this.actionHandler.move(nextMove)
      } else {
        log.warn(
          'No path to goal, or already there. Intention might be stuck.',
          {
            goal: intention.goal,
            current: { x: me.x, y: me.y },
          },
        )
        // If stuck, invalidate the intention to allow for replanning
        intention.setFinished()
      }
    }
  }
}

export default BDI_Engine
