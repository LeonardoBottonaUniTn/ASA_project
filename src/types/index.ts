export interface Agent {
  id: string
  name: string
  x: number
  y: number
  score: number
}

export interface Parcel {
  id: string
  x: number
  y: number
  reward: number
  carriedBy?: string
}

export enum TileType {
  NonWalkable = 0,
  Walkable = 1,
  Delivery = 2,
}

export interface Tile {
  type: TileType
}

export interface Grid {
  width: number
  height: number
  tiles: Tile[][]
}

export interface Point {
  x: number
  y: number
}

/**
 * Enum for desire types.
 * @readonly
 * @enum {string}
 */
export enum DesireType {
  EXPLORE_RANDOMLY = 'EXPLORE_RANDOMLY',
  PLAN_TOUR = 'PLAN_TOUR',
}

export interface Desire {
  type: DesireType
}

export enum TourStopType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

export interface TourStop {
  type: TourStopType
  parcel?: Parcel
  position: Point
}

export interface Tour {
  stops: TourStop[]
  utility: number
}

export enum Move {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

export interface Path {
  moves: (Move | Point)[]
  cost: number
}

export interface Heuristic {
  (a: Point, b: Point): number
}

export interface GameConfig {
  MAP_FILE: string
  PARCELS_GENERATION_INTERVAL: string
  PARCELS_MAX: number | 'infinite'
  MOVEMENT_STEPS: number
  MOVEMENT_DURATION: number
  AGENTS_OBSERVATION_DISTANCE: number
  PARCELS_OBSERVATION_DISTANCE: number
  AGENT_TIMEOUT: number
  PARCEL_REWARD_AVG: number
  PARCEL_REWARD_VARIANCE: number
  PARCEL_DECADING_INTERVAL: string
  RANDOMLY_MOVING_AGENTS: number
  AGENT_SPEED: string
  CLOCK: number
}

export const logLevels = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof logLevels)[number]
