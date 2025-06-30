import { Intention } from './Intention.js'
import config from '../config.js'
import Logger from '../utils/Logger.js'
import { DesireType, Grid, Tour, TourStopType } from '../types/index.js'
import BeliefSet from './BeliefSet.js'
import Pathfinder from './Pathfinder.js'
import ActionHandler from './ActionHandler.js'
import { Desire } from '../types/index.js'
import { TourPlanner } from './TourPlanner.js'

const log = Logger('BDI_Engine')

class BDI_Engine {
  private beliefSet: BeliefSet
  private pathfinder: Pathfinder
  private actionHandler: ActionHandler
  private tourPlanner: TourPlanner
  private currentIntention: Intention | null = null

  constructor(
    beliefSet: BeliefSet,
    pathfinder: Pathfinder,
    actionHandler: ActionHandler,
  ) {
    this.beliefSet = beliefSet
    this.pathfinder = pathfinder
    this.actionHandler = actionHandler
    this.tourPlanner = new TourPlanner(pathfinder, beliefSet)
  }

  /**
   * The main agent loop.
   */
  run() {
    setInterval(async () => {
      // If there's an ongoing intention and it's an EXPLORE intention,
      // check for new parcels and stop exploring if any are found
      if (
        this.currentIntention &&
        !this.currentIntention.isFinished() &&
        this.currentIntention.desireType === DesireType.EXPLORE_RANDOMLY &&
        this.beliefSet.getParcels().size > 0
      ) {
        log.info(
          'New parcels detected during exploration, stopping exploration',
        )
        this.currentIntention.setFinished()
      }

      // 1. SENSE: Beliefs are updated externally.

      // 2. DELIBERATE: Generate desires.
      const desires = this.deliberate()

      // 3. FILTER: Choose the best intention.
      const newIntention = await this.filter(desires)

      // If there's an ongoing intention, check if we should switch
      if (this.currentIntention && !this.currentIntention.isFinished()) {
        if (newIntention && newIntention.isBetterThan(this.currentIntention)) {
          log.info('Switching intention for a better one.')
          this.currentIntention.setFinished() // Stop the current execution
          this.currentIntention.setExecuting(false) // Reset executing state
          this.currentIntention = newIntention
        }
      } else if (newIntention) {
        this.currentIntention = newIntention
      }

      if (this.currentIntention && !this.currentIntention.isFinished()) {
        if (!this.currentIntention.isExecuting()) {
          this.execute(this.currentIntention)
        }
      } else {
        this.currentIntention = null // No valid intention
      }
    }, config.agent.loopInterval)
  }

  /**
   * Generates a list of possible desires based on the current beliefs.
   * @returns {Desire[]}
   */
  deliberate(): Desire[] {
    const desires: Desire[] = []

    // Desire to plan a tour if there are parcels available
    if (this.beliefSet.getParcels().size > 0) {
      desires.push({ type: DesireType.PLAN_TOUR })
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
   * @returns {Promise<Intention | null>}
   */
  async filter(desires: Desire[]): Promise<Intention | null> {
    if (
      desires.length === 0 ||
      this.beliefSet.getMe().x === undefined ||
      this.beliefSet.getMe().y === undefined
    ) {
      return null
    }

    const planTourDesire = desires.find((d) => d.type === DesireType.PLAN_TOUR)

    if (planTourDesire) {
      const parcels = Array.from(this.beliefSet.getParcels().values())
      let tour: Tour | null = null

      // If we have a current tour, try to improve it
      if (this.currentIntention?.tour) {
        const unusedParcels = parcels.filter(
          // Avoid considering parcels already in the tour
          (parcel) =>
            !this.currentIntention!.tour!.stops.some(
              (stop) =>
                stop.type === TourStopType.PICKUP &&
                stop.parcel?.id === parcel.id,
            ),
        )

        if (unusedParcels.length > 0) {
          let bestImprovedTour = this.currentIntention.tour

          // Try inserting each unused parcel and keep track of the best tour
          for (const parcel of unusedParcels) {
            const improvedTour = await this.tourPlanner.insertParcel(
              this.currentIntention.tour,
              parcel,
            )

            if (improvedTour.utility > bestImprovedTour.utility) {
              bestImprovedTour = improvedTour
            }
          }

          // If we found a better tour, use it
          if (bestImprovedTour.utility > this.currentIntention.tour.utility) {
            tour = bestImprovedTour
          }
        }
      } else {
        // Create a new tour
        tour = await this.tourPlanner.createTour()
      }

      if (tour && tour.stops.length > 0) {
        return new Intention(DesireType.PLAN_TOUR, tour)
      }
    }

    const exploreDesire = desires.find(
      (d) => d.type === DesireType.EXPLORE_RANDOMLY,
    )

    if (exploreDesire) {
      return new Intention(exploreDesire.type, null)
    }

    return null
  }

  async execute(intention: Intention) {
    if (intention.isFinished()) {
      return
    }

    intention.setExecuting(true)
    log.info(`Executing intention: ${intention.desireType}`)

    try {
      for (const stop of intention.tour?.stops || []) {
        // Check if the intention was marked as finished (by a better intention)...
        if (intention.isFinished()) {
          log.info('Stopping execution as a better intention was found')
          return
        }

        const path = await this.pathfinder.findPath(
          this.beliefSet.getGrid() as Grid,
          {
            x: Math.round(this.beliefSet.getMe().x!),
            y: Math.round(this.beliefSet.getMe().y!),
          },
          stop.position,
        )

        for (const move of path?.moves || []) {
          // ... check again before each move
          if (intention.isFinished()) {
            log.info('Stopping execution as a better intention was found')
            return
          }
          await this.actionHandler.move(move)
        }

        // ... and before any action
        if (intention.isFinished()) {
          log.info('Stopping execution as a better intention was found')
          return
        }

        switch (stop.type) {
          case 'PICKUP':
            await this.actionHandler.pickup()
            break
          case 'DELIVERY':
            await this.actionHandler.drop()
            break
        }
      }
      intention.setFinished()
    } catch (error) {
      log.error('Error executing intention:', error)
      intention.setFinished() // Mark as finished to avoid retries
    } finally {
      intention.setExecuting(false)
    }
  }
}

export default BDI_Engine
