class UI {
    constructor() {
        // ---- To-do panel elements (right side panel) ----
        this.todoList = document.getElementById("todo-list");
        this.countEl = document.getElementById("sidequests-count");
        this.spawnBtn = document.getElementById("spawn-goal-btn");

        // These get assigned from sketch.js
        // (UI doesn't start tasks by itself, it just calls the callback)
        this.onStartTask = null;
        this.onStartNext = null;

        // Used for the level-up flash animation
        this.statsPanel = document.getElementById("stats-panel");

        // ---- Modal elements ----
        this.skillModal = document.getElementById("skill-modal");
        this.skillSkipBtn = document.getElementById("skill-skip-btn");

        this.isModalOpen = false;
        this.onSkillChosen = null;

        // sketch.js uses this to unpause the game when the modal closes
        this.onSkillModalClosed = null;

        // Close modal when user clicks "Skip"
        this.skillSkipBtn.onclick = () => this.closeSkillModal();

        // ---- Skill picker canvas inside the modal ----
        this.skillCanvas = document.getElementById("skill-picker-canvas");
        this.skillCtx = this.skillCanvas.getContext("2d");
        this.skillTooltip = document.getElementById("skill-tooltip");

        // Internal state for the modal picker animation
        this._skillNodes = [];       // local copy of nodes placed on the modal canvas
        this._hoverNode = null;      // which node the mouse is currently on
        this._pickerRunning = false; // used to stop the animation loop cleanly
        this._rafId = null;          // stores requestAnimationFrame id so we can cancel it

        // Track mouse position in canvas coordinates (not CSS pixels)
        this._mouse = { x: 0, y: 0, inside: false };

        // ---- Green panel skill network (always visible) ----
        this.skillsCanvas = document.getElementById("skills-canvas");
        this.skillsCtx = this.skillsCanvas.getContext("2d");
    }

    /* ---------------------- TO-DO LIST ---------------------- */

    renderTasks(tasks) {
        // Clear the list every time we render so we don't duplicate rows
        this.todoList.innerHTML = "";

        // Show how many tasks are still not finished
        const remaining = tasks.filter(t => t.status !== "done").length;
        this.countEl.textContent = `${remaining} side quests`;

        tasks.forEach(t => {
            const row = document.createElement("div");
            row.className = "todo-item";

            const label = document.createElement("label");
            label.textContent = t.name;

            const meta = document.createElement("div");
            meta.className = "todo-meta";
            meta.textContent = `XP ${t.rewardXP} • D${t.difficulty}`;

            const btn = document.createElement("button");
            btn.style.width = "110px";
            btn.className = "task-btn";

            // Button changes depending on task state
            if (t.status === "done") {
                btn.textContent = "Done";
                btn.classList.add("task-done");
                btn.disabled = true;
            } else if (t.status === "active") {
                btn.textContent = "Active";
                btn.classList.add("task-active");
                btn.disabled = true;
            } else {
                btn.textContent = "Start";
                btn.classList.add("task-start");

                // Call the callback (sketch.js handles the real start logic)
                btn.onclick = () => this.onStartTask && this.onStartTask(t.id);
            }

            row.append(label, meta, btn);
            this.todoList.appendChild(row);
        });

        // "Start next" button (spawns the next todo task)
        this.spawnBtn.onclick = () => this.onStartNext && this.onStartNext();
    }

    updateStats(agent) {
        // XP / level info
        document.getElementById("ui-level").textContent = agent.level;
        document.getElementById("ui-xp").textContent = agent.xp;
        document.getElementById("ui-next").textContent = agent.nextLevelAt;

        // Attributes are decimals, so we format them
        document.getElementById("attr-agility").textContent =
            agent.attributes.agility.toFixed(2);

        document.getElementById("attr-navigation").textContent =
            agent.attributes.navigation.toFixed(2);

        document.getElementById("attr-focus").textContent =
            agent.attributes.focus.toFixed(2);
    }

    flashLevelUp() {
        // This trick forces the CSS animation to restart even if it was just used.
        this.statsPanel.classList.remove("flash-levelup");
        void this.statsPanel.offsetWidth; // reads layout, which "resets" the animation
        this.statsPanel.classList.add("flash-levelup");
    }

    /* ---------------------- MODAL: SKILL PICKER ---------------------- */

    openSkillModal(skillOptions) {
        // skillOptions is a list of node objects passed from sketch.js
        this.isModalOpen = true;
        this.skillModal.classList.remove("hidden");

        // Set up nodes + start the animation loop
        this._initSkillPicker(skillOptions);
        this._startSkillPicker();
    }

    closeSkillModal() {
        this.isModalOpen = false;
        this.skillModal.classList.add("hidden");

        // Stop animation and clean the picker state
        this._stopSkillPicker();
        this._skillNodes = [];
        this._hoverNode = null;
        this.skillTooltip.classList.add("hidden");

        // Tell sketch.js the modal is closed so it can unpause the game
        if (this.onSkillModalClosed) this.onSkillModalClosed();
    }

    _initSkillPicker(skillOptions) {
        const w = this.skillCanvas.width;
        const h = this.skillCanvas.height;

        // We arrange nodes in a circle so it stays readable even with many skills.
        // This layout is only for the modal. The green panel uses SkillTree positions.
        const cx = w * 0.5;
        const cy = h * 0.52;
        const r = Math.min(w, h) * 0.32;

        // Convert skillOptions into local “particles” with position + small velocity
        this._skillNodes = skillOptions.map((opt, i) => {
            // Spread angles evenly around the circle.
            // Math.max(1, ...) avoids dividing by 0 if the list is empty.
            const ang = (i / Math.max(1, skillOptions.length)) * Math.PI * 2;

            return {
                opt, // keep the original skill option attached here

                // Circle position + tiny random offset so they don't look too perfect
                x: cx + Math.cos(ang) * r + (Math.random() * 16 - 8),
                y: cy + Math.sin(ang) * r + (Math.random() * 16 - 8),

                // Slow drift so the picker feels alive
                vx: (Math.random() * 2 - 1) * 0.18,
                vy: (Math.random() * 2 - 1) * 0.18,

                // node radius for hit detection + drawing
                r: 14
            };
        });

        // Mouse mapping:
        // getBoundingClientRect() gives mouse position in CSS pixels,
        // but the canvas drawing uses real canvas pixels.
        // sx and sy convert the mouse coordinates into the correct canvas space.
        const getLocal = (evt) => {
            const rect = this.skillCanvas.getBoundingClientRect();
            const sx = this.skillCanvas.width / rect.width;
            const sy = this.skillCanvas.height / rect.height;

            return {
                x: (evt.clientX - rect.left) * sx,
                y: (evt.clientY - rect.top) * sy
            };
        };

        this.skillCanvas.onmousemove = (e) => {
            const p = getLocal(e);
            this._mouse.x = p.x;
            this._mouse.y = p.y;
            this._mouse.inside = true;
        };

        this.skillCanvas.onmouseleave = () => {
            this._mouse.inside = false;
            this._hoverNode = null;
            this.skillTooltip.classList.add("hidden");
        };

        this.skillCanvas.onclick = (e) => {
            const p = getLocal(e);
            const hit = this._pickNodeAt(p.x, p.y);
            if (!hit) return;

            // Only unlock nodes that are marked available by the SkillTree rules
            if (!hit.opt.available) return;

            if (this.onSkillChosen) this.onSkillChosen(hit.opt);
            this.closeSkillModal();
        };
    }

    _startSkillPicker() {
        // Prevent starting two animation loops
        if (this._pickerRunning) return;
        this._pickerRunning = true;

        // This is a manual draw loop using requestAnimationFrame.
        // We do this because the modal canvas is NOT a p5 canvas.
        const tick = () => {
            if (!this._pickerRunning) return;

            this._updateSkillPicker();
            this._drawSkillPicker();

            this._rafId = requestAnimationFrame(tick);
        };

        tick();
    }

    _stopSkillPicker() {
        this._pickerRunning = false;

        // Cancel the animation frame so it doesn't keep running in the background
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = null;

        // Remove event handlers so they don't stack each time the modal opens
        if (this.skillCanvas) {
            this.skillCanvas.onmousemove = null;
            this.skillCanvas.onmouseleave = null;
            this.skillCanvas.onclick = null;
        }
    }

    _updateSkillPicker() {
        const w = this.skillCanvas.width;
        const h = this.skillCanvas.height;

        // Move nodes and bounce off the canvas edges
        for (const n of this._skillNodes) {
            n.x += n.vx;
            n.y += n.vy;

            if (n.x < n.r || n.x > w - n.r) n.vx *= -1;
            if (n.y < n.r || n.y > h - n.r) n.vy *= -1;
        }

        // Figure out if we're hovering a node
        this._hoverNode = null;
        if (this._mouse.inside) {
            this._hoverNode = this._pickNodeAt(this._mouse.x, this._mouse.y);
        }

        // Update tooltip content using the hovered node info
        if (this._hoverNode) {
            const o = this._hoverNode.opt;
            this.skillTooltip.classList.remove("hidden");

            // Human-friendly status label for the tooltip
            const state = o.unlocked
                ? "Unlocked"
                : (o.available ? "Available" : "Locked");

            // Tooltip is HTML because it’s easier to style with CSS
            this.skillTooltip.innerHTML = `
        <div class="t-title">${o.title}</div>
        <div class="t-desc">${o.desc}</div>
        <div class="t-attr">Boost: +${o.amount.toFixed(2)} ${o.attr}</div>
        <div class="t-attr">State: ${state}</div>
      `;
        } else {
            this.skillTooltip.classList.add("hidden");
        }
    }

    _drawSkillPicker() {
        const ctx = this.skillCtx;
        const w = this.skillCanvas.width;
        const h = this.skillCanvas.height;

        // Used for pulsing animations (changes over time)
        const t = performance.now() / 1000;

        ctx.clearRect(0, 0, w, h);

        // Small instruction text at the top
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Click an AVAILABLE node to unlock.", 12, 10);

        // Draw prerequisite lines first, so nodes appear on top
        ctx.lineWidth = 2;

        for (const n of this._skillNodes) {
            const o = n.opt;
            if (!Array.isArray(o.req)) continue;

            for (const reqId of o.req) {
                // Find the node that this skill depends on
                const reqNode = this._skillNodes.find(nn => nn.opt.id === reqId);
                if (!reqNode) continue;

                // The line is brighter when the target node is unlocked or selectable
                const alpha = o.unlocked ? 0.35 : (o.available ? 0.22 : 0.10);
                ctx.strokeStyle = `rgba(255,255,255,${alpha})`;

                ctx.beginPath();
                ctx.moveTo(reqNode.x, reqNode.y);
                ctx.lineTo(n.x, n.y);
                ctx.stroke();
            }
        }

        // Draw nodes (particles). The look depends on the node state.
        for (const n of this._skillNodes) {
            const o = n.opt;
            const isHover = this._hoverNode === n;

            // Opacity rules:
            // - unlocked nodes are the brightest
            // - available nodes are medium, and they pulse a bit
            // - locked nodes are dim
            const baseA = o.unlocked ? 0.88 : (o.available ? 0.58 : 0.18);

            // Pulse only for available nodes so they feel clickable
            const pulse = o.available ? (Math.sin(t * 4) * 0.5 + 0.5) : 0;
            const glowR = n.r + (o.available ? 6 + pulse * 4 : 3);

            // Outer glow
            ctx.beginPath();
            ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${baseA * (isHover ? 0.28 : 0.18)})`;
            ctx.fill();

            // Core circle
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);

            // Hover makes it pop a little more without changing the whole style
            const coreA = Math.min(0.97, baseA + (isHover ? 0.18 : 0));
            ctx.fillStyle = `rgba(255,255,255,${coreA})`;
            ctx.fill();
        }
    }

    _pickNodeAt(x, y) {
        // Basic circle hit test: distance squared is cheaper than distance()
        for (const n of this._skillNodes) {
            const dx = x - n.x;
            const dy = y - n.y;
            if (dx * dx + dy * dy <= n.r * n.r) return n;
        }
        return null;
    }

    ////////////////// SKILL NETWORK ///////////////////

    renderSkillPanel(skillTree) {
        const ctx = this.skillsCtx;
        const c = this.skillsCanvas;
        const w = c.width, h = c.height;

        // Keep SkillTree’s internal width/height synced with this canvas
        // (important if the canvas size changes in CSS)
        skillTree.w = w;
        skillTree.h = h;

        ctx.clearRect(0, 0, w, h);

        // Small title text in the corner
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Skills progression", 10, 10);

        // Draw edges based on prerequisites
        ctx.lineWidth = 2;

        for (const [a, b] of skillTree.getEdges()) {
            const pa = skillTree.particles.get(a);
            const pb = skillTree.particles.get(b);
            if (!pa || !pb) continue;

            // We color the line based on the state of the "target" node (b)
            const unlockedB = skillTree.isUnlocked(b);
            const availableB = skillTree.isAvailable(b);

            ctx.strokeStyle = unlockedB
                ? "rgba(255,255,255,0.35)"
                : availableB
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.12)";

            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
        }

        // Draw skill nodes
        const tt = performance.now() / 1000;

        for (const n of skillTree.nodes) {
            const p = skillTree.particles.get(n.id);
            if (!p) continue;

            const unlocked = n.unlocked;
            const available = skillTree.isAvailable(n.id);

            // Only “available” nodes pulse, so you can tell what’s ready to unlock
            const pulse = available ? (Math.sin(tt * 4) * 0.5 + 0.5) : 0;

            // Outer glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, 14 + pulse * 4, 0, Math.PI * 2);
            ctx.fillStyle = unlocked
                ? "rgba(255,255,255,0.14)"
                : available
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(255,255,255,0.06)";
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = unlocked
                ? "rgba(255,255,255,0.85)"
                : available
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.28)";
            ctx.fill();
        }
    }
}