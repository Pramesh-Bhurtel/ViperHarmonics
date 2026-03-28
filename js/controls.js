import { state } from './state.js';
import { playSound } from './sound-effects.js';

export function initControls() {
    const volumeSlider = document.getElementById('volume-slider');
    const volumeLabel = document.getElementById('volume-label');
    const reverbSwitch = document.getElementById('reverb-switch');
    const transposeVal = document.getElementById('transpose-val');
    const rootNoteLabel = document.getElementById('root-note-label');
    const octaveVal = document.getElementById('octave-val');
    const stackVal = document.getElementById('stack-val');

    const baseKeyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    function updateRootNote(semitone) {
        if (!rootNoteLabel) return;
        const normalized = (semitone >= 0) ? semitone % 12 : (semitone % 12 + 12) % 12;
        rootNoteLabel.innerText = " - " + baseKeyNames[normalized];
    }

    state.subscribe('volume', (val) => {
        if(volumeSlider) volumeSlider.value = val;
        if(volumeLabel) volumeLabel.innerText = `${val}%`;
    });

    state.subscribe('useReverb', (val) => {
        if(reverbSwitch) reverbSwitch.checked = val;
    });

    state.subscribe('transpose', (val) => {
        if(transposeVal) transposeVal.innerText = val > 0 ? `+${val}` : val;
        updateRootNote(val);
    });

    state.subscribe('octave', (val) => {
        if(octaveVal) octaveVal.innerText = val;
    });

    state.subscribe('stackCount', (val) => {
        if(stackVal) stackVal.innerText = val;
    });

    if(volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            state.set('volume', parseInt(e.target.value));
        });
        volumeSlider.addEventListener('change', (e) => {
            e.target.blur();
        });
    }

    if(reverbSwitch) {
        reverbSwitch.addEventListener('change', (e) => {
            state.set('useReverb', e.target.checked);
            playSound('switch');
            e.target.blur();
        });
    }

    function setupBtnControls(minusId, plusId, min, max, stateKey, cb = null) {
        const minusBtn = document.getElementById(minusId);
        const plusBtn = document.getElementById(plusId);

        if(minusBtn) minusBtn.addEventListener('click', (e) => {
            let current = state.get(stateKey);
            if(current > min) {
                state.set(stateKey, current - 1);
                playSound('tick');
                if(cb) cb(current - 1);
                if(e.currentTarget) e.currentTarget.blur();
            }
        });

        if(plusBtn) plusBtn.addEventListener('click', (e) => {
            let current = state.get(stateKey);
            const newVal = current + 1;
            const effective = Math.min(newVal, max);
            if(effective !== current) {
                state.set(stateKey, effective);
                playSound('tick');
                if(cb) cb(effective);
                if(e.currentTarget) e.currentTarget.blur();
            }
        });
    }

    setupBtnControls('btn-trans-down', 'btn-trans-up', -11, 11, 'transpose');
    setupBtnControls('btn-oct-down', 'btn-oct-up', 0, 6, 'octave');
    setupBtnControls('btn-stack-down', 'btn-stack-up', 0, 6, 'stackCount', (newVal) => {
        const maxAllowed = 6 - state.get('octave');
        if (newVal > maxAllowed) {
            state.set('stackCount', maxAllowed);
            playSound('error');
        }
    });

    state.subscribe('octave', (newOctave) => {
        const currentStack = state.get('stackCount');
        if (newOctave + currentStack > 6) {
            state.set('stackCount', 6 - newOctave);
        }
    });

    // Populate initial
    if(volumeSlider) volumeSlider.value = state.get('volume');
    if(volumeLabel) volumeLabel.innerText = `${state.get('volume')}%`;
    if(reverbSwitch) reverbSwitch.checked = state.get('useReverb');
    if(transposeVal) transposeVal.innerText = state.get('transpose');
    if(octaveVal) octaveVal.innerText = state.get('octave');
    if(stackVal) stackVal.innerText = state.get('stackCount');
    updateRootNote(state.get('transpose'));
}
