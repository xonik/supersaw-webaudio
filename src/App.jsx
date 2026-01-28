import React, { useState, useRef, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { SpectrumCanvas } from './components/SpectrumCanvas';
import { useAudioContext } from './hooks/useAudioContext';
import { CanvasHelper } from './utils/canvasHelper';
import {
    sampleRate,
    createOscillatorBank,
    createAnalyzerNode,
    createWavPlayerNode
} from './utils/audioUtils';
import './App.css';

function App() {
    const audioCtx = useAudioContext();

    // State for UI controls
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [logScaleX, setLogScaleX] = useState(true);
    const [logScaleY, setLogScaleY] = useState(false);
    const [plot3StartFreq, setPlot3StartFreq] = useState(20);
    const [plot3EndFreq, setPlot3EndFreq] = useState(sampleRate / 2);
    const [clickCount, setClickCount] = useState(0);
    const [firstClickFreq, setFirstClickFreq] = useState(null);

    // Refs for audio nodes
    const audioNodesRef = useRef({});
    const canvasHelpersRef = useRef({});

    // Canvas setup callbacks
    const handleCanvas2Ready = useCallback((canvas) => {
        if (!canvasHelpersRef.current.plot2) {
            console.log('Initializing plot2 canvas, width:', canvas.width, 'height:', canvas.height);
            canvasHelpersRef.current.plot2 = new CanvasHelper(canvas, 450);
            console.log('Plot2 canvas initialized, width:', canvas.width, 'height:', canvas.height);
        }
    }, []);

    const handleCanvas3Ready = useCallback((canvas) => {
        if (!canvasHelpersRef.current.plot3) {
            console.log('Initializing plot3 canvas, width:', canvas.width, 'height:', canvas.height);
            canvasHelpersRef.current.plot3 = new CanvasHelper(canvas, 450);
            console.log('Plot3 canvas initialized, width:', canvas.width, 'height:', canvas.height);
        }
    }, []);

    // Control handlers
    const handleVolumeChange = useCallback((value) => {
        setVolume(value);
        if (audioNodesRef.current.outputGainNode) {
            audioNodesRef.current.outputGainNode.gain.value = value;
        }
    }, []);

    // Function to convert x position to frequency
    const xToFreq = useCallback((x, canvasWidth, startFreq, endFreq, isLog) => {
        const fraction = x / canvasWidth;
        if (isLog) {
            // Logarithmic scale
            return startFreq * Math.pow(endFreq / startFreq, fraction);
        } else {
            // Linear scale
            return startFreq + (endFreq - startFreq) * fraction;
        }
    }, []);

    // Handle clicks on plot2 canvas
    const handlePlot2Click = useCallback((x, y, canvasWidth, canvasHeight) => {
        const freq = xToFreq(x, canvasWidth, 20, sampleRate / 2, logScaleX);

        if (clickCount === 0) {
            // First click
            setFirstClickFreq(freq);
            setClickCount(1);
            console.log('First click frequency:', freq);
        } else {
            // Second click - set the range
            const startFreq = Math.min(firstClickFreq, freq);
            const endFreq = Math.max(firstClickFreq, freq);
            setPlot3StartFreq(startFreq);
            setPlot3EndFreq(endFreq);
            setClickCount(0);
            setFirstClickFreq(null);
            console.log('First click was:', firstClickFreq, 'Hz');
            console.log('Second click is:', freq, 'Hz');
            console.log('Plot3 frequency range set:', startFreq, 'Hz -', endFreq, 'Hz');

            // Recreate plot3 analyzer with new range if playing
            if (audioNodesRef.current.analyserNode3 && audioNodesRef.current.analyserNode2 && audioNodesRef.current.outputGainNode) {
                // Disconnect old analyzer3
                audioNodesRef.current.analyserNode3.disconnect();

                // Create new analyzer3 with updated range
                audioNodesRef.current.analyserNode3 = createAnalyzerNode(
                    audioCtx,
                    canvasHelpersRef.current.plot3,
                    sampleRate,
                    logScaleX,
                    logScaleY,
                    true,
                    startFreq,
                    endFreq,
                    8192
                );

                // Reconnect the audio chain: analyser2 → analyser3 → outputGainNode
                audioNodesRef.current.analyserNode2.connect(audioNodesRef.current.analyserNode3);
                audioNodesRef.current.analyserNode3.connect(audioNodesRef.current.outputGainNode);
            }
        }
    }, [clickCount, firstClickFreq, logScaleX, logScaleY, audioCtx, xToFreq]);

    const handlePlay = useCallback(async () => {
        if (!audioCtx || isPlaying) return;
        setIsPlaying(true);

        const nodes = {};

        // Create oscillator bank and analyzers
        nodes.oscillatorBankNode = createOscillatorBank(audioCtx, 0, 1, 1);
        nodes.analyserNode2 = createAnalyzerNode(
            audioCtx,
            canvasHelpersRef.current.plot2,
            sampleRate,
            logScaleX,
            logScaleY,
            true
        );
        nodes.analyserNode3 = createAnalyzerNode(
            audioCtx,
            canvasHelpersRef.current.plot3,
            sampleRate,
            logScaleX,
            logScaleY,
            true,
            plot3StartFreq,
            plot3EndFreq,
            8192
        );

        nodes.outputGainNode = audioCtx.createGain();

        // Apply current control values
        nodes.outputGainNode.gain.value = volume;

        // Connect audio graph
        nodes.oscillatorBankNode.connect(nodes.analyserNode2);
        nodes.analyserNode2.connect(nodes.analyserNode3);
        nodes.analyserNode3.connect(nodes.outputGainNode);

        // Load WAV file if available
        try {
            nodes.wavInputNode = await createWavPlayerNode(audioCtx, '/je8086_out.wav');
            nodes.wavInputNode.connect(nodes.analyserNode2);
            nodes.wavInputNode.start();
        } catch (err) {
            console.warn('Could not load WAV file:', err);
        }

        nodes.outputGainNode.connect(audioCtx.destination);

        // Store references
        audioNodesRef.current = nodes;
    }, [audioCtx, isPlaying, volume, logScaleX, logScaleY, plot3StartFreq, plot3EndFreq]);

    const handleStop = useCallback(() => {
        if (!isPlaying) return;
        setIsPlaying(false);

        const nodes = audioNodesRef.current;

        // Stop and disconnect all nodes
        if (nodes.wavInputNode) {
            nodes.wavInputNode.stop();
        }

        Object.values(nodes).forEach(node => {
            if (node && node.disconnect) {
                node.disconnect();
            }
        });

        audioNodesRef.current = {};
    }, [isPlaying]);

    return (
        <div className="App">
            <ControlPanel
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onStop={handleStop}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                logScaleX={logScaleX}
                onLogScaleXToggle={setLogScaleX}
                logScaleY={logScaleY}
                onLogScaleYToggle={setLogScaleY}
            />

            <SpectrumCanvas
                canvasId="plot2"
                onCanvasReady={handleCanvas2Ready}
                onClick={handlePlot2Click}
            />
            <SpectrumCanvas canvasId="plot3" onCanvasReady={handleCanvas3Ready} />
        </div>
    );
}

export default App;

