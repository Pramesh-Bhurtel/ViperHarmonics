import { state } from './state.js';

class AudioEngine {
    constructor() {
        this.context = null;
        this.gainNode = null;
        this.analyserNode = null;
        
        this.audioBuffer = null;
        
        this.sourceNodes = [];
        this.sourceNodeState = []; // 0=off, 1=on
        
        this.sampleURL = './assets/sounds/harmonium-kannan-orig.wav';
        this.reverbURL = './assets/sounds/reverb.wav';
        
        this.reverbGain = null;
        
        this.keyMap = [];
        this.baseKeyMap = [];
        this.middleC = 60;
        this.rootKey = 62;
        this.octaveMap = [-36, -24, -12, 0, 12, 24, 36];

        this.loopStart = 0.5;
        this.loopEnd = 7.5; 
        this.loop = true;
    }

    async init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = state.get('volume') / 100;

        this.analyserNode = this.context.createAnalyser();
        this.analyserNode.fftSize = 512;

        this.reverbNode = this.context.createConvolver();
        this.reverbGain = this.context.createGain();
        this.reverbGain.gain.value = 0;

        // Chain: Instruments -> MasterGain -> Analyser -> Destination (Dry)
        this.gainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.context.destination);
        
        // Reverb tail: Analyser -> ReverbGain -> ReverbNode -> Destination
        // Reversed gain order for better signal control
        this.analyserNode.connect(this.reverbGain);
        this.reverbGain.connect(this.reverbNode);
        this.reverbNode.connect(this.context.destination);

        state.subscribe('volume', (vol) => {
            if (this.gainNode) {
                this.gainNode.gain.setTargetAtTime(vol / 100, this.context.currentTime, 0.05);
            }
        });

        state.subscribe('useReverb', (use) => this.updateReverbTopology(use));
        state.subscribe('transpose', () => this.buildKeyMap());

        await Promise.all([
            this.loadHarmoniumSample(),
            this.loadReverbSample()
        ]);
        
        this.buildKeyMap();
        state.set('isLoaded', true);
    }

    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    async loadHarmoniumSample() {
        try {
            const response = await fetch(this.sampleURL);
            if (!response.ok) throw new Error(`Failed to fetch ${this.sampleURL}`);
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error('Error loading harmonium sample:', e);
            // Non blocking if file missing but limits functionality
        }
    }

    async loadReverbSample() {
        try {
            const response = await fetch(this.reverbURL);
            if (!response.ok) throw new Error(`Failed to fetch ${this.reverbURL}`);
            const arrayBuffer = await response.arrayBuffer();
            this.reverbNode.buffer = await this.context.decodeAudioData(arrayBuffer);
            this.updateReverbTopology(state.get('useReverb'));
        } catch (e) {
            console.error('Error loading reverb sample:', e);
        }
    }

    updateReverbTopology(useReverb) {
        if (!this.reverbGain || !this.reverbNode) return;
        
        const now = this.context.currentTime;
        // Only allow wet mix if buffer is actually loaded to prevent silent Convolver feedback
        if (useReverb && this.reverbNode.buffer) {
            this.reverbGain.gain.setTargetAtTime(0.5, now, 0.1); 
        } else {
            this.reverbGain.gain.setTargetAtTime(0, now, 0.1);
        }
    }



    buildKeyMap() {
        const transpose = state.get('transpose');
        let startKey = (this.middleC - 124) + (this.rootKey - this.middleC); // As per original formula
        
        for (let i = 0; i < 128; ++i) {
            this.baseKeyMap[i] = startKey++;
            this.keyMap[i] = this.baseKeyMap[i] + transpose;
            if (this.sourceNodeState[i] !== 1) {
                this.sourceNodes[i] = null;
                this.sourceNodeState[i] = 0;
            }
        }
    }

    setupSourceNode(i) {
        if (!this.context) return;
        if (!this.audioBuffer) return;

        if (this.sourceNodes[i] !== null && this.sourceNodeState[i] === 1) {
            try { this.sourceNodes[i].source.stop(0); } catch(e) {}
        }
        
        this.sourceNodeState[i] = 0;
        
        const source = this.context.createBufferSource();
        source.buffer = this.audioBuffer;
        source.loop = this.loop;
        source.loopStart = this.loopStart;
        source.loopEnd = this.loopEnd;
        
        if (typeof this.keyMap[i] !== 'undefined') {
            const organicDetune = Math.random() * 3;
            source.detune.value = (this.keyMap[i] * 100) + organicDetune;
        }

        const envelope = this.context.createGain();
        envelope.gain.value = 0;
        
        // Add stereo width (Low notes Left, High notes Right)
        const panner = this.context.createStereoPanner();
        const panValue = (i - 60) / 48; // -1 to 1 across 4 octaves
        panner.pan.value = Math.max(-0.4, Math.min(0.4, panValue));
        
        source.connect(envelope);
        envelope.connect(panner);
        panner.connect(this.gainNode);
        
        this.sourceNodes[i] = { source, envelope, panner, isSynth: false };
    }

    async noteOn(note, velocity = 127) {
        this.resume(); // Non-blocking: background resume

        const currentOctave = state.get('octave');
        const stackCount = state.get('stackCount');
        
        let i = note + this.octaveMap[currentOctave];
        this.playNode(i, velocity);
        
        for (let c = 1; c <= stackCount; ++c) {
            const nextOctaveIndex = currentOctave + c;
            if (nextOctaveIndex < this.octaveMap.length) {
                i = note + this.octaveMap[nextOctaveIndex];
                this.playNode(i, velocity);
            }
        }
        
        state.addActiveNote(note);
    }

    playNode(i, velocity) {
        if (i < 0 || i >= this.sourceNodes.length) return;
        
        if (this.sourceNodeState[i] === 0) {
            const velGain = velocity / 127;
            const now = this.context.currentTime;
            
            // Fallback Synthesizer Mode (Improved Harmonics)
            if (!this.audioBuffer) {
                const osc = this.context.createOscillator();
                const osc2 = this.context.createOscillator();
                const filter = this.context.createBiquadFilter();
                const envelope = this.context.createGain();
                const panner = this.context.createStereoPanner();
                
                const midiNote = i;
                const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(freq * 1.002, now); // Slight detune for "living" tone
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, now); // Soften the synthesis
                
                panner.pan.value = Math.max(-0.4, Math.min(0.4, (i - 60) / 48));

                envelope.gain.setValueAtTime(0, now);
                envelope.gain.linearRampToValueAtTime(velGain * 0.25, now + 0.1); 
                
                osc.connect(filter);
                osc2.connect(filter);
                filter.connect(envelope);
                envelope.connect(panner);
                panner.connect(this.gainNode);
                
                osc.start(now);
                osc2.start(now);
                
                this.sourceNodes[i] = { osc, osc2, filter, envelope, panner, isSynth: true };
                this.sourceNodeState[i] = 1;
                return;
            }

            // Normal Sample Mode
            if (!this.sourceNodes[i] || this.sourceNodes[i].isSynth) {
                this.setupSourceNode(i);
            }
            
            if (this.sourceNodes[i]) {
                const { source, envelope } = this.sourceNodes[i];
                
                envelope.gain.cancelScheduledValues(now);
                envelope.gain.setValueAtTime(0, now);
                envelope.gain.linearRampToValueAtTime(velGain, now + 0.08); // Smother attack to prevent 'beats'
                
                try {
                    source.start(0);
                } catch(e) {
                    this.setupSourceNode(i);
                    if (this.sourceNodes[i] && !this.sourceNodes[i].isSynth) {
                        this.sourceNodes[i].source.start(0);
                        this.sourceNodes[i].envelope.gain.setValueAtTime(velGain, now);
                    }
                }
                
                this.sourceNodeState[i] = 1;
            }
        }
    }

    noteOff(note) {
        const currentOctave = state.get('octave');
        const stackCount = state.get('stackCount');
        
        let i = note + this.octaveMap[currentOctave];
        this.stopNode(i);
        
        for (let c = 1; c <= stackCount; ++c) {
            const nextOctaveIndex = currentOctave + c;
            if (nextOctaveIndex < this.octaveMap.length) {
                i = note + this.octaveMap[nextOctaveIndex];
                this.stopNode(i);
            }
        }
        
        state.removeActiveNote(note);
    }

    stopNode(i) {
        if (i < 0 || i >= this.sourceNodes.length) return;

        if (this.sourceNodeState[i] === 1 && this.sourceNodes[i]) {
            const { source, osc, osc2, envelope, isSynth } = this.sourceNodes[i];
            const now = this.context.currentTime;
            
            envelope.gain.cancelScheduledValues(now);
            envelope.gain.setValueAtTime(envelope.gain.value, now);
            envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // Organic decay
            
            this.sourceNodeState[i] = 0;

            // Wait for organic decay before stopping/re-setting nodes
            setTimeout(() => {
                if (isSynth) {
                    try {
                        osc.stop();
                        osc2.stop();
                    } catch(e) {}
                    if (this.sourceNodeState[i] === 0) {
                        this.sourceNodes[i] = null;
                    }
                } else {
                    try { source.stop() } catch(e) {}
                    // We don't nullify samples nodes as they are re-used after setupSourceNode
                }
            }, 300); // 300ms > 200ms ramp
        }
    }

    getAnalyserNode() {
        return this.analyserNode;
    }
}

export const engine = new AudioEngine();
