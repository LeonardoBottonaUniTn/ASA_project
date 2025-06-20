"use strict";
// src/utils/Logger.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const currentLevel = levels[config_1.default.logging.level] || levels.info;
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
exports.default = (context) => new Logger(context);
