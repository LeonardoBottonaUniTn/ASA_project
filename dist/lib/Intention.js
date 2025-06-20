// src/lib/Intention.ts
import Logger from '../utils/Logger.js';
const log = Logger('Intention');
/**
 * Enum for desire types.
 * @readonly
 * @enum {string}
 */
export var Desire;
(function (Desire) {
    Desire["GO_TO_AND_PICKUP"] = "GO_TO_AND_PICKUP";
    Desire["DELIVER_CARRIED_PARCEL"] = "DELIVER_CARRIED_PARCEL";
    Desire["EXPLORE_RANDOMLY"] = "EXPLORE_RANDOMLY";
})(Desire || (Desire = {}));
export class Intention {
    /**
     * @param {Desire} desire - The underlying desire.
     * @param {object} goal - The target coordinates {x, y}.
     */
    constructor(desire, goal) {
        this.desire = desire;
        this.goal = goal;
        this.finished = false;
    }
    /**
     * Checks if the intention has been completed.
     * @returns {boolean}
     */
    isFinished() {
        return this.finished;
    }
    /**
     * Marks the intention as completed.
     */
    setFinished() {
        if (!this.finished) {
            this.finished = true;
            log.info(`Intention finished: ${this.desire}`);
        }
    }
}
