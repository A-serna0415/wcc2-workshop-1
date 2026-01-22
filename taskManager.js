/* TaskManager:
   - Reads tasks from tasks.json
   - Keeps track of each task’s status (todo / active / done)
   - Gives the agent XP when a task is completed
*/

class TaskManager {
    constructor(agent, tasksData) {
        this.agent = agent;

        // tasksData can come in as an array OR an object (depending on how the JSON is structured)
        // This makes it safe either way.
        let source = [];
        if (Array.isArray(tasksData)) {
            source = tasksData;
        } else if (tasksData && typeof tasksData === "object") {
            source = Object.values(tasksData);
        }

        // Copy tasks into our own format so we control what fields exist
        this.tasks = source.map(t => ({
            id: t.id,
            name: t.name,
            rewardXP: t.rewardXP,
            difficulty: t.difficulty,

            status: "todo",     // todo → active → done
            levelsGained: 0     // filled when the task is completed
        }));

        this.activeTaskId = null;
    }

    // Used by the UI to render the to-do list
    getTasks() {
        return this.tasks;
    }

    // Returns the task that’s currently running (or undefined if none)
    getActiveTask() {
        return this.tasks.find(t => t.id === this.activeTaskId);
    }

    // (Optional helper) “overall difficulty” based on how many tasks are left
    // Not the same as task.difficulty — this is more like project pressure level.
    getDifficulty(extra = 0) {
        const remaining = this.tasks.filter(t => t.status !== "done").length;
        return remaining + extra;
    }

    startTask(id) {
        // Only one active task at a time.
        // Reset any non-done task back to "todo" so we don’t end up with 2 actives.
        this.tasks.forEach(t => {
            if (t.status !== "done") t.status = "todo";
        });

        const task = this.tasks.find(t => t.id === id);
        if (!task) return null;

        task.status = "active";
        this.activeTaskId = id;
        return task;
    }

    completeActiveTask() {
        const task = this.getActiveTask();
        if (!task) return null;

        task.status = "done";

        // XP reward:
        // rewardXP is the base value from JSON, then we add a small bonus for harder tasks.
        // This helps the agent level up at a nicer pace without changing the JSON too much.
        const bonus = task.difficulty * 2; // feel free to tune this number later
        const earnedXP = task.rewardXP + bonus;

        // addXP() returns how many levels were gained from this reward
        const levelsGained = this.agent.addXP(earnedXP);
        task.levelsGained = levelsGained;

        // Optional: store what we actually gave (handy for debugging / stats later)
        task._earnedXP = earnedXP;

        // Clear active task slot so the game goes back to “idle mode”
        this.activeTaskId = null;
        return task;
    }
}