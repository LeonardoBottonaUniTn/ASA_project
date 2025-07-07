import { Grid, Parcel, Tour, TourStop, TourStopType } from '../types/index.js'
import Pathfinder from './Pathfinder.js'
import Logger from '../utils/Logger.js'
import {
  findClosestDeliveryZone,
  parcelDecadingIntervalMapper,
  calculateParcelThreat,
} from '../utils/utils.js'
import BeliefSet from './BeliefSet.js'
import { v4 as uuidv4 } from 'uuid'

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
    // Find the parcel with highest utility
    let bestParcel: Parcel | null = null
    let bestParcelUtility = -Infinity

    for (const parcel of this.beliefSet.getParcels().values()) {
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
        id: uuidv4(),
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

      const utility = this.calculateTourUtility(tempTour.stops)

      if (utility > bestParcelUtility) {
        bestParcelUtility = utility
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
      id: uuidv4(),
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
    let bestUtility = this.calculateTourUtility(tour.stops)
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
        id: tour.id,
        stops: newStops,
        utility: 0,
      }

      tempTour.utility = this.calculateTourUtility(tempTour.stops)

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
      id: tour.id,
      stops: updatedStops,
      utility: this.calculateTourUtility(updatedStops),
    }

    return updatedTour
  }

  /**
   * Calculates the utility value for a given tour by simulating its execution.
   *
   * The utility is computed as the total final reward (R) obtained from all parcels
   * in the tour after accounting for decay and threat factors.
   *
   * The reward calculation considers:
   * 1. Initial parcel rewards: R₀
   * 2. Time-based decay of rewards for carried parcels during travel
   * 3. Accelerated decay based on number of carried parcels (n)
   * 4. Threat level from competing agents for parcels being picked up
   *
   * The decay formula for each carried parcel p during travel time t is:
   * R(p,t) = R₀(p) - ⌈t/I⌉ * n
   * where:
   * - I is the PARCEL_DECADING_INTERVAL
   * - n is the number of carried parcels
   * - ⌈x⌉ represents the ceiling function
   * - t is the time elapsed during the current leg of travel
   *
   * For parcels being picked up, the reward is calculated as:
   * R(p) = R₀(p) - totalDecayPeriods - threatLevel
   * where totalDecayPeriods accounts for the time elapsed until pickup.
   *
   * The final utility represents the total expected reward from completing
   * the tour, optimizing for maximum reward collection while accounting
   * for time-based decay and competitive threats.
   *
   * @param stops - The list of stops in the tour
   *
   * @returns The calculated total reward utility, or -Infinity if no valid path exists
   */
  private calculateTourUtility(stops: TourStop[]): number {
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
    for (const stop of stops) {
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
          item.reward -= decayPerParcelThisLeg
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

        // Calculate the threat level for the parcel being picked up
        const threatLevel = calculateParcelThreat(
          stop.parcel,
          this.beliefSet,
          this.pathfinder,
          this.beliefSet.getGrid() as Grid,
        )

        const newParcelReward = Math.max(
          0,
          stop.parcel.reward - numDecaysForNewParcel - threatLevel,
        )

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

    return totalFinalReward /// cumulativeTime
  }

  /**
   * Attempts to improve an existing tour by adding unused parcels
   *
   * @param currentTour - The existing tour to improve
   * @param availableParcels - Array of parcels not yet in the tour
   * @returns Improved tour or null if no improvement possible
   */
  public improveTour(
    currentTour: Tour,
    availableParcels: Parcel[],
  ): Tour | null {
    if (availableParcels.length === 0) {
      return null
    }

    let bestTourSoFar = currentTour
    let remainingParcels = [...availableParcels]

    // Keep adding parcels until we can't improve the tour anymore
    while (remainingParcels.length > 0) {
      let bestUtilityForIteration = bestTourSoFar.utility
      let bestParcelIndex = -1
      let bestTourForIteration = bestTourSoFar

      // Try each remaining parcel and find the one that gives best utility
      remainingParcels.forEach((parcel, index) => {
        const improvedTour = this.insertParcel(bestTourSoFar, parcel)

        if (improvedTour.utility > bestUtilityForIteration) {
          bestUtilityForIteration = improvedTour.utility
          bestParcelIndex = index
          bestTourForIteration = improvedTour
        }
      })

      // If we found a better tour, update and remove the used parcel
      if (bestParcelIndex !== -1) {
        bestTourSoFar = bestTourForIteration
        remainingParcels.splice(bestParcelIndex, 1)
      } else {
        // No more improvements possible
        break
      }
    }

    // Return improved tour only if it's actually better
    return bestTourSoFar.utility > currentTour.utility ? bestTourSoFar : null
  }

  /**
   * Gets parcels that are not included in the given tour
   *
   * @param tour - The tour to check against
   * @param allParcels - All available parcels
   * @returns Array of parcels not in the tour
   */
  public getUnusedParcels(tour: Tour, allParcels: Parcel[]): Parcel[] {
    return allParcels.filter(
      (parcel) =>
        !tour.stops.some(
          (stop) =>
            stop.type === TourStopType.PICKUP && stop.parcel?.id === parcel.id,
        ),
    )
  }
}
