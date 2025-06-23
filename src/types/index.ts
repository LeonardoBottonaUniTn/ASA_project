export interface Agent {
  id: string
  name: string
  x: number
  y: number
  score: number
  parcelId?: string
}

export interface Parcel {
  id: string
  x: number
  y: number
  reward: number
  carriedBy: string | null
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
  GO_TO_AND_PICKUP = 'GO_TO_AND_PICKUP',
  DELIVER_CARRIED_PARCELS = 'DELIVER_CARRIED_PARCELS',
  EXPLORE_RANDOMLY = 'EXPLORE_RANDOMLY',
}

export interface Desire {
  type: DesireType
  parcel?: Parcel
}
