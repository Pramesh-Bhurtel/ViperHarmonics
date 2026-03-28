import { state } from './state.js';
import { engine } from './audio-engine.js';

class MidiHandler {
    constructor() {
        this.midiAccess = null;
        this.selectedDeviceId = null;
    }

    closeActiveOverlays() {
        const actives = document.querySelectorAll('.overlay.active');
        actives.forEach(a => a.classList.remove('active'));
    }

    async init() {
        try {
            if (navigator.requestMIDIAccess) {
                this.midiAccess = await navigator.requestMIDIAccess();
                this.onMIDISuccess();
                this.midiAccess.onstatechange = () => this.onMIDISuccess(); // Hot-plugging
            } else {
                this.updateUI("Not Supported");
            }
        } catch (err) {
            console.error("MIDI Init Failed:", err);
            this.updateUI("Failed");
        }
    }

    onMIDISuccess() {
        const inputs = Array.from(this.midiAccess.inputs.values());
        
        let devices = [];
        for (const input of inputs) {
            devices.push({ id: input.id, name: `${input.name} ${input.manufacturer ? '('+input.manufacturer+')' : ''}` });
            input.onmidimessage = (msg) => this.getMIDIMessage(msg);
        }

        if (devices.length > 0) {
            if (!this.selectedDeviceId || !devices.find(d => d.id === this.selectedDeviceId)) {
                this.selectedDeviceId = devices[0].id;
            }
            this.updateUI("Connected", devices);
            state.set('midiConnected', true);
        } else {
            this.updateUI("Waiting for device...", []);
            this.selectedDeviceId = null;
            state.set('midiConnected', false);
        }
    }

    getMIDIMessage(message) {
        if (state.get('isLocked')) return;
        if (message.target.id !== this.selectedDeviceId && this.selectedDeviceId !== null) return;
        
        // Auto select if it's the first message and none selected
        if(!this.selectedDeviceId) this.selectedDeviceId = message.target.id;

        const command = message.data[0];
        const note = message.data[1];
        const velocity = (message.data.length > 2) ? message.data[2] : 0;

        switch (command) {
            case 144: // noteOn
                if (velocity > 0) {
                    this.closeActiveOverlays();
                    engine.noteOn(note, velocity);
                } else {
                    engine.noteOff(note); // 0 vel is note off
                }
                break;
            case 128: // noteOff
                engine.noteOff(note);
                break;
            case 176: // control change
                if (note === 7) { // volume pedal/knob usually
                    const volPct = Math.round((100 * velocity) / 127);
                    state.set('volume', volPct);
                }
                break;
        }
    }

    setSelectedDevice(id) {
        this.selectedDeviceId = id;
    }

    updateUI(statusMsg, devices = null) {
        const infoEl = document.getElementById('midiInputDevicesInfo');
        const selectEl = document.getElementById('midiInputDevices');
        
        if (infoEl) {
            infoEl.innerText = `MIDI: ${statusMsg}`;
            if(statusMsg === "Connected") {
                infoEl.classList.add('text-green');
                infoEl.classList.remove('text-red');
            } else {
                infoEl.classList.add('text-red');
                infoEl.classList.remove('text-green');
            }
        }

        if (selectEl && devices !== null) {
            selectEl.innerHTML = '';
            if(devices.length === 0) {
                selectEl.style.display = 'none';
            } else {
                selectEl.style.display = 'block';
                devices.forEach(dev => {
                    const opt = document.createElement('option');
                    opt.value = dev.id;
                    opt.text = dev.name;
                    if (dev.id === this.selectedDeviceId) opt.selected = true;
                    selectEl.appendChild(opt);
                });
                selectEl.onchange = (e) => this.setSelectedDevice(e.target.value);
            }
        }
    }
}

export const midi = new MidiHandler();
