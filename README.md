# ViperHarmonics

A premium, web-based harmonium simulator supporting computer keyboard mapping, true multi-touch mobile interaction, and MIDI controller input. Built for professional performance and authentic sound.

## 🌟 Expert Features

-   **🎨 Premium Fluid Design**: Expert mobile-first architecture using CSS Grid and Flexbox. Scales perfectly from 320px to 4K.
-   **🔊 Mechanical Realism**: Synthesized wooden key-click transients and organic micro-detuning (0-5 cents) for a living instrument feel.
-   **⏺️ High-Fidelity Recording**: Captures exact MIDI note IDs, timestamps, and durations with sub-millisecond precision. 
-   **🔗 Social Delta-Time Sharing**: Share your performances instantly via high-compression URL links. Uses Delta-Time encoding to ensure short URLs and scannable QR codes.
-   **🛡️ Content Protection**: Shared tracks arrive in a "Read-Only" mode. Listeners can "Save a Copy" to their own library to enable remixing and editing.
-   **🎼 Live Notation**: Real-time Swaram rendering with an integrated Artist/Author attribution system.
-   **🔌 WebMIDI API**: Pro-grade connectivity for external hardware controllers with velocity support.
-   **🌙 Ambience Engine**: Parallel convolution reverb for authentic acoustic placement.

## 🚀 Quick Start

Due to browser security restrictions on the Web Audio API, this project must be run through a local web server to load audio assets correctly.

1. Clone or download the repository.
2. Ensure the `assets/sounds/` directory contains:
   - `harmonium-kannan-orig.wav`
   - `reverb.wav`
3. Serve the directory:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node
   npx serve .
   ```
4. Open `http://localhost:8000/index.html`

## ⌨️ Performance Controls

-   **White Keys**: `` ` Q W E R T Y U I O P [ ] \ ``
-   **Black Keys**: ` 1 2 4 5 7 8 9 - = `
-   **Volume**: Use the sidebar slider to adjust the master output level.

### 📝 Notation & Playback
-   **Backspace**: Delete last note.
-   **Delete**: Clear all.
-   **Tab**: Insert comma (pause).
-   **Replay**: Plays back your exact performance timing (not just the text).

## 🛠️ Performance Architecture

ViperHarmonics uses a modern, build-less ES6 architecture:

-   **`state.js`**: Reactive PubSub store for all UI and engine parameters.
-   **`audio-engine.js`**: Manages the Web Audio graph including convolution reverb and sample playback.
-   **`share.js`**: Handles Delta-Time compression of performance sequences for ultra-portable URL sharing.
-   **`input-handler.js`**: Unified event gateway for transparent cross-platform (Touch/Pointer/MIDI) input.

---
*Developed by [Pramesh Bhurtel](https://www.prameshbhurtel.com.np/). Enhanced in 2026 for high-fidelity audio and social collaboration.*
