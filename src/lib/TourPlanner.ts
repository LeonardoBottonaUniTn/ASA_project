import { Grid, Parcel, Tour, TourStopType } from '../types/index.js'
import Pathfinder from './Pathfinder.js'
import Logger from '../utils/Logger.js'
import {
  findClosestDeliveryZone,
  parcelDecadingIntervalMapper,
  calculateParcelThreat,
  assessParcelCompetition,
} from '../utils/utils.js'
import BeliefSet from './BeliefSet.js'

const log = Logger('TourPlanner')

export class TourPlanner {
  private pathfinder: Pathfinder
  private beliefSet: BeliefSet

  constructor(pathfinder: Pathfinder, beliefSet: BeliefSet) {
    this.pathfinder = pathfinder
    this.beliefSet = beliefSet
  }

  /**
   * Creates a tour with the highest utility by considering the best
   * parcel in the current belief set and adding a delivery stop.
   *
   * @returns tour with highest utility including delivery stop
   */
  public createTour(): Tour | null {
    // Find the parcel with highest utility considering competitive factors
    let bestParcel: Parcel | null = null
    let bestParcelUtility = -Infinity

    for (const parcel of this.beliefSet.getParcels().values()) {
      // Assess competitive landscape for this parcel
      const competition = assessParcelCompetition(
        parcel,
        this.beliefSet,
        this.pathfinder,
        this.beliefSet.getGrid() as Grid,
      )

      // Skip parcels where we have a significant competitive disadvantage
      if (!competition.shouldPursue && competition.relativeAdvantage < -2) {
        log.debug(
          `Skipping parcel ${parcel.id} due to competitive disadvantage: ${competition.relativeAdvantage}`,
        )
        continue
      }

      // Create a temporary tour with just this parcel to calculate its utility
      const deliveryZones = this.beliefSet.getDeliveryZones()
      if (deliveryZones.length === 0) continue

      const closestDeliveryZone = findClosestDeliveryZone(
        { x: parcel.x, y: parcel.y },
        deliveryZones,
        this.beliefSet.getGrid() as Grid,
        this.pathfinder,
      )

      const tempTour: Tour = {
        stops: [
          {
            type: TourStopType.PICKUP,
            parcel: parcel,
            position: { x: parcel.x, y: parcel.y },
          },
          {
            type: TourStopType.DELIVERY,
            position: closestDeliveryZone,
          },
        ],
        utility: 0,
      }

      const utility = this.calculateTourUtility(tempTour)

      // Apply competitive adjustment to utility
      const competitiveUtility =
        utility * (1 + competition.competitiveScore * 0.1)

      if (competitiveUtility > bestParcelUtility) {
        bestParcelUtility = competitiveUtility
        bestParcel = parcel
      }
    }

    if (!bestParcel) return null

    // Find closest delivery zone to the chosen parcel
    const deliveryZones = this.beliefSet.getDeliveryZones()
    const closestDeliveryZone = findClosestDeliveryZone(
      { x: bestParcel.x, y: bestParcel.y },
      deliveryZones,
      this.beliefSet.getGrid() as Grid,
      this.pathfinder,
    )

    // Create tour with pickup and delivery stops
    const bestTour: Tour = {
      stops: [
        {
          type: TourStopType.PICKUP,
          parcel: bestParcel,
          position: { x: bestParcel.x, y: bestParcel.y },
        },
        {
          type: TourStopType.DELIVERY,
          position: closestDeliveryZone,
        },
      ],
      utility: bestParcelUtility,
    }

    return bestTour
  }

  public insertParcel(tour: Tour, parcel: Parcel): Tour {
    let bestTour: Tour = tour
    let bestUtility = this.calculateTourUtility(tour)
    let bestInsertionIndex = -1

    const lastPickupIndex = tour.stops.length - 1

    // Try inserting pickup at each position up to and including after the last pickup
    for (let i = 0; i <= lastPickupIndex + 1; i += 1) {
      const newStops = [...tour.stops]
      newStops.splice(i, 0, {
        type: TourStopType.PICKUP,
        parcel: parcel,
        position: { x: parcel.x, y: parcel.y },
      })

      // If inserting at the end of pickups, update delivery stop to be closest to new parcel
      if (i === lastPickupIndex + 1) {
        const closestDeliveryZone = findClosestDeliveryZone(
          { x: parcel.x, y: parcel.y },
          this.beliefSet.getDeliveryZones(),
          this.beliefSet.getGrid() as Grid,
          this.pathfinder,
        )

        // Update delivery stop position (always last stop in the tour)
        newStops[newStops.length - 1].position = closestDeliveryZone
      }

      const tempTour: Tour = {
        stops: newStops,
        utility: 0,
      }

      tempTour.utility = this.calculateTourUtility(tempTour)

      if (tempTour.utility > bestUtility) {
        bestTour = tempTour
        bestUtility = tempTour.utility
        bestInsertionIndex = i
      }
    }

    return bestTour
  }

  /**
   * Removes a completed pickup stop from the tour
   *
   * @param tour - The tour to modify
   * @param parcelId - The ID of the parcel that was picked up
   * @returns The updated tour with the pickup stop removed
   */
  public removeCompletedPickup(tour: Tour, parcelId: string): Tour {
    const updatedStops = tour.stops.filter(
      (stop) =>
        !(stop.type === TourStopType.PICKUP && stop.parcel?.id === parcelId),
    )

    const updatedTour: Tour = {
      stops: updatedStops,
      utility: this.calculateTourUtility({ stops: updatedStops, utility: 0 }),
    }

    return updatedTour
  }

  /**
   * Calculates the utility value for a given tour by simulating its execution.
   *
   * The utility U is computed as: U = R/T where
   * R = total final reward
   * T = total time
   *
   * The reward calculation considers:
   * 1. Initial parcel rewards: R₀
   * 2. Time-based decay of rewards for carried parcels
   * 3. Accelerated decay based on number of carried parcels (n)
   *
   * The decay formula for each parcel p at time t is:
   * R(p,t) = R₀(p) - ⌈t/I⌉ * n
   * where:
   * - I is the PARCEL_DECADING_INTERVAL
   * - n is the number of carried parcels
   * - ⌈x⌉ represents the ceiling function
   * - t is the time elapsed since the parcel was picked up
   *
   * The final utility represents reward per unit time, optimizing for
   * both high rewards and efficient delivery times.
   *
   * @param tour - The tour to evaluate
   *
   *
   * @returns The calculated utility value, or -Infinity if no valid path exists
   */
  private calculateTourUtility(tour: Tour): number {
    // Initialization
    let cumulativeTime = 0
    let lastPosition = {
      x: Math.round(this.beliefSet.getMe().x!),
      y: Math.round(this.beliefSet.getMe().y!),
    }

    // Deep copy of currently carried parcels to avoid modifying real beliefs
    const simulatedInventory: Array<{ parcel: Parcel; reward: number }> =
      this.beliefSet.getCarryingParcels().map((parcel) => ({
        parcel: parcel,
        reward: parcel.reward, // Start with current reward
      }))

    // Get decay configuration
    const decayInterval =
      parcelDecadingIntervalMapper[
        this.beliefSet.getConfig().PARCEL_DECADING_INTERVAL!
      ]
    const movementDuration = this.beliefSet.getConfig().MOVEMENT_DURATION!

    // Simulate each stop in the tour
    for (const stop of tour.stops) {
      // Get path to this stop
      const path = this.pathfinder.findPath(
        this.beliefSet.getGrid() as Grid,
        lastPosition,
        stop.position,
      )

      if (!path) return -Infinity

      const timeForLeg = path.moves.length * movementDuration

      // Apply accelerated decay to currently carried parcels
      if (simulatedInventory.length > 0 && timeForLeg > 0) {
        const numParcelsCarried = simulatedInventory.length
        const numDecaysInLeg = Math.ceil(timeForLeg / decayInterval)
        const decayPerParcelThisLeg = numDecaysInLeg * numParcelsCarried

        // Apply decay to each parcel in inventory
        for (const item of simulatedInventory) {
          //calculate the threat level for the parcel
          const threatLevel = calculateParcelThreat(
            item.parcel,
            this.beliefSet,
            this.pathfinder,
            this.beliefSet.getGrid() as Grid,
          )
          /* log.info(
            `Threat level for parcel ${item.parcel.id}: ${threatLevel} on total reward ${item.reward}`,
          ) */
          item.reward -= decayPerParcelThisLeg + threatLevel // Apply decay and threat level
          if (item.reward < 0) {
            item.reward = 0 // Ensure reward doesn't go negative
          }
        }
      }

      // Travel to the stop
      cumulativeTime += timeForLeg
      lastPosition = stop.position

      // Handle the stop action
      if (stop.type === TourStopType.PICKUP && stop.parcel) {
        // Pick up the parcel
        const numDecaysForNewParcel = Math.ceil(cumulativeTime / decayInterval)
        const newParcelReward = stop.parcel.reward - numDecaysForNewParcel

        // Add to simulated inventory
        simulatedInventory.push({
          parcel: stop.parcel,
          reward: newParcelReward,
        })
      } else if (stop.type === TourStopType.DELIVERY) {
        // Delivery stop - clear inventory and calculate final rewards
        break
      }
    }

    // Calculate final utility
    const totalFinalReward = simulatedInventory
      .map((item) => Math.max(0, item.reward))
      .reduce((sum, reward) => sum + reward, 0)

    if (cumulativeTime === 0) return 0

    return totalFinalReward / cumulativeTime
  }
}
