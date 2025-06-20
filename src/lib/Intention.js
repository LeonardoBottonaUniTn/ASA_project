// src/lib/Intention.js

const Logger = require('../utils/Logger');
const log = Logger('Intention');

/**
 * Enum for desire types.
 * @readonly
 * @enum {string}
 */
const Desire = {
    GO_TO_AND_PICKUP: 'GO_TO_AND_PICKUP',
    DELIVER_CARRIED_PARCEL: 'DELIVER_CARRIED_PARCEL',
    EXPLORE_RANDOMLY: 'EXPLORE_RANDOMLY',
};

class Intention {
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
            log.info(`Intention finished: ${this.desire.type}`);
        }
    }
}

module.exports = { Desire, Intention };