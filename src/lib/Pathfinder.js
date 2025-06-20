// src/lib/Pathfinder.js

class Pathfinder {
    /**
     * Finds a path from start to goal using Breadth-First Search.
     * @param {object} grid - The map grid from BeliefSet.
     * @param {{x: number, y: number}} start - The starting coordinates.
     * @param {{x: number, y: number}} goal - The goal coordinates.
     * @returns {Array<string>} A sequence of moves ('up', 'down', 'left', 'right').
     */
    findPath(grid, start, goal) {
        if (!grid.tiles || !start || !goal) {
            return null; // Not enough info
        }

        const { width, height, tiles } = grid;
        const queue = [{ ...start, path: [] }];
        const visited = new Set([`${start.x},${start.y}`]);

        const directions = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
        };

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.x === goal.x && current.y === goal.y) {
                return current.path; // Path found
            }

            for (const [move, dir] of Object.entries(directions)) {
                const nextX = current.x + dir.x;
                const nextY = current.y + dir.y;
                const nextKey = `${nextX},${nextY}`;

                // Check bounds and if visited
                if (
                    nextX >= 0 && nextX < width &&
                    nextY >= 0 && nextY < height &&
                    !visited.has(nextKey) &&
                    !tiles[nextY][nextX].impassable // Check for obstacles
                ) {
                    visited.add(nextKey);
                    const newPath = [...current.path, move];
                    queue.push({ x: nextX, y: nextY, path: newPath });
                }
            }
        }

        return null; // No path found
    }
}

module.exports = Pathfinder;