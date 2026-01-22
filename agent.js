class Agent {
  constructor(x, y, size) {
    this.position = createVector(x, y); // Agent's position
    this.velocity = p5.Vector.random2D(); // Agent's movement

    // Base values: these never change. Attributes scale them up/down.
    this.baseSpeed = 2.2;
    this.baseSteering = 0.30;
    this.baseFocusRadius = 150;

    // Attributes are the “stats” the skills will boost
    this.attributes = {
      agility: 1,     // Speed and movement around obstacles
      navigation: 1,  // Obstacles avoiding
      focus: 1        // How far away the agent starts caring about the goal
    };

    // XP and level stuff
    this.level = 1;
    this.xp = 0;
    this.nextLevelAt = 10;

    // Visual size and collision size
    this.size = size;
    this.radius = size * 0.5;

    // Where the agent comes back to when starting a new task
    this.spawnPos = createVector(x, y);

    // HUD stats for the player (these reset every task)
    // The idea is to be able to monitoring the improvement of the agent with every iteration
    this.metrics = {
      taskStartFrame: 0,
      framesAlive: 0,  // basically “time in task” but in frames
      collisions: 0
    };

    this.resetMetrics();
  }

  //////////////// METRICS CONTROL ///////////////

  resetMetrics() {
    // Snapshot the frame when the task starts
    this.metrics.taskStartFrame = frameCount;
    this.metrics.framesAlive = 0;
    this.metrics.collisions = 0;
  }

  ////////////// RESPAWN METHOD /////////////////

  respawn() {
    // Put the agent back to spawn and give it a small random movement
    this.position = this.spawnPos.copy();
    this.velocity = p5.Vector.random2D().mult(0.5);

    // New task = fresh stats
    this.resetMetrics();
  }

  /////////////// ATTRIBUTES METHODS ////////////////////

  get maxSpeed() {
    return this.baseSpeed * this.attributes.agility;
  }

  get steeringStrength() {
    return this.baseSteering * this.attributes.agility;
  }

  get focusRadius() {
    return this.baseFocusRadius * this.attributes.focus;
  }

  /////////////// PROGRESSION [EVOLUTION] ///////////////

  addXP(amount) {
    this.xp += amount;

    let levelsGained = 0;

    // If you earn a lot of XP at once, you can level-up multiple times
    while (this.xp >= this.nextLevelAt) {
      this.xp -= this.nextLevelAt;
      this.level++;
      levelsGained++;

      // Make the next level harder each time
      // (The player chooses skills manually)
      this.nextLevelAt = Math.floor(this.nextLevelAt * 1.25 + 5);
    }

    return levelsGained;
  }

  ////////////////////// MOVEMENT //////////////////

  seek(target) {
    const d = p5.Vector.dist(this.position, target);

    // Focus = when the agent actually starts chasing the goal.
    // If it's too far, the agent just wanders instead of beelining across the map.
    if (d > this.focusRadius) {
      this.wander();
      return;
    }

    // Desired velocity points straight to the goal
    const desired = p5.Vector.sub(target, this.position);
    desired.setMag(this.maxSpeed);

    // Smooth turning: blend current velocity toward desired velocity
    // steeringStrength controls how “snappy” the turn feels
    this.velocity = p5.Vector.lerp(this.velocity, desired, this.steeringStrength);
  }

  // sketch.js calls navigate(), so this is a safe wrapper.
  // For now it's basically “seek the goal” and let update() handle collisions.
  navigate(target, obstacles) {
    this.seek(target);
  }

  wander() {
    // Small random push each frame to make it look alive
    const wanderForce = p5.Vector.random2D().mult(0.05);
    this.velocity.add(wanderForce);

    // Wandering is slower than chasing a goal
    this.velocity.limit(this.maxSpeed * 0.6);
  }

  update(obstacles) {
    // Used for HUD timing (drawMetricsHUD)
    this.metrics.framesAlive++;

    let collidedThisFrame = false;

    // Axis-separated collision:
    // Move on X first, fix collision if needed, then move on Y.
    // This makes "sliding" along walls easier than doing full 2D collision response.

    ///// X axis
    this.position.x += this.velocity.x;

    if (this.hitAnyObstacle(obstacles)) {
      // Undo the move
      this.position.x -= this.velocity.x;

      // Bounce a tiny bit and keep some motion depending on navigation stat.
      // Higher navigation = better “gliding” instead of sticking hard.
      this.velocity.x *= -0.1 * this.attributes.navigation;

      collidedThisFrame = true;
    }

    ///// Y axis
    this.position.y += this.velocity.y;

    if (this.hitAnyObstacle(obstacles)) {
      this.position.y -= this.velocity.y;
      this.velocity.y *= -0.1 * this.attributes.navigation;

      collidedThisFrame = true;
    }

    // Count collisions once per frame (even if both axes hit)
    if (collidedThisFrame) {
      this.metrics.collisions++;
    }

    // Keep the agent inside the canvas
    this.position.x = constrain(this.position.x, this.radius, width - this.radius);
    this.position.y = constrain(this.position.y, this.radius, height - this.radius);
  }

  hitAnyObstacle(obstacles) {
    // Return true as soon as we hit one obstacle
    for (const obs of obstacles) {
      if (this.circleRectHit(obs)) return true;
    }
    return false;
  }

  isAt(target, threshold) {
    // Used to check "goal reached"
    return p5.Vector.dist(this.position, target) <= threshold;
  }

  ////////// DRAW THE AGENT //////////////////////////

  display() {
    push();
    translate(this.position.x, this.position.y);
    noStroke();
    fill(225);
    circle(0, 0, this.size);
    pop();
  }

  // Circle vs rectangle collision:
  // Find the closest point on the rectangle to the circle center,
  // then check if that point is inside the circle radius.
  circleRectHit(obs) {
    const closestX = constrain(this.position.x, obs.x, obs.x + obs.w);
    const closestY = constrain(this.position.y, obs.y, obs.y + obs.h);

    const dx = this.position.x - closestX;
    const dy = this.position.y - closestY;

    return dx * dx + dy * dy < this.radius * this.radius;
  }
}