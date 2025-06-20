"use strict";
// src/lib/Intention.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Intention = exports.Desire = void 0;
const Logger_1 = __importDefault(require("../utils/Logger"));
const log = (0, Logger_1.default)('Intention');
/**
 * Enum for desire types.
 * @readonly
 * @enum {string}
 */
var Desire;
(function (Desire) {
    Desire["GO_TO_AND_PICKUP"] = "GO_TO_AND_PICKUP";
    Desire["DELIVER_CARRIED_PARCEL"] = "DELIVER_CARRIED_PARCEL";
    Desire["EXPLORE_RANDOMLY"] = "EXPLORE_RANDOMLY";
})(Desire || (exports.Desire = Desire = {}));
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
            log.info(`Intention finished: ${this.desire}`);
        }
    }
}
exports.Intention = Intention;
