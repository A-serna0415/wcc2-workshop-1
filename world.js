/* World: everything on the left “game screen”
   It holds the goal and the obstacle list, and it rebuilds them based on side-quest difficulty.
*/

class World {
    constructor(w, h) {
        this.width = w;
        this.height = h;

        this.goal = null;      // { position: p5.Vector, radius: number }
        this.obstacles = [];   // array of { x, y, w, h }
    }

    /* ---------------- GOAL SPAWN ----------------
       Goal spawns near the top so the agent has to travel upward.
       Main rule: never place the goal inside (or too close to) an obstacle.
    */
    spawnGoalForTask(task) {
        // Only 1..3 matter here (difficulty 0 means “no task”, but we still clamp safely)
        const d = constrain(task.difficulty, 1, 3);

        // Harder tasks spawn the goal a bit higher (less free space)
        const yMax =
            d === 1 ? this.height * 0.28 :
                d === 2 ? this.height * 0.24 :
                    this.height * 0.22;

        const radius = 15;

        // Try a bunch of random spots. If we can’t find a clean one, we fall back.
        let tries = 40;
        while (tries-- > 0) {
            const x = random(40, this.width - 40);
            const y = random(40, yMax);

            // margin = 10 gives a little breathing room around obstacles
            if (!this._circleHitsAnyObstacle(x, y, radius, this.obstacles, 10)) {
                this.goal = {
                    position: createVector(x, y),
                    radius
                };
                return;
            }
        }

        // Fallback spot (rare, but avoids “no goal spawned” bugs)
        this.goal = {
            position: createVector(this.width / 2, 60),
            radius
        };
    }

    clearGoal() {
        this.goal = null;
    }

    /* ---------------- OBSTACLE GENERATION ----------------
       Difficulty mapping:
         0 → just edge walls (so the agent can’t abuse borders)
         1 → 3 interior obstacles
         2 → 6 interior obstacles
         3 → 8 interior obstacles
    */
    rebuildObstacles(difficulty) {
        this.obstacles = [];

        const d = constrain(difficulty, 0, 3);

        // Edge walls stop the “screen border cheat”
        // Without these, the agent can hug the edge and avoid most obstacles.
        const wallT = 15; // wall thickness
        this.obstacles.push(
            { x: 0, y: 0, w: this.width, h: wallT },                   // top
            { x: 0, y: this.height - wallT, w: this.width, h: wallT }, // bottom
            { x: 0, y: 0, w: wallT, h: this.height },                  // left
            { x: this.width - wallT, y: 0, w: wallT, h: this.height }  // right
        );

        // Difficulty 0 = only the walls (no interior obstacles)
        if (d === 0) return;

        const targetCount = d === 1 ? 3 : d === 2 ? 6 : 8;

        // Keep interior obstacles out of:
        // - the top zone (goal area)
        // - the bottom zone (spawn area)
        const topY = this.height * 0.30;
        const bottomY = this.height * 0.84;

        // Obstacle size scales with difficulty (bigger blocks = harder navigation)
        const minW = d === 1 ? 140 : d === 2 ? 170 : 200;
        const maxW = d === 1 ? 260 : d === 2 ? 310 : 360;

        const minH = d === 1 ? 16 : d === 2 ? 18 : 22;
        const maxH = d === 1 ? 20 : d === 2 ? 24 : 28;

        // Padding keeps obstacles from stacking on top of each other
        // (also helps avoid weird “impossible corridors”)
        const padding = 18;

        // Safety cap so this doesn’t get stuck in a loop on small screens
        const maxTries = 400;

        let tries = 0;

        // We already have 4 edge walls, so total obstacles = 4 + interior count
        const totalWanted = 4 + targetCount;

        while (this.obstacles.length < totalWanted && tries++ < maxTries) {
            const w = random(minW, maxW);
            const h = random(minH, maxH);

            // Keep interior obstacles away from the edge walls
            const x = random(wallT + 10, this.width - wallT - w - 10);
            const y = random(topY, bottomY);

            const candidate = { x, y, w, h };

            // Don’t overlap any existing obstacle (including edge walls)
            if (this._rectHitsAnyObstacle(candidate, this.obstacles, padding)) continue;

            // Easy mode: avoid giant blocks that almost cut the map in half
            if (d === 1 && w > this.width * 0.72) continue;

            this.obstacles.push(candidate);
        }
    }

    /* ---------------- DRAW ---------------- */

    draw() {
        // Draw obstacles
        for (const o of this.obstacles) {
            noStroke();
            fill(153, 0, 76);
            rect(o.x, o.y, o.w, o.h);
        }

        // Draw goal (if there is one)
        if (this.goal) {
            noStroke();
            fill(255, 255, 51);
            circle(this.goal.position.x, this.goal.position.y, this.goal.radius * 2);
        }
    }

    /* ---------------- HELPERS ----------------
       These are just collision checks used during spawning.
       They keep goals and obstacles from being placed on top of each other.
    */

    _rectHitsAnyObstacle(rect, obstacles, pad = 0) {
        for (const o of obstacles) {
            if (this._rectRectOverlap(rect, o, pad)) return true;
        }
        return false;
    }

    _rectRectOverlap(a, b, pad = 0) {
        // Expand both rectangles by `pad` to create extra spacing
        const ax1 = a.x - pad, ay1 = a.y - pad;
        const ax2 = a.x + a.w + pad, ay2 = a.y + a.h + pad;

        const bx1 = b.x - pad, by1 = b.y - pad;
        const bx2 = b.x + b.w + pad, by2 = b.y + b.h + pad;

        return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
    }

    _circleHitsAnyObstacle(cx, cy, cr, obstacles, margin = 0) {
        // Same idea as goal spawn: “circle vs every rect”
        for (const o of obstacles) {
            if (this._circleRectHit(cx, cy, cr + margin, o)) return true;
        }
        return false;
    }

    _circleRectHit(cx, cy, cr, rect) {
        // Closest point on the rectangle to the circle center
        const closestX = constrain(cx, rect.x, rect.x + rect.w);
        const closestY = constrain(cy, rect.y, rect.y + rect.h);

        const dx = cx - closestX;
        const dy = cy - closestY;

        // If closest point is inside the circle radius, it's a hit
        return dx * dx + dy * dy < cr * cr;
    }
}