import { engine } from './audio-engine.js';
import { state } from './state.js';

class AudioVisualizer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.isRunning = false;

        this.resize = this.resize.bind(this);
    }

    init() {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', this.resize);
        this.resize();
        this.start();
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.draw();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    draw() {
        if (!this.isRunning || !this.canvas) return;

        this.animationId = requestAnimationFrame(() => this.draw());

        const analyser = engine.getAnalyserNode();
        if (!analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        if (!this.dataArray || this.dataArray.length !== bufferLength) {
            this.dataArray = new Uint8Array(bufferLength);
        }
        const dataArray = this.dataArray;
        analyser.getByteTimeDomainData(dataArray);

        // Faint trail for smooth effect
        this.ctx.fillStyle = 'rgba(10, 10, 15, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.lineWidth = 3;
        
        const activeCount = state.get('activeNotes').size || 0;
        
        // Dynamically shift color from amber to intensity
        if (activeCount > 0) {
            this.ctx.strokeStyle = `hsl(${35 - activeCount*5}, 90%, 60%)`;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.ctx.strokeStyle;
        } else {
            this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowColor = 'rgba(245, 158, 11, 0.1)';
        }

        this.ctx.beginPath();

        const sliceWidth = this.canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (this.canvas.height / 2);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }
}

export const visualizer = new AudioVisualizer('visualizer-canvas');
