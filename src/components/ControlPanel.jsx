import React from 'react';

export function ControlPanel({
    isPlaying,
    onPlay,
    onStop,
    volume,
    onVolumeChange,
    analyzerVolume,
    onAnalyzerVolumeChange,
    mix,
    onMixChange,
    balance,
    onBalanceChange,
    sawStates,
    onSawToggle,
    highpassEnabled,
    onHighpassToggle,
    logScaleX,
    onLogScaleXToggle,
    logScaleY,
    onLogScaleYToggle,
    filterFreqOffset,
    onFilterFreqOffsetChange,
    pitch,
    onPitchChange,
    lowpassCutoff,
    onLowpassCutoffChange,
    detune,
    onDetuneChange
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

                <label htmlFor="analyzerVolume">Analyzer volume: </label>
                <input
                    type="range"
                    id="analyzerVolume"
                    min="0"
                    max="1"
                    step="0.01"
                    value={analyzerVolume}
                    onChange={(e) => onAnalyzerVolumeChange(parseFloat(e.target.value))}
                />

                <label htmlFor="mix">Mix: </label>
                <input
                    type="range"
                    id="mix"
                    min="0"
                    max="1"
                    step="0.01"
                    value={mix}
                    onChange={(e) => onMixChange(parseFloat(e.target.value))}
                />

                <label htmlFor="balance">Algo mix: </label>
                Script - <input
                    type="range"
                    id="balance"
                    min="0"
                    max="1"
                    step="0.01"
                    value={balance}
                    onChange={(e) => onBalanceChange(parseFloat(e.target.value))}
                /> - Native
            </div>

            <div style={{ marginBottom: '10px' }}>
                {sawStates.map((checked, i) => (
                    <label key={i} style={{ marginRight: '10px' }}>
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onSawToggle(i, e.target.checked)}
                        />
                        {' '}Saw {i}
                    </label>
                ))}
                <label>
                    <input
                        type="checkbox"
                        checked={highpassEnabled}
                        onChange={(e) => onHighpassToggle(e.target.checked)}
                    />
                    {' '}High-pass filter
                </label>
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

            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="filterFreqOffset">Filter Freq Offset: </label>
                <input
                    type="range"
                    id="filterFreqOffset"
                    min="0.1"
                    max="1"
                    step="0.009"
                    value={filterFreqOffset}
                    onChange={(e) => onFilterFreqOffsetChange(parseFloat(e.target.value))}
                    style={{ width: '200px' }}
                />

                <label htmlFor="pitch">Pitch: </label>
                <input
                    type="range"
                    id="pitch"
                    min="0"
                    max="1200"
                    value={pitch}
                    onChange={(e) => onPitchChange(parseInt(e.target.value))}
                    style={{ width: '60vw' }}
                />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="lowpassCutoff">Low-pass Cutoff: </label>
                <input
                    type="range"
                    id="lowpassCutoff"
                    min="100"
                    max="20000"
                    step="1"
                    value={lowpassCutoff}
                    onChange={(e) => onLowpassCutoffChange(parseInt(e.target.value))}
                    style={{ width: '200px' }}
                />

                <label htmlFor="detune">Detune: </label>
                <input
                    type="range"
                    id="detune"
                    min="0"
                    max="128"
                    value={detune}
                    onChange={(e) => onDetuneChange(parseInt(e.target.value))}
                    style={{ width: '60vw' }}
                />
            </div>

            <p>Y axis is linear</p>
        </div>
    );
}

