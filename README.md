# ASA Project

This repository contains the source code for an agent-based system developed for the Advanced Software Architectures (ASA) course. The project simulates a Deliveroo-like environment, where agents plan and execute delivery tasks using PDDL-based planning and custom logic.

## Features

- Agent-based architecture for delivery simulation
- PDDL domain and problem definitions for planning
- Modular TypeScript codebase
- Custom pathfinding and planning logic
- Extensible agent, belief, intention, and communication modules

## Project Structure

```
src/
	config.ts                # Configuration settings
	DeliverooDriver.ts       # Main driver for the simulation
	lib/
		ActionHandler.ts       # Handles agent actions
		BDIAgent.ts            # Belief-Desire-Intention agent implementation
		BeliefSet.ts           # Belief set management
		Communication.ts       # Agent communication logic
		Intention.ts           # Intention management
		Pathfinder.ts          # Pathfinding algorithms
		pddl/
			domain.pddl          # PDDL domain definition
			problem.pddl         # PDDL problem instance
			problem.ts           # PDDL problem generator
		plans/
			DeliverPlan.ts       # Delivery plan logic
			GoToPlan.ts          # Go-to-location plan
			GoToPlanPddl.ts      # PDDL-based go-to plan
			PickUpPlan.ts        # Pick-up plan logic
			Plan.ts              # Base plan class
	types/
		deliveroo-js-client.d.ts # Type definitions for Deliveroo client
		index.ts                 # Type definitions index
	utils/
		utils.ts               # Utility functions
package.json               # Project metadata and dependencies
tsconfig.json              # TypeScript configuration
README.md                  # Project documentation
```

## Getting Started

1. **Install dependencies:**

   ```
   git clone ...
   ```
2. **Install dependencies**

   ```
   npm install
   ```
3. **Run the project:**

   ```bash
   npm start
   ```
4. **Build the project:**

   ```bash
   npm run build
   ```

## Requirements

- Node.js (>= 14.x)
- TypeScript

## Usage

Modify `src/config.ts` to adjust simulation parameters. The main entry point is `src/DeliverooDriver.ts`.

## Planning

PDDL files are located in `src/lib/pddl/`.
