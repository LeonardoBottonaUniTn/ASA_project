"use strict";
// src/lib/ActionHandler.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = __importDefault(require("../utils/Logger"));
const log = (0, Logger_1.default)('ActionHandler');
class ActionHandler {
    constructor(api) {
        this.api = api;
    }
    /**
     * Executes a move action.
     * @param {string} direction - 'up', 'down', 'left', or 'right'.
     * @returns {Promise<void>}
     */
    async move(direction) {
        log.info(`Executing move: ${direction}`);
        return this.api.emitMove(direction);
    }
    /**
     * Executes a pickup action.
     * @returns {Promise<void>}
     */
    async pickup() {
        log.info('Executing pickup action.');
        return this.api.emitPickup();
    }
    /**
     * Executes a drop/delivery action.
     * @returns {Promise<void>}
     */
    async drop() {
        log.info('Executing drop action.');
        return this.api.emitPutdown(); // Assuming drop is putdown
    }
}
exports.default = ActionHandler;
