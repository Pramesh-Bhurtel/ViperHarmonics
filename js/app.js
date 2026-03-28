import { engine } from './audio-engine.js';
import { keyboard } from './keyboard.js';
import { initKeyboardListeners, handlePointerDown, handlePointerUp, handlePointerMove, handlePointerCancel } from './input-handler.js';
import { midi } from './midi-handler.js';
import { initControls } from './controls.js';
import { initNotation } from './notation.js';
import { visualizer } from './visualizer.js';
import { state } from './state.js';
import { shareService } from './share.js';
import { player } from './notation-player.js';
import { generateSVG } from './qrcode-generator.js';

/**
 * Main Application Controller
 */
document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const startBtn = document.getElementById('btn-start');
    const mainApp = document.getElementById('main-app');

    keyboard.render();

    startBtn.addEventListener('click', async () => {
        // Switch to loading UI safely
        startBtn.disabled = true;
        startBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Loading...`;
        
        try {
            await engine.init();
            await midi.init();
            
            initControls();
            initNotation();
            
            keyboard.bindEvents(handlePointerDown, handlePointerUp, handlePointerMove, handlePointerCancel);
            initKeyboardListeners();
            visualizer.init();

            // Smooth transition
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                mainApp.classList.add('visible');
                setTimeout(() => visualizer.resize(), 50);
            }, 500);

        } catch(e) {
            console.error(e);
            startBtn.disabled = false;
            startBtn.innerHTML = `Error: Try Again`;
        }
    });

    // Handle deep links (Shared Tracks)
    const arrivalOverlay = document.getElementById('arrival-overlay');
    const arrivalTitle = document.getElementById('arrival-title');
    const arrivalMsg = document.getElementById('arrival-message');
    const arrivalPlayBtn = document.getElementById('btn-arrival-play');

    const initShareLoad = async () => {
        const shared = shareService.initDeepLink();
        if (shared) {
            startBtn.disabled = true;
            try {
                await engine.init();
                await midi.init();
                initControls();
                initNotation();
                keyboard.bindEvents(handlePointerDown, handlePointerUp, handlePointerMove, handlePointerCancel);
                initKeyboardListeners();
                visualizer.init();

                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    mainApp.classList.add('visible');
                    
                    state.clearNotation();
                    state.setSequence(shared.sequence);
                    state.set('authorName', shared.author);
                    state.set('isShared', true);
                    state.appendNotation(shared.notation);

                    const badge = document.getElementById('shared-badge');
                    const authorEl = document.getElementById('shared-author');
                    if (badge && authorEl) {
                        badge.style.display = 'inline-flex';
                        authorEl.textContent = shared.author;
                    }

                    // Show Arrival Modal
                    if (arrivalOverlay && arrivalTitle && arrivalMsg) {
                        arrivalTitle.textContent = shared.title;
                        arrivalMsg.innerHTML = `This beautiful jam was shared by <strong>${shared.author}</strong>. Enjoy the performance!`;
                        arrivalOverlay.classList.add('active');
                    }
                }, 500);
            } catch(e) { console.error(e); }
        }
    };
    initShareLoad();

    arrivalPlayBtn?.addEventListener('click', () => {
        arrivalOverlay.classList.remove('active');
        state.set('isLocked', true);
        player.play(state.get('notation'), null, state.get('recordingSequence'));
    });

    // Share Overlay Logic
    const shareOverlay = document.getElementById('share-overlay');
    const shareUrlInput = document.getElementById('share-url-input');
    const copyShareBtn = document.getElementById('btn-copy-share-url');
    const shareInputTitle = document.getElementById('share-input-title');
    const shareInputAuthor = document.getElementById('share-input-author');
    const shareQrContainer = document.getElementById('share-qr-container');

    let currentSharingSong = null;

    const openShareModal = (song) => {
        currentSharingSong = song;
        if (shareOverlay && shareInputTitle && shareInputAuthor && shareUrlInput) {
            shareInputTitle.value = song.title;
            shareInputAuthor.value = song.author || "Anonymous";
            
            const refreshShareUI = () => {
                currentSharingSong.title = shareInputTitle.value || "My Masterpiece";
                currentSharingSong.author = shareInputAuthor.value || "Anonymous";
                
                const url = shareService.getURL(currentSharingSong);
                shareUrlInput.value = url;
                
                if (shareQrContainer) {
                    const qrSvg = generateSVG(url, { size: 300, padding: 30 });
                    shareQrContainer.innerHTML = qrSvg;
                    const svgEl = shareQrContainer.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.maxWidth = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.borderRadius = '8px';
                        svgEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                    }
                }
            };

            // Remove existing to prevent duplicates
            shareInputTitle.oninput = refreshShareUI;
            shareInputAuthor.oninput = refreshShareUI;

            refreshShareUI();
            shareOverlay.classList.add('active');
        }
    };

    document.getElementById('btn-close-share')?.addEventListener('click', () => {
        shareOverlay.classList.remove('active');
    });

    copyShareBtn?.addEventListener('click', () => {
        if (shareUrlInput) {
            navigator.clipboard.writeText(shareUrlInput.value).then(() => {
                const originalText = copyShareBtn.innerText;
                copyShareBtn.innerText = "Copied!";
                setTimeout(() => copyShareBtn.innerText = originalText, 2000);
            });
        }
    });

    // Social Buttons
    ['native', 'whatsapp', 'instagram', 'facebook', 'email'].forEach(type => {
        const btnId = `share-${type}`;
        const btn = document.getElementById(btnId);
        
        if (type === 'native' && !navigator.share) {
            if (btn) btn.style.display = 'none';
            return;
        }

        btn?.addEventListener('click', () => {
            if (currentSharingSong) shareService.openSocial(type, currentSharingSong);
        });
    });

    // Toggle shortcut overlay
    const overlay = document.getElementById('shortcut-overlay');
    document.getElementById('btn-help')?.addEventListener('click', () => {
        overlay.classList.add('active');
    });
    document.getElementById('btn-close-help')?.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });

    // Info overlay
    const infoOverlay = document.getElementById('info-overlay');
    document.getElementById('btn-info')?.addEventListener('click', () => {
        infoOverlay.classList.add('active');
    });
    document.getElementById('btn-close-info')?.addEventListener('click', () => {
        infoOverlay.classList.remove('active');
    });
    infoOverlay.addEventListener('click', (e) => {
        if (e.target === infoOverlay) infoOverlay.classList.remove('active');
    });

    // Recordings overlay
    const recordingsOverlay = document.getElementById('recordings-overlay');
    const recordingsListEl = document.getElementById('recordings-list');
    
    function renderRecordings() {
        if (!recordingsListEl) return;
        recordingsListEl.innerHTML = '';
        
        let saved = [];
        try {
            const existing = localStorage.getItem('ViperHarmonics.recordings');
            if (existing) saved = JSON.parse(existing);
        } catch(e) {}

        if (saved.length === 0) {
            recordingsListEl.innerHTML = '<p style="text-align:center; padding: 2rem 0; color: var(--text-muted)">You have no saved recordings yet.</p>';
            return;
        }

        saved.forEach((song, index) => {
            const card = document.createElement('div');
            card.className = 'song-card';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            
            const info = document.createElement('div');
            info.innerHTML = `
                <h3>${song.title}</h3>
                <p>${song.author ? 'By ' + song.author + ' • ' : ''}${new Date(song.date).toLocaleDateString()}</p>
            `;

            const actionBtns = document.createElement('div');
            actionBtns.style.display = 'flex';
            actionBtns.style.gap = '0.5rem';

            const shareBtn = document.createElement('button');
            shareBtn.className = 'icon-btn';
            shareBtn.innerHTML = '<i class="fa fa-share-alt"></i>';
            shareBtn.title = "Share Link";
            shareBtn.onclick = (e) => {
                e.stopPropagation();
                openShareModal(song);
            };
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa fa-trash"></i>';
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.color = '#ef4444';
            delBtn.style.cursor = 'pointer';
            delBtn.style.padding = '0.5rem';
            delBtn.style.fontSize = '1.2rem';
            
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card click
                saved.splice(index, 1);
                localStorage.setItem('ViperHarmonics.recordings', JSON.stringify(saved));
                renderRecordings();
            });

            actionBtns.appendChild(shareBtn);
            actionBtns.appendChild(delBtn);
            card.appendChild(info);
            card.appendChild(actionBtns);

            card.addEventListener('click', () => {
                state.clearNotation();
                state.setSequence(song.sequence);
                setTimeout(() => state.appendNotation(song.notation), 10);
                recordingsOverlay.classList.remove('active');
            });
            recordingsListEl.appendChild(card);
        });
    }

    document.getElementById('btn-recordings')?.addEventListener('click', () => {
        renderRecordings();
        recordingsOverlay.classList.add('active');
    });
    document.getElementById('btn-close-recordings')?.addEventListener('click', () => {
        recordingsOverlay.classList.remove('active');
    });
    recordingsOverlay.addEventListener('click', (e) => {
        if (e.target === recordingsOverlay) recordingsOverlay.classList.remove('active');
    });
    
    window.addEventListener('recordings-updated', renderRecordings);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.classList.remove('active');
            infoOverlay.classList.remove('active');
            if (typeof recordingsOverlay !== 'undefined') recordingsOverlay.classList.remove('active');
            if (shareOverlay) shareOverlay.classList.remove('active');
            if (arrivalOverlay) arrivalOverlay.classList.remove('active');
        }
    });

    // Custom Event Listener for sharing from Notation board
    // Custom Event Listener for sharing from Notation board
    window.addEventListener('open-share-modal', (e) => {
        if (e.detail) openShareModal(e.detail);
    });

    state.subscribe('isLocked', (locked) => {
        const svg = document.getElementById('keyboard-container');
        if (svg) {
            svg.style.opacity = locked ? '0.6' : '1';
            svg.style.pointerEvents = locked ? 'none' : 'all';
            svg.style.filter = locked ? 'grayscale(0.5) contrast(0.8)' : 'none';
        }
    });
});
