// src/lib/ActionHandler.ts
import Logger from '../utils/Logger.js';
const log = Logger('ActionHandler');
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
export default ActionHandler;
