import Logger from '../utils/Logger.js'
import { Agent, DesireType, Grid, TourStopType } from '../types/index.js'
import { Intention } from './Intention.js'
import BeliefSet from './BeliefSet.js'
import Pathfinder from './Pathfinder.js'
import ActionHandler from './ActionHandler.js'
import { getRandomWalkableTile } from '../utils/utils.js'
import { TourPlanner } from './TourPlanner.js'

const log = Logger('IntentionExecutor')

export class IntentionExecutor {
  private beliefSet: BeliefSet
  private pathfinder: Pathfinder
  private actionHandler: ActionHandler
  private tourPlanner: TourPlanner
  private currentlyExecuting: Intention | null = null
  private isExecuting: boolean = false

  constructor(
    beliefSet: BeliefSet,
    pathfinder: Pathfinder,
    actionHandler: ActionHandler,
    tourPlanner: TourPlanner,
  ) {
    this.beliefSet = beliefSet
    this.pathfinder = pathfinder
    this.actionHandler = actionHandler
    this.tourPlanner = tourPlanner
  }

  /**
   * Executes an intention if no other intention is currently executing
   */
  async executeIntention(intention: Intention): Promise<void> {
    // Only allow one intention to execute at a time
    if (this.isExecuting) {
      log.debug('Another intention is already executing, skipping')
      return
    }

    if (intention.isFinished()) {
      return
    }

    const amIMoving = this.beliefSet.isAgentMoving(
      this.beliefSet.getMe() as Agent,
    )

    if (amIMoving) {
      return
    }

    // Mark as executing
    this.isExecuting = true
    this.currentlyExecuting = intention
    intention.setExecuting(true)

    try {
      if (intention.desireType === DesireType.PLAN_TOUR) {
        await this.executeTourIntention(intention)
      } else if (intention.desireType === DesireType.EXPLORE_RANDOMLY) {
        await this.executeExploreIntention(intention)
      }

      if (!intention.isFinished()) {
        intention.setFinished()
      }
    } catch (error) {
      log.error('Error executing intention:', error)
      intention.setFinished() // Mark as finished to avoid retries
    } finally {
      intention.setExecuting(false)
      this.isExecuting = false
      this.currentlyExecuting = null
    }
  }

  /**
   * Executes a tour-based intention
   */
  private async executeTourIntention(intention: Intention): Promise<void> {
    for (const stop of intention.tour?.stops || []) {
      // Check if the intention was marked as finished (by a better intention)
      if (intention.isFinished()) {
        return
      }

      const path = this.pathfinder.findPath(
        this.beliefSet.getGrid() as Grid,
        {
          x: Math.round(this.beliefSet.getMe().x!),
          y: Math.round(this.beliefSet.getMe().y!),
        },
        stop.position,
      )

      for (const move of path?.moves || []) {
        // Check again before each move
        if (intention.isFinished()) {
          return
        }
        await this.actionHandler.move(move)
      }

      // Check before any action
      if (intention.isFinished()) {
        return
      }

      switch (stop.type) {
        case TourStopType.PICKUP:
          const parcel = stop.parcel
          const pickupResult = await this.actionHandler.pickup()

          if (parcel && pickupResult && pickupResult.length > 0) {
            // Update carrying state in BeliefSet
            this.beliefSet.addCarryingParcel(parcel)

            // Remove completed pickup from tour
            if (stop.parcel) {
              intention.tour = this.tourPlanner.removeCompletedPickup(
                intention.tour!,
                stop.parcel.id,
              )
            }
          }
          break

        case TourStopType.DELIVERY:
          const deliveryResult = await this.actionHandler.drop()
          if (deliveryResult && deliveryResult.length > 0) {
            this.beliefSet.clearCarryingParcels()
          }
          intention.setFinished() // Terminate intention after delivery
          return
      }
    }
  }

  /**
   * Executes an exploration intention
   */
  private async executeExploreIntention(intention: Intention): Promise<void> {
    const randomTile = getRandomWalkableTile(this.beliefSet.getGrid() as Grid)

    const path = this.pathfinder.findPath(
      this.beliefSet.getGrid() as Grid,
      {
        x: Math.round(this.beliefSet.getMe().x!),
        y: Math.round(this.beliefSet.getMe().y!),
      },
      randomTile,
    )

    for (const move of path?.moves || []) {
      if (intention.isFinished()) {
        return
      }
      await this.actionHandler.move(move)
    }
  }

  /**
   * Checks if any intention is currently being executed
   */
  isBusy(): boolean {
    return this.isExecuting
  }

  /**
   * Stops execution of the current intention
   */
  stopCurrentExecution(): void {
    if (this.currentlyExecuting) {
      this.currentlyExecuting.setFinished()
    }
  }
}
