import { state } from './state.js';

/**
 * ShareService: Manages performance serialization and distribution.
 * Now optimized with Delta-Time encoding for high-fidelity QR scanning.
 */
class ShareService {
    constructor() {
        this.paramName = 'track';
    }

    /**
     * URL-Safe Base64 (Base64URL)
     * Shorter links, cleaner URLs, more scannable QRs.
     */
    toBase64(str) {
        const b64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode('0x' + p1);
        }));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    fromBase64(b64) {
        try {
            let str = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (str.length % 4) str += '=';
            return decodeURIComponent(atob(str).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch(e) { return ""; }
    }

    /**
     * Delta-Time Encoding: Stores timing as relative deltas.
     * note.delta.dur|note.delta.dur...
     * Reduces URL length by up to 50% for long performances.
     */
    encodeSequence(seq) {
        if (!seq || seq.length === 0) return "";
        let encoded = [];
        let lastTime = 0;
        
        // Ensure strictly sorted index time
        const sorted = [...seq].sort((a, b) => a.time - b.time);
        
        for (const e of sorted) {
            const delta = Math.round(e.time - lastTime);
            encoded.push(`${e.note}.${delta}.${Math.round(e.duration)}`);
            lastTime = e.time;
        }
        return encoded.join('|');
    }

    decodeSequence(seqStr) {
        if (!seqStr) return [];
        let decoded = [];
        let currentTime = 0;
        
        try {
            const events = seqStr.split('|');
            for (const s of events) {
                const parts = s.split('.');
                if (parts.length < 3) continue;
                const note = parseInt(parts[0]);
                const delta = parseInt(parts[1]);
                const duration = parseInt(parts[2]);
                
                currentTime += delta;
                decoded.push({ note, time: currentTime, duration });
            }
        } catch (e) {
            console.error("Sequence decode error:", e);
        }
        return decoded;
    }

    encode(song) {
        const compactSeq = this.encodeSequence(song.sequence);
        // Using ~ (tilde) as primary delimiter. Tildes don't appear in Swaram notation.
        const raw = `${song.title}~${song.author || 'Anonymous'}~${song.notation}~${compactSeq}`;
        return this.toBase64(raw);
    }

    decode(base64) {
        try {
            const raw = this.fromBase64(base64);
            const [title, author, notation, seqStr] = raw.split('~');
            const sequence = this.decodeSequence(seqStr);
            return { title, author, notation, sequence };
        } catch (e) {
            console.error("Failed to decode shared track:", e);
            return null;
        }
    }

    getURL(song) {
        const encoded = this.encode(song);
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set(this.paramName, encoded);
        return url.toString();
    }

    initDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const trackBase64 = params.get(this.paramName);
        if (trackBase64) return this.decode(trackBase64);
        return null;
    }

    openSocial(type, song) {
        const url = this.getURL(song);
        const title = song.title || "My Harmonium Jam";
        const author = song.author || "Artist";
        const shareText = `🎹 Listen to "${title}" by ${author} on ViperHarmonics! Play it live here: `;
        const encodedText = encodeURIComponent(shareText);
        
        if (type === 'native' && navigator.share) {
            navigator.share({ title, text: shareText, url }).catch(err => console.log('Share error', err));
            return;
        }

        let target = "";
        switch(type) {
            case 'whatsapp': target = `https://api.whatsapp.com/send?text=${encodedText}${encodeURIComponent(url)}`; break;
            case 'instagram': target = `https://www.instagram.com/`; break;
            case 'facebook': target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break;
            case 'email': target = `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}${encodeURIComponent(url)}`; break;
        }
        if (target) window.open(target, '_blank');
    }
}

export const shareService = new ShareService();
