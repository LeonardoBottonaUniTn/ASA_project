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
  private intentionQueue: Intention[] = []
  private isRevising: boolean = false

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
   * The main agent loop with intention revision.
   */
  run() {
    // Start the intention revision loop
    this.intentionRevisionLoop()

    // Main BDI loop for belief updates and desire generation
    setInterval(async () => {
      // 1. SENSE: Beliefs are updated externally.
      // 2. DELIBERATE: Generate desires.
      const desires = this.deliberate()

      // 3. FILTER: Choose the best intention and add to queue
      const newIntention = this.filter(desires)

      if (newIntention) {
        await this.pushIntention(newIntention)
      }
    }, config.agent.loopInterval)
  }

  /**
   * Intention revision loop - processes intention queue using existing IntentionExecutor
   */
  private async intentionRevisionLoop() {
    while (true) {
      // Process intention queue if not empty
      if (this.intentionQueue.length > 0) {
        // Get current intention from queue
        const currentIntention = this.intentionQueue[0]

        // Check if intention is still valid
        if (!this.isIntentionValid(currentIntention)) {
          if (currentIntention.isExecuting()) {
            log.info('Stopping current intention as it is no longer valid')
            this.intentionExecutor.stopCurrentExecution()
          }

          // Remove invalid intention from queue
          this.intentionQueue.shift()
          continue
        }

        if (!currentIntention.isFinished() && !currentIntention.isExecuting()) {
          try {
            await this.intentionExecutor.executeIntention(currentIntention)
          } catch (error) {
            log.error('Error in intention execution:', error)
          }

          // Remove completed intention from queue
          if (currentIntention.isFinished()) {
            this.intentionQueue.shift()
          }
        } else {
          // Remove finished intention
          this.intentionQueue.shift()
        }
      }

      // Yield control to avoid blocking
      await new Promise((resolve) => setImmediate(resolve))
    }
  }

  /**
   * IntentionRevisionRevise strategy - revises intention queue based on utility
   */
  private async pushIntention(newIntention: Intention): Promise<void> {
    if (this.isRevising) return
    this.isRevising = true

    try {
      // Check if intention already exists in queue
      const existingIndex = this.intentionQueue.findIndex((i) =>
        this.isSameIntention(i, newIntention),
      )

      if (existingIndex !== -1) {
        if (newIntention.desireType === DesireType.PLAN_TOUR) {
          log.info('Updating tour intention with better version')
          this.intentionQueue[existingIndex] = newIntention
          this.intentionExecutor.stopCurrentExecution()
        }

        return
      }

      // Add new intention to queue
      this.intentionQueue.push(newIntention)

      // Revise queue: order by utility function (tour utility)
      this.reviseIntentionQueue()
    } finally {
      this.isRevising = false
    }
  }

  /**
   * Revises the intention queue by ordering intentions based on utility
   */
  private reviseIntentionQueue(): void {
    // Filter out invalid intentions
    this.intentionQueue = this.intentionQueue.filter((intention) =>
      this.isIntentionValid(intention),
    )

    // Sort by utility (higher utility first)
    this.intentionQueue.sort((a, b) => {
      const utilityA = this.calculateIntentionUtility(a)
      const utilityB = this.calculateIntentionUtility(b)
      return utilityB - utilityA
    })
  }

  /**
   * Calculates utility for an intention
   */
  private calculateIntentionUtility(intention: Intention): number {
    if (intention.desireType === DesireType.PLAN_TOUR && intention.tour) {
      return intention.tour.utility
    }
    return 0 // default utility for EXPLORE_RANDOMLY desire
  }

  /**
   * Checks if an intention is still valid.
   *
   * If an intention is finished or if it's a tour intention and some parcels
   * in the tour are no longer available, it is considered invalid. A parcel can
   * become unavailable if it's picked up by another agent or it simply expired.
   *
   * @param intention - The intention to check.
   * @returns True if the intention is still valid, false otherwise.
   */
  private isIntentionValid(intention: Intention): boolean {
    if (intention.isFinished()) {
      return false
    }

    if (intention.desireType === DesireType.PLAN_TOUR && intention.tour) {
      for (const stop of intention.tour.stops) {
        if (stop.type === TourStopType.PICKUP && stop.parcel) {
          const parcel = this.beliefSet.getParcel(stop.parcel.id)
          if (!parcel) {
            return false
          }
        }
      }
    }

    return true
  }

  /**
   * Checks if two intentions are the same
   */
  private isSameIntention(a: Intention, b: Intention): boolean {
    if (a.desireType !== b.desireType) {
      return false
    }

    return (
      (a.desireType === DesireType.PLAN_TOUR &&
        b.desireType === DesireType.PLAN_TOUR &&
        a.tour &&
        b.tour &&
        a.tour.id === b.tour.id) ||
      a.desireType === b.desireType // check for the EXPLORE_RANDOMLY desire
    )
  }

  /**
   * Generates a list of possible desires based on the current beliefs.
   */
  deliberate(): Desire[] {
    const desires: Desire[] = []
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

      // Check if we have a current tour intention to improve
      const currentTourIntention = this.intentionQueue.find(
        (i) => i.desireType === DesireType.PLAN_TOUR && i.tour,
      )

      if (currentTourIntention?.tour) {
        // Try to improve existing tour
        const unusedParcels = this.tourPlanner.getUnusedParcels(
          currentTourIntention.tour,
          parcels,
        )

        if (unusedParcels.length > 0) {
          tour = this.tourPlanner.improveTour(
            currentTourIntention.tour,
            unusedParcels,
          )
        }
      } else {
        // Create a new tour
        tour = this.tourPlanner.createTour()
      }

      if (tour && tour.stops.length > 0) {
        return new Intention(DesireType.PLAN_TOUR, tour)
      } else {
        return null
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
