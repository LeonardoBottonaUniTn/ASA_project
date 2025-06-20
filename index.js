// Main entry point for the Deliveroo BDI Agent

const config = require('./src/config')
const Logger = require('./src/utils/Logger')
const { DeliverooApi } = require('@unitn-asa/deliveroo-js-client')
const BeliefSet = require('./src/lib/BeliefSet')
const Pathfinder = require('./src/lib/Pathfinder')
const BDI_Engine = require('./src/lib/BDI_Engine')
const ActionHandler = require('./src/lib/ActionHandler')

const log = Logger('DeliverooDriver')

async function main() {
  log.info(`Deliveroo BDI Agent [${config.agent.name}] starting...`)

  // 1. Initialize connection
  const client = new DeliverooApi(config.api.host, config.api.token)
  log.info('Connecting to Deliveroo API...')

  // 2. Instantiate core components
  const beliefSet = new BeliefSet()
  const pathfinder = new Pathfinder()
  const actionHandler = new ActionHandler(client)
  const bdiEngine = new BDI_Engine(beliefSet, pathfinder, actionHandler)

  // 3. Register socket event listeners
  log.info('Registering event listeners...')
  client.onYou((data) => beliefSet.updateFromYou(data))
  client.onMap((width, height, tiles) =>
    beliefSet.updateFromMap({ width, height, tiles }),
  )
  client.onParcelsSensing((parcels) => beliefSet.updateFromParcels(parcels))
  client.onAgentsSensing((agents) => beliefSet.updateFromAgents(agents))
  client.onConnect(() =>
    log.info('Successfully connected and registered to the environment.'),
  )
  client.onDisconnect(() => log.info('Disconnected from the environment.'))

  // 4. Kick off the main BDI loop
  log.info('Starting BDI engine...')
  bdiEngine.run()

  log.info('Agent is running and ready.')
}

main().catch((error) => {
  log.error('An unhandled error occurred:', error)
  process.exit(1)
})
