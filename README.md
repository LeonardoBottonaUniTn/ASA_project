# ASA Project

This repository contains the source code for an agent-based system developed for
the Autonomous Software Architectures Agents (ASA) course. The project simulates
a multi-agent environment, where they plan and execute delivery tasks using
PDDL-based planning and custom logic.

## Features

- Agent-based architecture for delivery simulation
- PDDL domain and problem definitions for planning
- Custom pathfinding and planning logic
- Extensible agent, belief, intention, and communication modules

## Project Structure

```
src/
	config.ts                # Configuration settings
	DeliverooDriver.ts       # Main driver for the simulation
	lib/
		ActionHandler.ts       # Handles low-level API actions
		DeliverooDriver.ts	   # Belief-Desire-Intention loop
		BDIAgent.ts            # Agent loop
		BeliefSet.ts           # Belief set management
		Communication.ts       # Agent communication logic
		Intention.ts           # Intention management
		Pathfinder.ts          # Pathfinding logic
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
		deliveroo-js-client.d.ts # Type definitions for Deliveroo client API
		index.ts                 # Type definitions index
	utils/
		utils.ts               # Utility functions
package.json               # Project dependencies
```

## Getting Started

1. **Install dependencies:**

   ```bash
   git clone [...](https://github.com/LeonardoBottonaUniTn/ASA_project.git)
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Usage**

   Modify `src/config.ts` to adjust simulation parameters. The main entry point is `src/DeliverooDriver.ts`.
   Add tokens

4. **Run the project: single agent**

   ```bash
   npm run start:agent1
   ```

5. **Run the project: multi agent**

   ```bash
   npm run start:agent1 && npm run start:agent2
   ```

## Requirements

- Node.js (>= 14.x)
- TypeScript
