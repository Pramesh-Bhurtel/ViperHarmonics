import { state } from './state.js';
import { getKeyboardMapInverse } from './input-handler.js';

class KeyboardRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.keys = [];
        
        this.polygons = [
            { points: "0,0 14,0 14,50 21,50 21,100 0,100 0,0 ", class: "white", key: "`" },
            { points: "14,0 28,0 28,50 14,50 14,0 ", class: "black", key: "1" },
            { points: "21,50 28,50 28,0 35,0 35,50 42,50 42,100 21,100 21,50 ", class: "white", key: "q" },
            { points: "35,0 49,0 49,50 35,50 35,0 ", class: "black", key: "2" },
            { points: "42,50 49,50 49,0 63,0 63,100 42,100 42,50 ", class: "white", key: "w" },
            { points: "63,0 77,0 77,50 84,50 84,100 63,100 63,0 ", class: "white", key: "e" },
            { points: "77,0 91,0 91,50 77,50 77,0 ", class: "black", key: "4" },
            { points: "84,50 91,50 91,0 98,0 98,50 105,50 105,100 84,100 84,50 ", class: "white", key: "r" },
            { points: "98,0 112,0 112,50 98,50 98,0 ", class: "black", key: "5" },
            { points: "105,50 112,50 112,0 126,0 126,100 105,100 105,50 ", class: "white", key: "t" },
            { points: "126,0 140,0 140,50 147,50 147,100 126,100 126,0 ", class: "white", key: "y" },
            { points: "140,0 154,0 154,50 140,50 140,0 ", class: "black", key: "7" },
            { points: "147,50 154,50 154,0 161,0 161,50 168,50 168,100 147,100 147,50 ", class: "white", key: "u" },
            { points: "161,0 175,0 175,50 161,50 161,0 ", class: "black", key: "8" },
            { points: "168,50 175,50 175,0 182,0 182,50 189,50 189,100 168,100 168,50 ", class: "white", key: "i" },
            { points: "182,0 196,0 196,50 182,50 182,0 ", class: "black", key: "9" },
            { points: "189,50 196,50 196,0 210,0 210,100 189,100 189,50 ", class: "white", key: "o" },
            { points: "210,0 224,0 224,50 231,50 231,100 210,100 210,0 ", class: "white", key: "p" },
            { points: "224,0 238,0 238,50 224,50 224,0 ", class: "black", key: "-" },
            { points: "231,50 238,50 238,0 245,0 245,50 252,50 252,100 231,100 231,50 ", class: "white", key: "[" },
            { points: "245,0 259,0 259,50 245,50 245,0 ", class: "black", key: "=" },
            { points: "252,50 259,50 259,0 273,0 273,100 252,100 252,50 ", class: "white", key: "]" },
            { points: "273,0 294,0 294,100 273,100 273,0 ", class: "white", key: "\\" }
        ];

        this.texts = [
            { x: 7, y: 65, fill: "var(--text)", text: "`" },
            { x: 28, y: 65, fill: "var(--text)", text: "q" },
            { x: 49, y: 65, fill: "var(--text)", text: "w" },
            { x: 70, y: 65, fill: "var(--text)", text: "e" },
            { x: 91, y: 65, fill: "var(--text)", text: "r" },
            { x: 112, y: 65, fill: "var(--text)", text: "t" },
            { x: 133, y: 65, fill: "var(--text)", text: "y" },
            { x: 154, y: 65, fill: "var(--text)", text: "u" },
            { x: 175, y: 65, fill: "var(--text)", text: "i" },
            { x: 196, y: 65, fill: "var(--text)", text: "o" },
            { x: 217, y: 65, fill: "var(--text)", text: "p" },
            { x: 238, y: 65, fill: "var(--text)", text: "[" },
            { x: 259, y: 65, fill: "var(--text)", text: "]" },
            { x: 280, y: 65, fill: "var(--text)", text: "\\" },
            { x: 16, y: 30, fill: "var(--bg)", text: "1" },
            { x: 37, y: 30, fill: "var(--bg)", text: "2" },
            { x: 79, y: 30, fill: "var(--bg)", text: "4" },
            { x: 100, y: 30, fill: "var(--bg)", text: "5" },
            { x: 142, y: 30, fill: "var(--bg)", text: "7" },
            { x: 163, y: 30, fill: "var(--bg)", text: "8" },
            { x: 184, y: 30, fill: "var(--bg)", text: "9" },
            { x: 226, y: 30, fill: "var(--bg)", text: "-" },
            { x: 247, y: 30, fill: "var(--bg)", text: "=" },
            { x: 70, y: 90, fill: "var(--accent)", text: "C", class: "chord-label" },
            { x: 91, y: 90, fill: "var(--accent)", text: "D", class: "chord-label" },
            { x: 112, y: 90, fill: "var(--accent)", text: "E", class: "chord-label" },
            { x: 133, y: 90, fill: "var(--accent)", text: "F", class: "chord-label" },
            { x: 154, y: 90, fill: "var(--accent)", text: "G", class: "chord-label" },
            { x: 175, y: 90, fill: "var(--accent)", text: "A", class: "chord-label" },
            { x: 196, y: 90, fill: "var(--accent)", text: "B", class: "chord-label" }
        ];

        this.inverseKeyMap = getKeyboardMapInverse();
        state.subscribe('activeNotes', (notes) => this.updateKeyVisuals(notes));
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('viewBox', '0 0 294 110');
        svg.classList.add('keyboard-svg');
        
        svg.style.touchAction = 'none'; // essential for mobile drag

        this.keyMap = new Map();

        this.polygons.forEach(p => {
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute('points', p.points);
            poly.setAttribute('class', `key ${p.class}`);
            poly.setAttribute('data-key', p.key);
            this.keys.push({ el: poly, keyId: p.key });
            this.keyMap.set(p.key, poly);
            svg.appendChild(poly);
        });

        this.texts.forEach(t => {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', t.x);
            text.setAttribute('y', t.y);
            text.setAttribute('fill', t.fill);
            text.classList.add('key-text');
            
            if (t.class) {
                text.classList.add(t.class);
            }
            
            text.textContent = t.text;
            svg.appendChild(text);
        });

        container.innerHTML = '';
        container.appendChild(svg);
        this.svgEl = svg;
    }
    
    bindEvents(downHandler, upHandler, moveHandler, cancelHandler) {
        if (!this.svgEl) return;
        this.svgEl.addEventListener('pointerdown', downHandler);
        this.svgEl.addEventListener('pointerup', upHandler);
        this.svgEl.addEventListener('pointermove', moveHandler);
        this.svgEl.addEventListener('pointercancel', cancelHandler);
        this.svgEl.addEventListener('pointerleave', cancelHandler);
    }

    updateKeyVisuals(activeNotesArray) {
        // activeNotesArray holds MIDI note numbers
        const inverseMap = this.inverseKeyMap;
        
        // Remove active class from all
        this.keys.forEach(k => k.el.classList.remove('active'));
        
        // Add active class to pressed
        activeNotesArray.forEach(noteNum => {
            const char = inverseMap[noteNum];
            const el = this.keyMap?.get(char);
            if (el) el.classList.add('active');
        });
    }
}

export const keyboard = new KeyboardRenderer('keyboard-container');
