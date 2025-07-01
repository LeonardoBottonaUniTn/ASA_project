import { Intention } from './Intention.js'
import config from '../config.js'
import Logger from '../utils/Logger.js'
import { DesireType, Tour, TourStopType } from '../types/index.js'
import BeliefSet from './BeliefSet.js'
import Pathfinder from './Pathfinder.js'
import ActionHandler from './ActionHandler.js'
import { Desire } from '../types/index.js'
import { TourPlanner } from './TourPlanner.js'
import { IntentionExecutor } from './IntentionExecutor.js'

const log = Logger('BDI_Engine')

class BDI_Engine {
  private beliefSet: BeliefSet
  private tourPlanner: TourPlanner
  private intentionExecutor: IntentionExecutor
  private currentIntention: Intention | null = null

  constructor(
    beliefSet: BeliefSet,
    pathfinder: Pathfinder,
    actionHandler: ActionHandler,
  ) {
    this.beliefSet = beliefSet
    this.tourPlanner = new TourPlanner(pathfinder, beliefSet)
    this.intentionExecutor = new IntentionExecutor(
      beliefSet,
      pathfinder,
      actionHandler,
      this.tourPlanner,
    )
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
        this.intentionExecutor.stopCurrentExecution()
      }

      // 1. SENSE: Beliefs are updated externally.
      // 2. DELIBERATE: Generate desires.
      const desires = this.deliberate()

      // 3. FILTER: Choose the best intention.
      const newIntention = this.filter(desires)

      // If there's an ongoing intention, check if we should switch
      if (this.currentIntention && !this.currentIntention.isFinished()) {
        if (newIntention && newIntention.isBetterThan(this.currentIntention)) {
          this.intentionExecutor.stopCurrentExecution()
          this.currentIntention = newIntention
        }
      } else if (newIntention) {
        this.currentIntention = newIntention
      }

      // Execute the current intention if executor is not busy
      if (this.currentIntention && !this.currentIntention.isFinished()) {
        if (!this.intentionExecutor.isBusy()) {
          // Execute asynchronously without blocking the main loop
          this.intentionExecutor
            .executeIntention(this.currentIntention)
            .catch((error) => {
              log.error('Error in intention execution:', error)
            })
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

    // Consider both visible and outdated parcels, but prioritize visible ones
    const parcels = this.beliefSet.getParcels()

    if (parcels.size > 0) {
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
   */
  filter(desires: Desire[]): Intention | null {
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
            const improvedTour = this.tourPlanner.insertParcel(
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
          } else {
            return null // Return null if no better tour was found
          }
        }
      } else {
        // Create a new tour
        tour = this.tourPlanner.createTour()
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
}

export default BDI_Engine
