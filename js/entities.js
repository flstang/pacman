let GLOBAL_INTELLIGENCE = 0.75;

class Entity {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.dir = { x: 0, y: 0 };
        this.nextDir = { x: 0, y: 0 };
    }

    getCol() { return Math.round(this.x / TILE_SIZE); }
    getRow() { return Math.round(this.y / TILE_SIZE); }

    // Check if we are at the intersection of tiles
    atIntersection() {
        return Math.abs(this.x - this.getCol() * TILE_SIZE) < this.speed &&
               Math.abs(this.y - this.getRow() * TILE_SIZE) < this.speed;
    }

    tryMove(map) {
        // If we are near the center of a tile, handle direction changes and wall stopping
        if (this.atIntersection()) {
            // Snap to the exact center of the tile
            const col = this.getCol();
            const row = this.getRow();

            // Try to change to nextDir if it's clear
            if (this.nextDir.x !== 0 || this.nextDir.y !== 0) {
                if (map.getTile(col + this.nextDir.x, row + this.nextDir.y) !== 1) {
                    // Special case for ghosts and the gate (tile 4)
                    const isGate = map.getTile(col + this.nextDir.x, row + this.nextDir.y) === 4;
                    const canPassGate = this.isDead || (row >= 12 && row <= 15 && col >= 11 && col <= 16);
                    
                    if (!isGate || canPassGate) {
                        this.dir = { ...this.nextDir };
                        this.x = col * TILE_SIZE;
                        this.y = row * TILE_SIZE;
                    }
                }
            }

            // Stop if current direction is blocked by a wall
            const nextTile = map.getTile(col + this.dir.x, row + this.dir.y);
            const isNextGate = nextTile === 4;
            const canPassNextGate = this.isDead || (row >= 12 && row <= 15 && col >= 11 && col <= 16);

            if (nextTile === 1 || (isNextGate && !canPassNextGate)) {
                this.dir = { x: 0, y: 0 };
                this.x = col * TILE_SIZE;
                this.y = row * TILE_SIZE;
            }
        }

        // Apply movement
        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        // Force alignment on the non-moving axis to prevent drifting
        if (this.dir.x !== 0) this.y = this.getRow() * TILE_SIZE;
        if (this.dir.y !== 0) this.x = this.getCol() * TILE_SIZE;

        // Tunnel Wrap Around
        const maxX = (MAP_WIDTH - 1) * TILE_SIZE;
        if (this.x < -TILE_SIZE) this.x = maxX;
        else if (this.x > maxX) this.x = -TILE_SIZE;
    }
}

class PacMan extends Entity {
    constructor(startX, startY) {
        super(startX, startY, 2); // Standard speed
        this.startPos = { x: startX, y: startY };
        this.mouthOpen = 0;
        this.mouthDir = 1;
        this.angle = 0;
    }

    reset() {
        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.dir = { x: -1, y: 0 };
        this.nextDir = { x: -1, y: 0 };
        this.angle = Math.PI;
    }

    setNextDir(x, y) {
        this.nextDir = { x, y };
    }

    update(map, game) {
        this.tryMove(map);

        if (this.dir.x > 0) this.angle = 0;
        else if (this.dir.x < 0) this.angle = Math.PI;
        else if (this.dir.y > 0) this.angle = Math.PI / 2;
        else if (this.dir.y < 0) this.angle = -Math.PI / 2;

        if (this.dir.x !== 0 || this.dir.y !== 0) {
            this.mouthOpen += 0.15 * this.mouthDir;
            if (this.mouthOpen >= 0.5 || this.mouthOpen <= 0) {
                this.mouthDir *= -1;
            }
            audioManager.playWaka();
        }

        if (this.atIntersection()) {
            const c = this.getCol();
            const r = this.getRow();
            const tile = map.getTile(c, r);
            if (tile === 2) {
                map.grid[r][c] = 0;
                map.dotsRemaining--;
                game.addScore(10);
            } else if (tile === 3) {
                map.grid[r][c] = 0;
                map.dotsRemaining--;
                game.addScore(50);
                game.activatePowerPellet();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        const open = Math.max(0, this.mouthOpen);
        ctx.arc(0, 0, TILE_SIZE / 2, open * Math.PI, (2 - open) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();
    }
}

class Ghost extends Entity {
    constructor(x, y, color, type) {
        super(x, y, 1); // Ghost normal speed
        this.startPos = { x, y };
        this.color = color;
        this.type = type;
        this.isFrightened = false;
        this.isDead = false;
        this.dir = { x: 0, y: -1 };
        this.mode = 'scatter';
        this.scatterTarget = this.getScatterTarget();
    }

    reset() {
        this.x = this.startPos.x;
        this.y = this.startPos.y;
        this.dir = { x: 0, y: -1 };
        this.isFrightened = false;
        this.isDead = false;
        this.speed = 1;
    }

    getScatterTarget() {
        switch(this.type) {
            case 0: return { x: MAP_WIDTH - 2, y: 0 };
            case 1: return { x: 1, y: 0 };
            case 2: return { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 };
            case 3: return { x: 1, y: MAP_HEIGHT - 2 };
            default: return { x: 1, y: 1 };
        }
    }

    getChaseTarget(pacman) {
        switch(this.type) {
            case 0: return { x: pacman.getCol(), y: pacman.getRow() };
            case 1: return { x: pacman.getCol() + pacman.dir.x * 4, y: pacman.getRow() + pacman.dir.y * 4 };
            default: return { x: pacman.getCol(), y: pacman.getRow() };
        }
    }

    update(map, pacman, game) {
        if (this.atIntersection()) {
            this.x = this.getCol() * TILE_SIZE;
            this.y = this.getRow() * TILE_SIZE;

            let target;
            if (this.isDead) {
                target = { x: 13, y: 14 };
                if (this.getCol() === 13 && (this.getRow() === 14 || this.getRow() === 11 || this.getRow() === 12)) {
                    this.isDead = false;
                    this.isFrightened = false;
                    this.speed = 1;
                }
            } else if (this.getRow() >= 12 && this.getRow() <= 15 && this.getCol() >= 11 && this.getCol() <= 16) {
                // If in cage, target the exit
                target = { x: 13, y: 11 };
            } else if (this.isFrightened) {
                const corners = [{x:1, y:1}, {x:26, y:1}, {x:1, y:29}, {x:26, y:29}];
                let maxDist = -1;
                corners.forEach(c => {
                    const d = Math.pow(c.x - pacman.getCol(), 2) + Math.pow(c.y - pacman.getRow(), 2);
                    if (d > maxDist) {
                        maxDist = d;
                        target = c;
                    }
                });
            } else {
                target = this.mode === 'chase' ? this.getChaseTarget(pacman) : this.scatterTarget;
            }

            const dirs = [{x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 1, y: 0}];
            const moveSmart = Math.random() < GLOBAL_INTELLIGENCE || this.isDead;

            let bestDir = null;
            let minDist = Infinity;
            let validDirs = [];

            for (let d of dirs) {
                if (!this.isFrightened && !this.isDead && d.x === -this.dir.x && d.y === -this.dir.y) continue;

                const nextC = this.getCol() + d.x;
                const nextR = this.getRow() + d.y;
                const tile = map.getTile(nextC, nextR);
                const isGate = (tile === 4);
                const canPassGate = this.isDead || (this.getRow() >= 12 && this.getRow() <= 15 && this.getCol() >= 11 && this.getCol() <= 16);

                if (tile !== 1 && (!isGate || canPassGate)) {
                    validDirs.push(d);
                    const dist = Math.pow(nextC - target.x, 2) + Math.pow(nextR - target.y, 2);
                    if (dist < minDist) {
                        minDist = dist;
                        bestDir = d;
                    }
                }
            }

            if (moveSmart && bestDir) {
                this.dir = bestDir;
            } else if (validDirs.length > 0) {
                this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
            }
        }

        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        if (this.dir.x !== 0) this.y = this.getRow() * TILE_SIZE;
        if (this.dir.y !== 0) this.x = this.getCol() * TILE_SIZE;

        const maxX = (MAP_WIDTH - 1) * TILE_SIZE;
        if (this.x < -TILE_SIZE) this.x = maxX;
        else if (this.x > maxX) this.x = -TILE_SIZE;

        if (!this.isDead) {
            const dx = this.x - pacman.x;
            const dy = this.y - pacman.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < TILE_SIZE * 0.7) {
                if (this.isFrightened) {
                    this.isDead = true;
                    this.speed = 4; // Much faster return speed for eyes
                    game.eatGhost(this);
                } else {
                    game.loseLife();
                }
            }
        }
    }

    draw(ctx) {
        const drawX = this.x;
        const drawY = this.y;

        if (!this.isDead) {
            ctx.fillStyle = this.isFrightened ? '#0000FF' : this.color;
            ctx.beginPath();
            ctx.arc(drawX + TILE_SIZE/2, drawY + TILE_SIZE/2, TILE_SIZE/2, Math.PI, 0);
            ctx.lineTo(drawX + TILE_SIZE, drawY + TILE_SIZE);
            ctx.lineTo(drawX + TILE_SIZE*0.8, drawY + TILE_SIZE*0.8);
            ctx.lineTo(drawX + TILE_SIZE*0.5, drawY + TILE_SIZE);
            ctx.lineTo(drawX + TILE_SIZE*0.2, drawY + TILE_SIZE*0.8);
            ctx.lineTo(drawX, drawY + TILE_SIZE);
            ctx.fill();
        }

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(drawX + TILE_SIZE*0.3, drawY + TILE_SIZE*0.4, 3, 0, Math.PI*2);
        ctx.arc(drawX + TILE_SIZE*0.7, drawY + TILE_SIZE*0.4, 3, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#000';
        const px = (this.dir.x || 0) * 2;
        const py = (this.dir.y || 0) * 2;
        ctx.beginPath();
        ctx.arc(drawX + TILE_SIZE*0.3 + px, drawY + TILE_SIZE*0.4 + py, 1.5, 0, Math.PI*2);
        ctx.arc(drawX + TILE_SIZE*0.7 + px, drawY + TILE_SIZE*0.4 + py, 1.5, 0, Math.PI*2);
        ctx.fill();
    }
}
