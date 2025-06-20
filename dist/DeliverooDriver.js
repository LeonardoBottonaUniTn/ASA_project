"use strict";
// Main entry point for the Deliveroo BDI Agent
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const Logger_1 = __importDefault(require("./utils/Logger"));
const deliveroo_js_client_1 = require("@unitn-asa/deliveroo-js-client");
const BeliefSet_1 = __importDefault(require("./lib/BeliefSet"));
const Pathfinder_1 = __importDefault(require("./lib/Pathfinder"));
const BDI_Engine_1 = __importDefault(require("./lib/BDI_Engine"));
const ActionHandler_1 = __importDefault(require("./lib/ActionHandler"));
const log = (0, Logger_1.default)('DeliverooDriver');
async function main() {
    log.info(`Deliveroo BDI Agent [${config_1.default.agent.name}] starting...`);
    // 1. Initialize connection
    const client = new deliveroo_js_client_1.DeliverooApi(config_1.default.api.host, config_1.default.api.token);
    log.info('Connecting to Deliveroo API...');
    // 2. Instantiate core components
    const beliefSet = new BeliefSet_1.default();
    const pathfinder = new Pathfinder_1.default();
    const actionHandler = new ActionHandler_1.default(client);
    const bdiEngine = new BDI_Engine_1.default(beliefSet, pathfinder, actionHandler);
    // 3. Register socket event listeners
    log.info('Registering event listeners...');
    client.onYou((data) => beliefSet.updateFromYou(data));
    client.onMap((width, height, tiles) => beliefSet.updateFromMap({ width, height, tiles }));
    client.onParcelsSensing((parcels) => beliefSet.updateFromParcels(parcels));
    client.onAgentsSensing((agents) => beliefSet.updateFromAgents(agents));
    client.onConnect(() => log.info('Successfully connected and registered to the environment.'));
    client.onDisconnect(() => log.info('Disconnected from the environment.'));
    // 4. Kick off the main BDI loop
    log.info('Starting BDI engine...');
    bdiEngine.run();
    log.info('Agent is running and ready.');
}
main().catch((error) => {
    log.error('An unhandled error occurred:', error);
    process.exit(1);
});
