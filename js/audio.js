class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.enabled = false;
        this.lastWakaTime = 0;
    }

    init() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.enabled = true;
    }

    playStartSong() {
        if (!this.enabled) return;
        const now = this.ctx.currentTime;
        
        // Iconic Pac-Man Intro Notes
        const notes = [
            { f: 493.88, d: 0.1 }, { f: 987.77, d: 0.1 }, { f: 739.99, d: 0.1 }, { f: 622.25, d: 0.1 },
            { f: 987.77, d: 0.1 }, { f: 739.99, d: 0.1 }, { f: 622.25, d: 0.2 },
            { f: 523.25, d: 0.1 }, { f: 1046.50, d: 0.1 }, { f: 783.99, d: 0.1 }, { f: 659.25, d: 0.1 },
            { f: 1046.50, d: 0.1 }, { f: 783.99, d: 0.1 }, { f: 659.25, d: 0.2 },
            { f: 493.88, d: 0.1 }, { f: 987.77, d: 0.1 }, { f: 739.99, d: 0.1 }, { f: 622.25, d: 0.1 },
            { f: 987.77, d: 0.1 }, { f: 739.99, d: 0.1 }, { f: 622.25, d: 0.1 },
            { f: 622.25, d: 0.05 }, { f: 659.25, d: 0.05 }, { f: 698.46, d: 0.05 },
            { f: 698.46, d: 0.05 }, { f: 739.99, d: 0.05 }, { f: 783.99, d: 0.05 },
            { f: 830.61, d: 0.05 }, { f: 880.00, d: 0.05 }, { f: 932.33, d: 0.05 }, { f: 987.77, d: 0.2 }
        ];

        let time = now;
        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, time);
            gainNode.gain.setValueAtTime(0.05, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + note.d);
            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + note.d);
            time += note.d;
        });
    }

    playWaka() {
        if (!this.enabled) return;
        const now = this.ctx.currentTime;
        if (now - this.lastWakaTime < 0.15) return;
        this.lastWakaTime = now;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.1);
    }

    playEatGhost(count = 1) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const baseFreq = 400 + (count * 100);
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playDeath() {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        let now = this.ctx.currentTime;
        for (let i = 0; i < 15; i++) {
            osc.frequency.linearRampToValueAtTime(400 - (i * 25), now + (i * 0.1));
            osc.frequency.linearRampToValueAtTime(100 - (i * 5), now + (i * 0.1) + 0.05);
        }
        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }
}

const audioManager = new AudioManager();
