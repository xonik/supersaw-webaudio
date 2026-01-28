import { useState, useEffect } from 'react';
import { sampleRate } from '../utils/audioUtils';

export function useAudioContext() {
    const [audioCtx, setAudioCtx] = useState(null);

    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
        setAudioCtx(ctx);

        return () => {
            if (ctx) {
                ctx.close();
            }
        };
    }, []);

    return audioCtx;
}

