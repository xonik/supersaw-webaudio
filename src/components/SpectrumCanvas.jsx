import React, { useRef, useEffect } from 'react';

export function SpectrumCanvas({ canvasId, onCanvasReady, onClick }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && onCanvasReady) {
            onCanvasReady(canvasRef.current);
        }
    }, [onCanvasReady]);

    const handleClick = (e) => {
        if (onClick && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            onClick(x, y, rect.width, rect.height);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            id={canvasId}
            style={{ display: 'block', width: '100%', height: '450px', cursor: onClick ? 'crosshair' : 'default' }}
            onClick={handleClick}
        />
    );
}

