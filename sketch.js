/* 
Final Project WWC1: To_Do_List_RPG

By: Andres Serna
Last update: January 8 2026

Blurb: 

Every day errands, tasks or reminders become side quests 
to develop and evolve a virtual agent. When the user complete
one of these side quests the agent grows bigger, faster and stronger
capable to fullfil more complex tasks. Every time the agent levels-up
the user can unlock one skill [every day skills, like cooking an omelette or wash clothes]
that helps the agent to evolve and be more productive with its "life".

References:

- The fundamentals for this code project is the Daniel Shiffsman's exercises
about Genetic Algorthms in: https://natureofcode.com/genetic-algorithms/.
- Also "The Coding Train" YouTube channel about "Coding Challenge #29: Smart Rockets in p5.js"
  by Daniel Shiffman as well: https://www.youtube.com/watch?v=bGz7mv2vD6g&t=2672s.
and the activities about virtual pets and autonomuos agents in WCC lab sessions
- Some DOM and CSS basics from: https://www.w3schools.com.
- A few specific blocks of code and debugging for this project were made with ChatGPT tool asistance, 
  which I will properly acknowledge in the academic document included with this project.
*/


let canvas; // Variable to store the main canvas, "sketch-container"
let agent, world, tasks, ui, skillTree; // Variable to store data from classes

let TASKS_DATA;  // tasks.json (to-do list content + difficulty)
let SKILLS_DATA; // skills.json (skill network + attribute boosts)

let gamePaused = false; // used when the level-up modal is open

// Load JSON before setup() runs
function preload() {
  TASKS_DATA = loadJSON("data/tasks.json");
  SKILLS_DATA = loadJSON("data/skills.json");
}

function setup() {
  // GUI is a fixed width on the right, so the canvas uses the rest
  const guiW = 500;
  canvas = createCanvas(windowWidth - guiW, windowHeight);
  canvas.parent("sketch-container");

  // Create the agent and world first (world needs width/height)
  agent = new Agent(width / 2, height - 60, 22);
  world = new World(width, height);

  // Managers: tasks drive gameplay, skills drive upgrades
  tasks = new TaskManager(agent, TASKS_DATA);
  skillTree = new SkillTree(SKILLS_DATA, 320, 220); // (x,y) = where the skill panel draws

  ui = new UI();

  // Called by the UI when the user starts a specific task
  ui.onStartTask = (id) => {
    const task = tasks.startTask(id);
    if (!task) return; // task id not found / not allowed to start

    // Reset the run and build the world for this task
    agent.respawn(); // also clears run metrics (time, collisions, etc.)
    world.rebuildObstacles(task.difficulty);

    // Put the goal somewhere in the world (based on the task rules)
    world.spawnGoalForTask(task);

    // Refresh UI so it matches the new state
    ui.renderTasks(tasks.getTasks());
    ui.updateStats(agent);
  };

  // “Start next” just picks the first task that is still todo
  ui.onStartNext = () => {
    const next = tasks.getTasks().find(t => t.status === "todo");
    if (!next) return;
    ui.onStartTask(next.id);
  };

  // First render of the UI (nothing started yet)
  ui.renderTasks(tasks.getTasks());
  ui.updateStats(agent);

  // No task active at the start → keep the world simple
  world.rebuildObstacles(0);
}

function draw() {
  background(0, 85);

  // Draw the world first (obstacles + goal)
  world.draw();

  // We pause movement when the level-up modal is on screen
  if (!gamePaused) {
    // If there is a goal, navigate to it. If not, just wander around.
    if (world.goal) {
      agent.navigate(world.goal.position, world.obstacles);
    } else {
      agent.wander();
    }

    // Apply movement + collisions
    agent.update(world.obstacles);

    // Check if the agent reached the goal
    if (world.goal && agent.isAt(world.goal.position, world.goal.radius + agent.radius)) {
      const completed = tasks.completeActiveTask(); // marks task done + returns reward info

      // Clear the goal and reset the agent's world (no task running)
      world.clearGoal();
      world.rebuildObstacles(0);

      // Update UI right away so it feels responsive
      ui.renderTasks(tasks.getTasks());
      ui.updateStats(agent);

      // If the task gave at least one level, open the skill picker
      if (completed && completed.levelsGained > 0) {
        ui.flashLevelUp?.(); // optional UI effect (safe call)

        gamePaused = true; // freeze gameplay while choosing a skill
        ui.onSkillModalClosed = () => { gamePaused = false; };

        // Build the list of skill options for the modal
        // (we send UI a plain object list, not the whole SkillTree)
        const options = skillTree.nodes.map(n => ({
          id: n.id,
          title: n.name,
          desc: "Unlock a real-life skill to improve your attributes",
          req: n.req,
          attr: n.attr,
          amount: n.amount,
          unlocked: skillTree.isUnlocked(n.id),
          available: skillTree.isAvailable(n.id)
        }));

        // If nothing is available, don’t trap the game in pause mode
        const anyAvailable = options.some(o => o.available);
        if (!anyAvailable) {
          gamePaused = false;
          return;
        }

        // Runs when the user picks a skill in the modal
        ui.onSkillChosen = (choice) => {
          // Apply the attribute boost to the agent
          if (agent.attributes && agent.attributes[choice.attr] != null) {
            agent.attributes[choice.attr] += choice.amount;
          }

          // Mark the skill as unlocked in the skill tree
          skillTree.unlock(choice.id);

          // Update UI and resume the game
          ui.updateStats(agent);
          gamePaused = false;
        };

        // Open modal (optional chaining in case the UI version changes)
        ui.openSkillModal?.(options);
      }
    }
  }

  // Draw the agent last so it sits on top of the world
  agent.display();

  // Quick HUD overlay inside the world view (only when task is active)
  drawMetricsHUD();

  // Skill network panel (green UI side panel)
  skillTree.update();
  ui.renderSkillPanel?.(skillTree);
}

function drawMetricsHUD() {
  const task = tasks.getActiveTask?.() || null;

  // Only show the HUD while a task is running
  if (!task) return;

  // framesAlive is counted in Agent.update(), so convert it to seconds here
  const secs = agent.metrics.framesAlive / 60;

  // If goal exists, show distance to it (helps debug navigation)
  const dist = world.goal ? p5.Vector.dist(agent.position, world.goal.position) : 0;

  push();
  noStroke();

  // Background box
  fill(0, 0);
  rect(12, 12, 240, 104, 12);

  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);

  text(`Task: ${task.name}`, 22, 22);
  text(`Difficulty: ${task.difficulty}`, 22, 40);
  text(`Time: ${secs.toFixed(1)}s`, 22, 58);
  text(`Collisions: ${agent.metrics.collisions}`, 22, 76);
  text(`Distance to goal: ${dist.toFixed(0)}`, 22, 94);

  pop();
}

function keyPressed() {
  // Simple fullscreen toggle
  if (key === "f" || key === "F") {
    let fs = fullscreen();
    fullscreen(!fs);
  }
}

function windowResized() {
  // Keep the same layout rule when the window changes size
  const guiW = 500;
  resizeCanvas(windowWidth - guiW, windowHeight);

  // Let the world know the new boundaries
  world.width = width;
  world.height = height;

  // Rebuild obstacles so they fit the new canvas size
  // If a task is active, keep its difficulty. If not, keep it empty.
  const active = tasks.getActiveTask?.();
  world.rebuildObstacles(active ? active.difficulty : 0);
}