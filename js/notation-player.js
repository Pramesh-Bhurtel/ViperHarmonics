import { state } from './state.js';
import { engine } from './audio-engine.js';

class NotationPlayer {
    constructor() {
        this.isPlaying = false;
        this.bpm = 300; // default tempo: ms per character evaluation
        
        // Reverse swaram map to MIDI bases (white keys default for ambiguous)
        this.swaramToMidi = {
            "Ṃ": 53,
            "P̣": 55,
            "Ḍ": 57,
            "Ṇ": 59,
            "S": 60,
            "R": 62,
            "G": 64,
            "M": 65,
            "P": 67,
            "D": 69,
            "N": 71,
            "Ṡ": 72,
            "Ṙ": 74,
            "Ġ": 76,
            "Ṁ": 77,
            "Ṗ": 79
        };
        
        this.playbackTimer = null;
        this.activeTimeouts = [];
    }

    async play(notationStr, highlightCallback, sequence = null) {
        if (this.isPlaying) return;
        this.isPlaying = true;
        state.set('isLocked', true);

        if (!state.get('isLoaded')) await engine.init();

        // If high-fidelity sequence is provided, use it for exact replay
        if (sequence && sequence.length > 0) {
            this.playSequence(sequence, highlightCallback);
            return;
        }

        // Fallback: Swaram BPM-based playback (for tutorials or manual text edits)
        this.playByText(notationStr, highlightCallback);
    }

    playSequence(sequence, highlightCallback) {
        let firstNoteTime = sequence[0].time;

        sequence.forEach(event => {
            const relativeStart = event.time - firstNoteTime;
            
            // Schedule Note On
            const onId = setTimeout(() => {
                engine.noteOn(event.note);
                if (highlightCallback) {
                    // Find swaram position (approximate or based on sequence index)
                    // For now we just trigger callback to indicate playing
                    highlightCallback(0, 0, true); 
                }
            }, relativeStart);

            // Schedule Note Off
            const offId = setTimeout(() => {
                engine.noteOff(event.note);
            }, relativeStart + event.duration);

            this.activeTimeouts.push(onId, offId);
        });

        // Loop end detection
        const lastEvent = sequence[sequence.length - 1];
        const totalDuration = (lastEvent.time - firstNoteTime) + lastEvent.duration;
        const endId = setTimeout(() => {
            this.stop(highlightCallback);
        }, totalDuration + 100);
        this.activeTimeouts.push(endId);
    }

    async playByText(notationStr, highlightCallback) {
        // ... previous logic moved to a helper for fallback ...
        const tokens = [];
        let index = 0;
        while (index < notationStr.length) {
            const char = notationStr[index];
            if (char === ' ' || char === '\n') {
                index++;
                continue;
            }
            let token = char;
            if (index + 1 < notationStr.length && (notationStr[index+1] === '̣' || notationStr[index+1] === '̇')) {
                token += notationStr[index+1];
                index += 2;
            } else {
                index++;
            }
            if (this.swaramToMidi[token] !== undefined || token === ',') {
                tokens.push({ text: token, start: index - token.length, end: index });
            }
        }

        if (tokens.length === 0) {
            this.stop(highlightCallback);
            return;
        }

        let i = 0;
        const loop = async () => {
            if (!this.isPlaying) return;
            state.get('activeNotes').forEach(n => engine.noteOff(n));
            
            if (i >= tokens.length) {
                this.stop(highlightCallback);
                return;
            }

            const tokenObj = tokens[i];
            const token = tokenObj.text;
            if (highlightCallback) highlightCallback(tokenObj.start, tokenObj.end, true);

            let playedNote = null;
            if (token !== ',') {
                const midiNote = this.swaramToMidi[token];
                if (midiNote !== undefined) {
                    engine.noteOn(midiNote);
                    playedNote = midiNote;
                }
            }

            const beatDuration = this.bpm;
            await new Promise(r => {
                const id = setTimeout(r, beatDuration * 0.8);
                this.activeTimeouts.push(id);
            });
            if (playedNote !== null && this.isPlaying) {
                engine.noteOff(playedNote);
            }
            await new Promise(r => {
                const id = setTimeout(r, beatDuration * 0.2);
                this.activeTimeouts.push(id);
            });

            i++;
            if (this.isPlaying) {
                this.playbackTimer = setTimeout(loop, 0);
            }
        };
        loop();
    }

    stop(highlightCallback) {
        this.isPlaying = false;
        clearTimeout(this.playbackTimer);
        this.activeTimeouts.forEach(id => clearTimeout(id));
        this.activeTimeouts = [];
        state.get('activeNotes').forEach(n => engine.noteOff(n));
        state.set('isLocked', false);
        
        if (highlightCallback) highlightCallback(-1, -1, false);
    }
}

export const player = new NotationPlayer();
