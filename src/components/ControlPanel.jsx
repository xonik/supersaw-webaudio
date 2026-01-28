import React from 'react';

export function ControlPanel({
    isPlaying,
    onPlay,
    onStop,
    volume,
    onVolumeChange,
    logScaleX,
    onLogScaleXToggle,
    logScaleY,
    onLogScaleYToggle
}) {
    return (
        <div>
            <h1>Web Audio Super Saw Testing</h1>

            <div style={{ marginBottom: '10px' }}>
                <button onClick={onPlay} disabled={isPlaying}>Play</button>
                <button onClick={onStop} disabled={!isPlaying}>Stop</button>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="volume">Master volume: </label>
                <input
                    type="range"
                    id="volume"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label>
                    <input
                        type="checkbox"
                        checked={logScaleX}
                        onChange={(e) => onLogScaleXToggle(e.target.checked)}
                    />
                    {' '}Log X axis
                </label>
                <label style={{ marginLeft: '10px' }}>
                    <input
                        type="checkbox"
                        checked={logScaleY}
                        onChange={(e) => onLogScaleYToggle(e.target.checked)}
                    />
                    {' '}Log Y axis
                </label>
            </div>

            <p>Click twice on plot2 to set zoom range for plot3</p>
        </div>
    );
}

