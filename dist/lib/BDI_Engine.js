// src/lib/BDI_Engine.ts
import { Desire, Intention } from './Intention.js';
import config from '../config.js';
import Logger from '../utils/Logger.js';
const log = Logger('BDI_Engine');
class BDI_Engine {
    constructor(beliefSet, pathfinder, actionHandler) {
        this.currentIntention = null;
        this.beliefSet = beliefSet;
        this.pathfinder = pathfinder;
        this.actionHandler = actionHandler;
    }
    /**
     * The main agent loop.
     */
    run() {
        setInterval(() => {
            // If there's an ongoing intention, let it finish
            if (this.currentIntention && !this.currentIntention.isFinished()) {
                this.execute(this.currentIntention);
                return;
            }
            // 1. SENSE: Beliefs are updated externally.
            // 2. DELIBERATE: Generate desires.
            const desires = this.deliberate();
            log.debug('Generated desires:', desires.map((d) => d.type));
            // 3. FILTER: Choose the best intention.
            const newIntention = this.filter(desires);
            if (newIntention) {
                this.currentIntention = newIntention;
                log.info('New intention selected:', {
                    type: this.currentIntention.desire,
                    goal: this.currentIntention.goal,
                });
            }
            else {
                this.currentIntention = null; // No valid intention
            }
            // 4. EXECUTE: Act on the new intention.
            if (this.currentIntention) {
                this.execute(this.currentIntention);
            }
        }, config.agent.loopInterval);
    }
    /**
     * Generates a list of possible desires based on the current beliefs.
     * @returns {DesireType[]}
     */
    deliberate() {
        const desires = [];
        if (this.beliefSet.carrying) {
            // Desire: Deliver the parcel we are carrying.
            desires.push({
                type: Desire.DELIVER_CARRIED_PARCEL,
                parcel: this.beliefSet.carrying,
            });
        }
        else {
            // Desire: Go to and pick up any available parcel.
            for (const parcel of this.beliefSet.parcels.values()) {
                if (!parcel.carriedBy) {
                    desires.push({ type: Desire.GO_TO_AND_PICKUP, parcel });
                }
            }
        }
        // If no other desires, explore.
        if (desires.length === 0) {
            desires.push({ type: Desire.EXPLORE_RANDOMLY });
        }
        return desires;
    }
    /**
     * Filters desires to select the most pressing intention.
     * @param {DesireType[]} desires
     * @returns {Intention | null}
     */
    filter(desires) {
        if (desires.length === 0 ||
            this.beliefSet.me.x === undefined ||
            this.beliefSet.me.y === undefined)
            return null;
        // Priority: Deliver > Pickup > Explore
        const deliverDesire = desires.find((d) => d.type === Desire.DELIVER_CARRIED_PARCEL);
        if (deliverDesire && this.beliefSet.deliveryZones.length > 0) {
            const deliveryZone = this.beliefSet.deliveryZones[0]; // Assume one for now
            return new Intention(deliverDesire.type, deliveryZone);
        }
        const pickupDesires = desires.filter((d) => d.type === Desire.GO_TO_AND_PICKUP);
        if (pickupDesires.length > 0) {
            // Find the closest parcel to pick up
            let closestDesire = null;
            let minDistance = Infinity;
            for (const desire of pickupDesires) {
                const distance = Math.abs(this.beliefSet.me.x - desire.parcel.x) +
                    Math.abs(this.beliefSet.me.y - desire.parcel.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestDesire = desire;
                }
            }
            return new Intention(closestDesire.type, {
                x: closestDesire.parcel.x,
                y: closestDesire.parcel.y,
            });
        }
        const exploreDesire = desires.find((d) => d.type === Desire.EXPLORE_RANDOMLY);
        if (exploreDesire) {
            // Pick a random tile to explore
            const { width, height, tiles } = this.beliefSet.grid;
            let randomGoal;
            do {
                randomGoal = {
                    x: Math.floor(Math.random() * width),
                    y: Math.floor(Math.random() * height),
                };
            } while (tiles[randomGoal.y][randomGoal.x].delivery);
            return new Intention(exploreDesire.type, randomGoal);
        }
        return null;
    }
    /**
     * Executes the current intention.
     * @param {Intention} intention
     */
    async execute(intention) {
        if (intention.isFinished()) {
            this.currentIntention = null;
            return;
        }
        const { me } = this.beliefSet;
        const goal = intention.goal;
        if (!goal) {
            intention.setFinished();
            return;
        }
        // Are we at the goal?
        if (me.x === goal.x && me.y === goal.y) {
            switch (intention.desire) {
                case Desire.GO_TO_AND_PICKUP:
                    await this.actionHandler.pickup();
                    intention.setFinished();
                    break;
                case Desire.DELIVER_CARRIED_PARCEL:
                    await this.actionHandler.drop();
                    intention.setFinished();
                    break;
                case Desire.EXPLORE_RANDOMLY:
                    intention.setFinished(); // Arrived at random spot
                    break;
            }
        }
        else {
            // Not at the goal, find a path and move.
            const path = this.pathfinder.findPath(this.beliefSet.grid, // Should be a full grid by now
            { x: me.x, y: me.y }, goal);
            if (path && path.length > 0) {
                const nextMove = path[0];
                await this.actionHandler.move(nextMove);
            }
            else {
                log.warn('No path to goal, or already there. Intention might be stuck.', {
                    goal: intention.goal,
                    current: { x: me.x, y: me.y },
                });
                // If stuck, invalidate the intention to allow for replanning
                intention.setFinished();
            }
        }
    }
}
export default BDI_Engine;
