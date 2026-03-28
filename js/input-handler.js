import { state } from './state.js';
import { engine } from './audio-engine.js';

export const keyboardMap = {
    "s": 53,   "S": 53,
    "a": 54,   "A": 54,
    "`": 55,   
    "1": 56,   
    "q": 57,   "Q": 57,
    "2": 58,   
    "w": 59,   "W": 59,
    "e": 60,   "E": 60,
    "4": 61,   
    "r": 62,   "R": 62,
    "5": 63,   
    "t": 64,   "T": 64,
    "y": 65,   "Y": 65,
    "7": 66,   
    "u": 67,   "U": 67,
    "8": 68,   
    "i": 69,   "I": 69,
    "9": 70,   
    "o": 71,   "O": 71,
    "p": 72,   "P": 72,
    "-": 73,   
    "[": 74,   
    "=": 75,   
    "]": 76,   
    "\\": 77,  
    "'": 78,   
    ";": 79
};

// Note: Using a single mapping back for reverse lookup (used by keyboard visualizer)
export function getKeyboardMapInverse() {
    const inverse = {};
    for (const key in keyboardMap) {
        // Prefer lowercase representations 
        if (key === key.toLowerCase() || !key.match(/[a-z]/i)) {
            inverse[keyboardMap[key]] = key;
        }
    }
    return inverse;
}

const swaramMap = {
    "s": "Ṃ",  "S": "Ṃ",
    "a": "Ṃ",  "A": "Ṃ",
    "`": "P̣",  
    "1": "Ḍ",  
    "q": "Ḍ",  "Q": "Ḍ",
    "2": "Ṇ",  
    "w": "Ṇ",  "W": "Ṇ",
    "e": "S",  "E": "S",
    "4": "R",  
    "r": "R",  "R": "R",
    "5": "G",  
    "t": "G",  "T": "G",
    "y": "M",  "Y": "M",
    "7": "M",  
    "u": "P",  "U": "P",
    "8": "D",  
    "i": "D",  "I": "D",
    "9": "N",  
    "o": "N",  "O": "N",
    "p": "Ṡ",  "P": "Ṡ",
    "-": "Ṙ",  
    "[": "Ṙ",  
    "=": "Ġ",  
    "]": "Ġ",  
    "\\": "Ṁ", 
    "'": "Ṁ",  
    ";": "Ṗ",  
    ",": ","  
};

// Touch/Pointer tracking
const activePointers = new Map(); // pointerId -> midiNote

let lastNoteTime = 0;

function closeActiveOverlays() {
    const actives = document.querySelectorAll('.overlay.active');
    actives.forEach(a => a.classList.remove('active'));
}

function handleNotationAppend(swaram) {
    const now = performance.now();
    const currentNotation = state.get('notation');
    
    // Auto-spacing for natural phrasing if > 1s pause
    if (now - lastNoteTime > 1000 && currentNotation.length > 0 && !currentNotation.endsWith(' ') && !currentNotation.endsWith('\n')) {
        state.appendNotation(' ' + swaram);
    } else {
        state.appendNotation(swaram);
    }
    lastNoteTime = now;
}

function getNoteFromPolygon(polygon) {
    if (!polygon || !polygon.getAttribute) return null;
    const key = polygon.getAttribute('data-key');
    if (key && typeof keyboardMap[key] !== "undefined") {
        return keyboardMap[key];
    }
    return null;
}

export function handlePointerDown(e) {
    e.preventDefault();
    if (!state.get('isLoaded') || state.get('isLocked')) return;
    
    closeActiveOverlays();
    
    const polygon = e.target;
    // Check if what we clicked is a polygon
    if(polygon.tagName !== 'polygon') return;
    
    const note = getNoteFromPolygon(polygon);
    if (note !== null) {
        engine.noteOn(note);
        activePointers.set(e.pointerId, note);
        state.setNoteOnTime(note, performance.now());
        
        // Handle swaram notation on click as well
        const charKey = polygon.getAttribute('data-key');
        if (swaramMap[charKey]) {
            handleNotationAppend(swaramMap[charKey]);
        }
    }
}

export function handlePointerUp(e) {
    e.preventDefault();
    const note = activePointers.get(e.pointerId);
    if (note !== undefined) {
        engine.noteOff(note);
        activePointers.delete(e.pointerId);

        const startTime = state.getNoteOnTime(note);
        if (startTime) {
            const now = performance.now();
            const charKey = getKeyboardMapInverse()[note];
            const swaram = swaramMap[charKey] || "";
            state.addToSequence({
                note: note,
                time: startTime - state.get('sessionStartTime'),
                duration: now - startTime,
                swaram: swaram
            });
            state.removeNoteOnTime(note);
        }
    }
}

export function handlePointerMove(e) {
    e.preventDefault();
    if (state.get('isLocked')) return;
    if (!activePointers.has(e.pointerId)) return; // Only process if pointer is active (dragging)

    // Find what element is currently under the pointer
    // Using un-cached clientX/Y
    const elUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
    if (elUnderPointer && elUnderPointer.tagName === 'polygon') {
        const newNote = getNoteFromPolygon(elUnderPointer);
        const lastNote = activePointers.get(e.pointerId);
        
        // If we dragged onto a new note
        if (newNote !== null && newNote !== lastNote) {
            // Stop old note
            if (lastNote !== undefined) {
                engine.noteOff(lastNote);
                
                const startTime = state.getNoteOnTime(lastNote);
                if (startTime) {
                    const now = performance.now();
                    const charKeyPrev = getKeyboardMapInverse()[lastNote];
                    const swaramPrev = swaramMap[charKeyPrev] || "";
                    state.addToSequence({
                        note: lastNote,
                        time: startTime - state.get('sessionStartTime'),
                        duration: now - startTime,
                        swaram: swaramPrev
                    });
                    state.removeNoteOnTime(lastNote);
                }
            }
            // Start new note
            engine.noteOn(newNote);
            activePointers.set(e.pointerId, newNote);
            state.setNoteOnTime(newNote, performance.now());

            const newKey = elUnderPointer.getAttribute('data-key');
            if (newKey && swaramMap[newKey]) {
                handleNotationAppend(swaramMap[newKey]);
            }
        }
    } else {
        // Dragged outside keys, stop note
        const note = activePointers.get(e.pointerId);
        if (note !== undefined) {
            engine.noteOff(note);
            activePointers.delete(e.pointerId);

            const startTime = state.getNoteOnTime(note);
            if (startTime) {
                const now = performance.now();
                const charKey = getKeyboardMapInverse()[note];
                const swaram = swaramMap[charKey] || "";
                state.addToSequence({
                    note: note,
                    time: startTime - state.get('sessionStartTime'),
                    duration: now - startTime,
                    swaram: swaram
                });
                state.removeNoteOnTime(note);
            }
        }
    }
}

export function handlePointerCancel(e) {
    handlePointerUp(e);
}

// Global Keyboard Events
export function initKeyboardListeners() {
    window.addEventListener('keydown', (event) => {
        // Don't trigger if typing in an input or if the engine is locked
        const isTyping = event.target.id === 'notation-display' || 
                         event.target.tagName === 'TEXTAREA' || 
                         (event.target.tagName === 'INPUT' && (event.target.type === 'text' || event.target.type === 'number'));

        if (isTyping || state.get('isLocked')) return;
        
        if (typeof keyboardMap[event.key] !== "undefined") {
            closeActiveOverlays();
        }
        
        if (!event.repeat && typeof keyboardMap[event.key] !== "undefined") {
            const note = keyboardMap[event.key];
            engine.noteOn(note);
            state.setNoteOnTime(note, performance.now());
            if (typeof swaramMap[event.key] !== "undefined") {
                handleNotationAppend(swaramMap[event.key]);
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        const key = event.key;
        if (typeof keyboardMap[key] !== "undefined") {
            const note = keyboardMap[key];
            engine.noteOff(note);

            const startTime = state.getNoteOnTime(note);
            if (startTime) {
                const now = performance.now();
                const swaram = swaramMap[key] || "";
                state.addToSequence({
                    note: note,
                    time: startTime - state.get('sessionStartTime'),
                    duration: now - startTime,
                    swaram: swaram
                });
                state.removeNoteOnTime(note);
            }
        }

        // Swaram Logic (Special keys)
        if (key === "Backspace") {
            state.deleteNotation();
        } else if (key === "Delete") {
            state.clearNotation();
        } else if (key === "Tab") {
            event.preventDefault(); // prevent losing focus
            handleNotationAppend(",");
        }
    });
}
