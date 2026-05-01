class GameEngine {
    constructor() {
        this.map = new PacMap();
        this.pacman = new PacMan(13 * TILE_SIZE, 23 * TILE_SIZE);
        this.ghosts = [];
        this.ghostMultiplier = 200;
        this.ghostsEatenInCycle = 0;
        this.powerPelletTimer = null;
        this.modeTimer = null;
        this.intelligenceTimer = null;
        
        // Hooks for React/DOM
        this.onScoreUpdate = null;
        this.onLivesUpdate = null;
        this.onStateChange = null;

        this.initGhosts();
        this.startIntelligenceScaling();
    }

    initGhosts() {
        this.ghosts = [
            new Ghost(13 * TILE_SIZE, 11 * TILE_SIZE, '#FF0000', 0), // Blinky
            new Ghost(13 * TILE_SIZE, 14 * TILE_SIZE, '#FFB8FF', 1), // Pinky
            new Ghost(11 * TILE_SIZE, 14 * TILE_SIZE, '#00FFFF', 2), // Inky
            new Ghost(15 * TILE_SIZE, 14 * TILE_SIZE, '#FFB852', 3)  // Clyde
        ];
    }

    startIntelligenceScaling() {
        // Every 30 seconds, increase global intelligence by 0.1 until it reaches 0.95
        this.intelligenceTimer = setInterval(() => {
            if (GLOBAL_INTELLIGENCE < 0.95) {
                GLOBAL_INTELLIGENCE += 0.05;
                console.log("Difficulty Increased! Intelligence:", GLOBAL_INTELLIGENCE.toFixed(2));
            }
        }, 30000);
    }

    resetPositions() {
        this.pacman.reset();
        this.ghosts.forEach(g => g.reset());
    }

    startLevel() {
        this.map.reset();
        this.resetPositions();
        this.startModeTimer();
        GLOBAL_INTELLIGENCE = 0.5; // Reset intelligence for new level/game
    }

    startModeTimer() {
        let isScatter = true;
        let cycles = 0;

        const switchMode = () => {
            cycles++;
            isScatter = !isScatter;
            this.ghosts.forEach(g => {
                if (!g.isDead) {
                    g.mode = isScatter ? 'scatter' : 'chase';
                    // Reversing direction on mode change is authentic
                    g.dir = { x: -g.dir.x, y: -g.dir.y };
                }
            });
            
            let nextTime = isScatter ? 7000 : 20000;
            if (cycles > 4) nextTime = isScatter ? 5000 : 20000;
            
            clearTimeout(this.modeTimer);
            this.modeTimer = setTimeout(switchMode, nextTime);
        };

        this.modeTimer = setTimeout(switchMode, 7000);
    }

    addScore(pts) {
        if (this.onScoreUpdate) this.onScoreUpdate(pts);
    }

    activatePowerPellet() {
        this.ghostsEatenInCycle = 0;
        this.ghostMultiplier = 200;
        this.ghosts.forEach(g => {
            if (!g.isDead) {
                g.isFrightened = true;
                g.speed = 0.8;
                g.dir = { x: -g.dir.x, y: -g.dir.y };
            }
        });

        clearTimeout(this.powerPelletTimer);
        this.powerPelletTimer = setTimeout(() => {
            this.ghosts.forEach(g => {
                g.isFrightened = false;
                if (!g.isDead) g.speed = 1.4;
            });
        }, 8000); // 8 seconds of power
    }

    eatGhost(ghost) {
        this.ghostsEatenInCycle++;
        this.addScore(this.ghostMultiplier);
        audioManager.playEatGhost(this.ghostsEatenInCycle);
        this.ghostMultiplier *= 2;
    }

    loseLife() {
        if (this.onLivesUpdate) this.onLivesUpdate();
    }

    handleInput(key) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.pacman.setNextDir(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.pacman.setNextDir(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.pacman.setNextDir(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.pacman.setNextDir(1, 0);
                break;
        }
    }

    update(gameState) {
        if (gameState !== 'playing') return;

        this.pacman.update(this.map, this);
        this.ghosts.forEach(g => g.update(this.map, this.pacman, this));

        if (this.map.dotsRemaining === 0) {
            if (this.onStateChange) this.onStateChange('level_complete');
        }
    }

    draw(ctx, gameState) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        this.map.draw(ctx);
        
        if (gameState !== 'menu') {
            if (gameState !== 'dying') {
                this.pacman.draw(ctx);
            } else {
                // Death animation frame
                ctx.fillStyle = '#FFFF00';
                ctx.beginPath();
                ctx.arc(this.pacman.x + TILE_SIZE/2, this.pacman.y + TILE_SIZE/2, TILE_SIZE/2, 0, Math.PI * 2);
                ctx.fill();
            }
            this.ghosts.forEach(g => g.draw(ctx));
        }
    }
}
