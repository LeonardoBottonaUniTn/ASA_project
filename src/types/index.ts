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

// Extended Parcel interface to include outdated status
export interface ExtendedParcel extends Parcel {
  outdated?: boolean
  lastSeenTimestamp?: number
  lastSeenReward?: number
}

export enum TileType {
  NonWalkable = 0,
  ParcelGenerator = 1,
  Delivery = 2,
  Walkable = 3,
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
  DELIVER = 'DELIVER',
  PICKUP = 'PICKUP',
  EXPLORATION = 'EXPLORATION',
  GO_TO = 'GO_TO',
}

export interface Predicate {
  type: DesireType
  destination: Point
  parcel_id?: string // parcel_id is only defined for pickup desires
  utility: number
}

export enum Move {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

export interface Path {
  moves: Move[]
  cost: number
}

export enum MessageType {
  SYNC = 'sync',
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  SENSED_PARCELS = 'sensed_parcels',
  SENSED_AGENTS = 'sensed_agents',
  // todo
}

export interface MessageContent {
  // todo
}

export interface Message {
  type: MessageType
  content: MessageContent
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
