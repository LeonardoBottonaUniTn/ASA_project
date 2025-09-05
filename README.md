# Autonomous Software Agent Project
<p align="center">
    <img src="https://i.postimg.cc/nr6vLb7v/temp-Imageb-RTH7u.avif" alt="drawing" width="500"/>
</p>
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![PDDL](https://img.shields.io/badge/PDDL-Planning-blue.svg)](https://planning.wiki/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.0%2B-blue.svg)](https://www.typescriptlang.org/)

> **Authors:** Leonardo Bottona, Gabriele Masciulli
> **Course:** Autonomous Software Agents  
> **Institution:** University of Trento  
> **Academic Year:** 2024-2025

---

This repository contains the source code for an agent-based system developed for
the Autonomous Software Agents (ASA) course. The project simulates
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
	Report.pdf               # Project report
	Presentation.pdf         # Project presentation
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

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Usage**

   Modify `src/config.ts` to adjust simulation parameters. The main entry point is `src/DeliverooDriver.ts`.

3. **Run the project: single agent**

   Set the token in the config file as `CLIENT_TOKEN_1`

   ```bash
   npm run start:agent1
   ```

4. **Run the project: multi agent**

   Set the token in the config file as `CLIENT_TOKEN_1`, open a terminal window
   and run:

   ```bash
   npm run start:agent1
   ```

   Then, set the token in the config file as `CLIENT_TOKEN_2`
   and run:

   ```bash
   npm run start:agent2
   ```

- Node.js (>= 14.x)
- TypeScript
