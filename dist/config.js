"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/config.ts
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({
    path: path_1.default.resolve(process.cwd(), '.env'),
});
const config = {
    // Connection details for the Deliveroo simulation environment
    api: {
        host: process.env.API_HOST || 'http://localhost:8080',
        token: process.env.CLIENT_TOKEN,
    },
    // Agent-specific settings
    agent: {
        name: 'BDI-Agent-007',
        // The interval (in milliseconds) for the BDI engine's main loop
        loopInterval: 500,
        // The interval (in milliseconds) for logging the agent's belief state
        logInterval: 10000,
    },
    // Pathfinder settings
    pathfinder: {
        // 'bfs' or 'astar' (once implemented)
        algorithm: 'bfs',
    },
    // Debugging and logging
    logging: {
        level: 'info', // e.g., 'debug', 'info', 'warn', 'error'
    },
};
exports.default = config;
