import React, { useRef, useEffect } from 'react';

export function SpectrumCanvas({ canvasId, onCanvasReady }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && onCanvasReady) {
            onCanvasReady(canvasRef.current);
        }
    }, [onCanvasReady]);

    return (
        <canvas
            ref={canvasRef}
            id={canvasId}
            style={{ display: 'block', width: '100%' }}
        />
    );
}

