class SkillTree {
    constructor(skillsData, canvasW = 400, canvasH = 400) {
        this.w = canvasW;
        this.h = canvasH;

        // skillsData should look like:
        // { nodes: [ { id, name, req: [], attr, amount }, ... ] }
        //
        // This line is defensive:
        // - If skillsData is missing, or skillsData.nodes is not an array,
        //   rawNodes becomes an empty list instead of crashing the sketch.
        const rawNodes =
            skillsData && Array.isArray(skillsData.nodes) ? skillsData.nodes : [];

        // We copy the JSON into our own objects because we need runtime state.
        // Example: "unlocked" changes while the game runs, but we never want to
        // write that back into the JSON file.
        this.nodes = rawNodes.map(n => ({
            id: n.id,
            name: n.name,

            // req must always be an array so later code can safely loop and call .every()
            req: Array.isArray(n.req) ? n.req : [],

            // If attr is missing, default to "focus" so the skill still works
            attr: n.attr || "focus",

            // amount should be a number (how much we boost the attribute)
            // If it’s missing or wrong, use a small default boost.
            amount: typeof n.amount === "number" ? n.amount : 0.25,

            unlocked: false
        }));

        // Hand-picked positions for some known skills so the map feels consistent.
        // Any skill not listed here will still work, it just gets a random spot.
        const layout = {
            cooking: { x: 80, y: 120 },
            breakfast: { x: 160, y: 70 },
            omelette: { x: 240, y: 60 },
            cereal: { x: 240, y: 105 },

            lunch: { x: 160, y: 170 },
            pasta: { x: 240, y: 175 },
            soup: { x: 240, y: 215 },
            chicken_rice: { x: 320, y: 195 },

            planning: { x: 80, y: 40 },
            budgeting: { x: 160, y: 35 },
            saving: { x: 240, y: 30 },

            exercise: { x: 80, y: 220 },
            workout: { x: 160, y: 240 },
            running: { x: 240, y: 250 }
        };

        // Each skill node gets a "particle" object that moves around.
        // Map is used here because we want fast lookup by id:
        // particles.get("cooking") gives us the particle for that node.
        this.particles = new Map();

        for (const n of this.nodes) {
            // If this node is in the layout list, use that fixed position.
            // If not, pick a random position inside the skill panel.
            const p = layout[n.id] || {
                x: Math.random() * this.w,
                y: Math.random() * this.h
            };

            // vx and vy start as small random velocities.
            // (Math.random() * 2 - 1) gives a number between -1 and 1.
            // Then we scale it down so the motion is slow and calm.
            this.particles.set(n.id, {
                x: p.x,
                y: p.y,
                vx: (Math.random() * 2 - 1) * 0.30,
                vy: (Math.random() * 2 - 1) * 0.30
            });
        }
    }

    // Build the list of connections for drawing the network.
    // If a node requires "planning", we add an edge planning → that node.
    getEdges() {
        const edges = [];

        for (const n of this.nodes) {
            for (const r of n.req) {
                edges.push([r, n.id]);
            }
        }

        return edges;
    }

    getNode(id) {
        // .find returns the first match, or undefined if it doesn’t exist
        return this.nodes.find(n => n.id === id);
    }

    isUnlocked(id) {
        const n = this.getNode(id);

        // The !! makes sure we return true/false.
        // If n is missing, n?.unlocked becomes undefined, and !!undefined becomes false.
        return !!n?.unlocked;
    }

    // A skill becomes selectable only when:
    // - it is not unlocked yet
    // - every prerequisite in req[] is already unlocked
    isAvailable(id) {
        const n = this.getNode(id);
        if (!n) return false;
        if (n.unlocked) return false;

        // .every(...) returns true only if the callback returns true for all items.
        // So this means: "all required skills must already be unlocked".
        return n.req.every(reqId => this.isUnlocked(reqId));
    }

    // Kept for older UI code that expects this function name.
    // It simply returns the list of skills that can be picked right now.
    getAvailableSkills() {
        return this.nodes.filter(n => this.isAvailable(n.id));
    }

    unlock(id) {
        const n = this.getNode(id);
        if (!n) return false;
        if (n.unlocked) return false;

        // This prevents unlocking something early (skipping prerequisites)
        if (!this.isAvailable(id)) return false;

        n.unlocked = true;
        return true;
    }

    update() {
        // Small movement so the network feels alive.
        // We update every particle a tiny bit each frame.
        for (const p of this.particles.values()) {
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off the edges of the skill panel (with a small margin)
            const margin = 16;

            if (p.x < margin || p.x > this.w - margin) p.vx *= -1;
            if (p.y < margin || p.y > this.h - margin) p.vy *= -1;
        }
    }
}