import { state } from './state.js';
import { playSound } from './sound-effects.js';
import { player } from './notation-player.js';

export function initNotation() {
    const display = document.getElementById('notation-display');
    const clearBtn = document.getElementById('btn-clear-notation');
    const copyBtn = document.getElementById('btn-copy-notation');
    const playBtn = document.getElementById('btn-play-notation');
    const editBtn = document.getElementById('btn-edit-notation');
    const saveBtn = document.getElementById('btn-save-notation');
    const shareBtnMain = document.getElementById('btn-share-notation');
    
    const sharedBadge = document.getElementById('shared-badge');
    const sharedAuthor = document.getElementById('shared-author');

    let isUpdatingProgrammatically = false;

    state.subscribe('notation', (val) => {
        if(display && display.value !== val) {
            isUpdatingProgrammatically = true;
            display.value = val;
            display.scrollTop = display.scrollHeight; // Auto scroll
            isUpdatingProgrammatically = false;
        }
    });

    state.subscribe('isShared', (shared) => {
        if (shared) {
            display?.setAttribute('readonly', 'true');
            if (editBtn) {
                editBtn.innerHTML = '<i class="fa fa-lock"></i> Locked';
                editBtn.style.opacity = '0.5';
                editBtn.style.pointerEvents = 'none';
            }
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fa fa-copy"></i> Save a Copy';
                saveBtn.classList.add('pulse-once'); // subtle hint
            }
        } else {
            if (editBtn) {
                editBtn.style.opacity = '1';
                editBtn.style.pointerEvents = 'all';
                editBtn.innerHTML = '<i class="fa fa-pencil"></i> Edit';
            }
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fa fa-save"></i> Save';
            }
        }
    });

    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            state.clearNotation();
            if (sharedBadge) sharedBadge.style.display = 'none';
            playSound('tick');
        });
    }

    if(copyBtn) {
        copyBtn.addEventListener('click', () => {
            const txt = state.get('notation');
            if(txt) {
                navigator.clipboard.writeText(txt).then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = "<i class='fa fa-check'></i> Copied!";
                    playSound('tick');
                    setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
                });
            }
        });
    }

    if(playBtn) {
        playBtn.addEventListener('click', () => {
            if (player.isPlaying) {
                player.stop((start, end) => setHighlight(start, end));
                playBtn.innerHTML = '<i class="fa fa-play"></i> Replay';
                playBtn.classList.remove('active-play');
                playSound('tick');
            } else {
                const txt = state.get('notation');
                const sequence = state.get('recordingSequence');
                
                if (txt.trim().length > 0 || (sequence && sequence.length > 0)) {
                    playBtn.innerHTML = '<i class="fa fa-square"></i> Stop';
                    playBtn.classList.add('active-play');
                    playSound('tick');
                    
                    player.play(txt, (start, end, playing) => {
                        if (!playing) {
                            playBtn.innerHTML = '<i class="fa fa-play"></i> Replay';
                            playBtn.classList.remove('active-play');
                            setHighlight(0, 0);
                        } else {
                            if (start !== 0 || end !== 0) {
                                setHighlight(start, end);
                            }
                        }
                    }, sequence);
                }
            }
        });
    }

    if(editBtn && display) {
        editBtn.addEventListener('click', () => {
            if (display.hasAttribute('readonly')) {
                // Warning if there's a sequence that might be lost
                const seq = state.get('recordingSequence');
                if (seq && seq.length > 0) {
                    if (!confirm("Manual editing will convert your current recording to standard playback format. High-fidelity timing will be lost. Proceed?")) {
                        return;
                    }
                    // Clear sequence if editing manually to prevent mismatch
                    state.setSequence([]);
                }

                display.removeAttribute('readonly');
                editBtn.innerHTML = '<i class="fa fa-check"></i> Done';
                editBtn.classList.add('active-play');
                display.focus();
                playSound('tick');
            } else {
                display.setAttribute('readonly', 'true');
                editBtn.innerHTML = '<i class="fa fa-pencil"></i> Edit';
                editBtn.classList.remove('active-play');
                playSound('tick');
            }
        });
    }

    if(saveBtn) {
        saveBtn.addEventListener('click', () => {
            const txt = state.get('notation').trim();
            const seq = state.get('recordingSequence');
            
            if (txt.length === 0 && (!seq || seq.length === 0)) return;
            
            let name = prompt("Enter a name for this jam:", "Recording " + new Date().toLocaleTimeString());
            if (name) {
                let author = prompt("Enter your name (Artist/Author):", state.get('authorName') || "");
                if (author !== null) {
                    state.set('authorName', author);
                }

                let saved = [];
                try {
                    const existing = localStorage.getItem('ViperHarmonics.recordings');
                    if (existing) saved = JSON.parse(existing);
                } catch(e) {}
                
                saved.unshift({ 
                    title: name, 
                    author: author || "Anonymous",
                    notation: txt, 
                    sequence: seq,
                    date: new Date().toISOString() 
                });
                localStorage.setItem('ViperHarmonics.recordings', JSON.stringify(saved));
                
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = "<i class='fa fa-check'></i> Saved!";
                playSound('tick');
                
                // If it was a shared track, unlock it now
                if (state.get('isShared')) {
                    state.set('isShared', false);
                    state.set('isLocked', false);
                    if (sharedBadge) sharedBadge.style.display = 'none';
                }

                window.dispatchEvent(new Event('recordings-updated'));
                setTimeout(() => { saveBtn.innerHTML = originalText; }, 2000);
            }
        });
    }

    if (shareBtnMain) {
        shareBtnMain.addEventListener('click', () => {
            const txt = state.get('notation').trim();
            const seq = state.get('recordingSequence');
            
            if (txt.length === 0 && (!seq || seq.length === 0)) return;

            const song = {
                title: "My Masterpiece",
                author: state.get('authorName') || "Anonymous",
                notation: txt,
                sequence: seq
            };
            window.dispatchEvent(new CustomEvent('open-share-modal', { detail: song }));
        });
    }

    function setHighlight(start, end) {
        if (!display) return;
        display.focus();
        display.setSelectionRange(start, end);
    }

    if(display) {
        display.value = state.get('notation');
        
        display.addEventListener('input', (e) => {
            if (!isUpdatingProgrammatically) {
                state.setNotation(e.target.value);
            }
        });
    }
}
