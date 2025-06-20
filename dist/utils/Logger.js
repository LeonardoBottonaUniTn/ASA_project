// src/utils/Logger.ts
import config from '../config.js';
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const currentLevel = levels[config.logging.level] || levels.info;
/**
 * A simple logger utility.
 */
class Logger {
    constructor(context) {
        this.context = context;
    }
    _log(level, message, ...args) {
        if (levels[level] >= currentLevel) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level.toUpperCase()}] [${this.context}]`, message, ...args);
        }
    }
    debug(message, ...args) {
        this._log('debug', message, ...args);
    }
    info(message, ...args) {
        this._log('info', message, ...args);
    }
    warn(message, ...args) {
        this._log('warn', message, ...args);
    }
    error(message, ...args) {
        this._log('error', message, ...args);
    }
}
export default (context) => new Logger(context);
