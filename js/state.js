class AppState {
    constructor() {
        this.listeners = new Map();
        
        // Load defaults from local storage or set fallbacks
        this.state = {
            volume: this.loadNumber('ViperHarmonics.volume', 30),
            useReverb: this.loadBoolean('ViperHarmonics.useReverb', false),
            octave: this.loadNumber('ViperHarmonics.octave', 3), // default 3 corresponds to middle C range initially
            transpose: this.loadNumber('ViperHarmonics.transpose', 0),
            stackCount: this.loadNumber('ViperHarmonics.stack', 0),
            isLoaded: false,
            midiConnected: false,
            soundEffectsEnabled: this.loadBoolean('ViperHarmonics.sfx', true),
            notation: "",
            recordingSequence: this.loadObject('ViperHarmonics.recordingSequence', []),
            activeNotes: new Set(),
            theme: this.loadString('ViperHarmonics.theme', 'dark'),
            isRecording: true,
            sessionStartTime: performance.now(),
            noteOnTimes: new Map(), // {note -> startTime}
            authorName: this.loadString('ViperHarmonics.authorName', 'Anonymous Artist'),
            isShared: false,
            isLocked: false,
            currentTrack: { title: 'New Jam', author: 'Anonymous' }
        };
    }

    loadNumber(key, fallback) {
        if (typeof Storage !== "undefined") {
            const val = localStorage.getItem(key);
            if (val !== null && !isNaN(parseInt(val, 10))) return parseInt(val, 10);
        }
        return fallback;
    }

    loadBoolean(key, fallback) {
        if (typeof Storage !== "undefined") {
            const val = localStorage.getItem(key);
            if (val !== null) return val === "true";
        }
        return fallback;
    }

    loadString(key, fallback) {
        if (typeof Storage !== "undefined") {
            const val = localStorage.getItem(key);
            if (val !== null) return val;
        }
        return fallback;
    }

    loadObject(key, fallback) {
        if (typeof Storage !== "undefined") {
            try {
                const val = localStorage.getItem(key);
                if (val !== null) return JSON.parse(val);
            } catch (e) { console.error(`Error loading object ${key}`, e); }
        }
        return fallback;
    }

    save(key, val) {
        if (typeof Storage !== "undefined" && typeof val !== "undefined") {
            // Never persist locking state to storage
            if (key === 'isLocked') return;
            const storageKey = key.startsWith('ViperHarmonics.') ? key : `ViperHarmonics.${key}`;
            if (typeof val === "object") {
                localStorage.setItem(storageKey, JSON.stringify(val));
            } else {
                localStorage.setItem(storageKey, val.toString());
            }
        }
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        if (value instanceof Set) {
            console.warn(`[state] Use addActiveNote/removeActiveNote for Set types.`);
            return;
        }
        if (this.state[key] !== value) {
            this.state[key] = value;
            this.save(key, value);
            this.notify(key, value);
        }
    }

    setNotation(value) {
        if (this.state.notation !== value) {
            this.state.notation = value;
            this.notify('notation', value);
            this._debouncedSaveNotation();
        }
    }

    addActiveNote(note) {
        if (!this.state.activeNotes.has(note)) {
            this.state.activeNotes.add(note);
            this.notify('activeNotes', Array.from(this.state.activeNotes));
        }
    }

    removeActiveNote(note) {
        if (this.state.activeNotes.has(note)) {
            this.state.activeNotes.delete(note);
            this.notify('activeNotes', Array.from(this.state.activeNotes));
        }
    }
    
    appendNotation(swaram) {
        this.state.notation += swaram;
        this.notify('notation', this.state.notation);
        this._debouncedSaveNotation();
    }

    _debouncedSaveNotation() {
        clearTimeout(this._notationSaveTimer);
        this._notationSaveTimer = setTimeout(() => {
            this.save('notation', this.state.notation);
        }, 500);
    }
    
    deleteNotation() {
        if (this.state.notation.length > 0) {
            this.state.notation = [...this.state.notation].slice(0, -1).join('');
            this.save('notation', this.state.notation);
            this.notify('notation', this.state.notation);
        }
    }
    
    clearNotation() {
        this.state.notation = "";
        this.state.recordingSequence = [];
        this.state.sessionStartTime = performance.now();
        this.save('notation', this.state.notation);
        this.notify('notation', this.state.notation);
    }

    addToSequence(event) {
        this.state.recordingSequence.push(event);
        this.notify('recordingSequence', this.state.recordingSequence);
        this._debouncedSaveSequence();
    }

    _debouncedSaveSequence() {
        clearTimeout(this._sequenceSaveTimer);
        this._sequenceSaveTimer = setTimeout(() => {
            this.save('recordingSequence', this.state.recordingSequence);
        }, 1000);
    }

    setSequence(seq) {
        this.state.recordingSequence = seq || [];
        this.save('recordingSequence', this.state.recordingSequence);
        this.notify('recordingSequence', this.state.recordingSequence);
    }

    setNoteOnTime(note, time) {
        this.state.noteOnTimes.set(note, time);
    }

    getNoteOnTime(note) {
        return this.state.noteOnTimes.get(note);
    }

    removeNoteOnTime(note) {
        this.state.noteOnTimes.delete(note);
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => cb(value));
        }
    }
}

export const state = new AppState();
