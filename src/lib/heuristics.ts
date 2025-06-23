import { Point } from '../types/index.js'

export const manhattanDistance = (a: Point, b: Point): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
