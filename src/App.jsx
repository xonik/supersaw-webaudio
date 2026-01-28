import React, { useState, useRef, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { SpectrumCanvas } from './components/SpectrumCanvas';
import { useAudioContext } from './hooks/useAudioContext';
import { CanvasHelper } from './utils/canvasHelper';
import {
    sampleRate,
    createScriptSawNode,
    createOscillatorBank,
    createFilter,
    createAnalyzerNode,
    createWavPlayerNode
} from './utils/audioUtils';
import './App.css';

function App() {
    const audioCtx = useAudioContext();

    // State for UI controls
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [analyzerVolume, setAnalyzerVolume] = useState(1);
    const [mix, setMix] = useState(1);
    const [balance, setBalance] = useState(0.5);
    const [sawStates, setSawStates] = useState([true, true, true, true, true, true, true]);
    const [highpassEnabled, setHighpassEnabled] = useState(true);
    const [logScaleX, setLogScaleX] = useState(true);
    const [logScaleY, setLogScaleY] = useState(false);
    const [filterFreqOffset, setFilterFreqOffset] = useState(1);
    const [pitch, setPitch] = useState(0);
    const [lowpassCutoff, setLowpassCutoff] = useState(20000);
    const [detune, setDetune] = useState(0);

    // Refs for audio nodes
    const audioNodesRef = useRef({});
    const canvasHelpersRef = useRef({});

    // Canvas setup callbacks
    const handleCanvas1Ready = useCallback((canvas) => {
        if (!canvasHelpersRef.current.plot1) {
            canvasHelpersRef.current.plot1 = new CanvasHelper(canvas, 150);
        }
    }, []);

    const handleCanvas2Ready = useCallback((canvas) => {
        if (!canvasHelpersRef.current.plot2) {
            canvasHelpersRef.current.plot2 = new CanvasHelper(canvas, 150);
        }
    }, []);

    const handleCanvas3Ready = useCallback((canvas) => {
        if (!canvasHelpersRef.current.plot3) {
            canvasHelpersRef.current.plot3 = new CanvasHelper(canvas, 150);
        }
    }, []);

    // Control handlers
    const handleVolumeChange = useCallback((value) => {
        setVolume(value);
        if (audioNodesRef.current.outputGainNode) {
            audioNodesRef.current.outputGainNode.gain.value = value;
        }
    }, []);

    const handleAnalyzerVolumeChange = useCallback((value) => {
        setAnalyzerVolume(value);
        if (audioNodesRef.current.preAnalyzerGainNode1) {
            audioNodesRef.current.preAnalyzerGainNode1.gain.value = value;
        }
        if (audioNodesRef.current.preAnalyzerGainNode2) {
            audioNodesRef.current.preAnalyzerGainNode2.gain.value = value;
        }
    }, []);

    const handleMixChange = useCallback((value) => {
        setMix(value);
        if (audioNodesRef.current.scriptNode) {
            audioNodesRef.current.scriptNode.setMix(value);
        }
        if (audioNodesRef.current.oscillatorBankNode) {
            audioNodesRef.current.oscillatorBankNode.setMix(value);
        }
    }, []);

    const handleBalanceChange = useCallback((value) => {
        setBalance(value);
        if (audioNodesRef.current.gainNode1) {
            audioNodesRef.current.gainNode1.gain.value = 1 - value;
        }
        if (audioNodesRef.current.gainNode2) {
            audioNodesRef.current.gainNode2.gain.value = value;
        }
    }, []);

    const handleSawToggle = useCallback((index, checked) => {
        setSawStates(prev => {
            const newStates = [...prev];
            newStates[index] = checked;
            return newStates;
        });
        if (audioNodesRef.current.scriptNode) {
            audioNodesRef.current.scriptNode.toggleOn(index, checked);
        }
        if (audioNodesRef.current.oscillatorBankNode) {
            audioNodesRef.current.oscillatorBankNode.toggleOn(index, checked);
        }
    }, []);

    const handleHighpassToggle = useCallback((checked) => {
        setHighpassEnabled(checked);
        if (audioNodesRef.current.hpfNode1) {
            audioNodesRef.current.hpfNode1.toggleOn(checked);
        }
        if (audioNodesRef.current.hpfNode2) {
            audioNodesRef.current.hpfNode2.toggleOn(checked);
        }
    }, []);

    const handleFilterFreqOffsetChange = useCallback((value) => {
        setFilterFreqOffset(value);
        if (audioNodesRef.current.hpfNode1) {
            audioNodesRef.current.hpfNode1.setOffset(value);
        }
        if (audioNodesRef.current.hpfNode2) {
            audioNodesRef.current.hpfNode2.setOffset(value);
        }
    }, []);

    const handlePitchChange = useCallback((value) => {
        setPitch(value);
        const fraction = value / 1200;
        const lowestFreq = 20;
        const highestFreq = 10000;
        const freq = lowestFreq + (highestFreq - lowestFreq) * fraction;

        if (audioNodesRef.current.scriptNode) {
            audioNodesRef.current.scriptNode.setFrequency(freq);
        }
        if (audioNodesRef.current.oscillatorBankNode) {
            audioNodesRef.current.oscillatorBankNode.setFrequency(freq);
        }
        if (audioNodesRef.current.hpfNode1) {
            audioNodesRef.current.hpfNode1.setFrequency(freq);
        }
        if (audioNodesRef.current.hpfNode2) {
            audioNodesRef.current.hpfNode2.setFrequency(freq);
        }
    }, []);

    const handleLowpassCutoffChange = useCallback((value) => {
        setLowpassCutoff(value);
        if (audioNodesRef.current.lpfNode1) {
            audioNodesRef.current.lpfNode1.setFrequency(value);
        }
        if (audioNodesRef.current.lpfNode2) {
            audioNodesRef.current.lpfNode2.setFrequency(value);
        }
    }, []);

    const handleDetuneChange = useCallback((value) => {
        setDetune(value);
        const detuneAmount = value / 128;
        if (audioNodesRef.current.scriptNode) {
            audioNodesRef.current.scriptNode.setDetuneAmount(detuneAmount);
        }
        if (audioNodesRef.current.oscillatorBankNode) {
            audioNodesRef.current.oscillatorBankNode.setDetuneAmount(detuneAmount);
        }
    }, []);

    const handlePlay = useCallback(async () => {
        if (!audioCtx || isPlaying) return;
        setIsPlaying(true);

        const nodes = {};

        // Create all audio nodes
        nodes.scriptNode = createScriptSawNode(audioCtx, sampleRate);
        nodes.hpfNode1 = createFilter(audioCtx, 'highpass', 1, 10);
        nodes.lpfNode1 = createFilter(audioCtx, 'lowpass', 4, 20000);
        nodes.preAnalyzerGainNode1 = audioCtx.createGain();
        nodes.analyserNode1 = createAnalyzerNode(
            audioCtx,
            canvasHelpersRef.current.plot1,
            sampleRate,
            logScaleX,
            logScaleY,
            true
        );
        nodes.gainNode1 = audioCtx.createGain();

        nodes.oscillatorBankNode = createOscillatorBank(audioCtx, 0, 1, 1);
        nodes.hpfNode2 = createFilter(audioCtx, 'highpass', 1, 10);
        nodes.lpfNode2 = createFilter(audioCtx, 'lowpass', 4, 20000);
        nodes.preAnalyzerGainNode2 = audioCtx.createGain();
        nodes.analyserNode2 = createAnalyzerNode(
            audioCtx,
            canvasHelpersRef.current.plot2,
            sampleRate,
            logScaleX,
            logScaleY,
            true
        );
        nodes.gainNode2 = audioCtx.createGain();

        nodes.outputGainNode = audioCtx.createGain();

        // Apply current control values
        nodes.outputGainNode.gain.value = volume;
        nodes.preAnalyzerGainNode1.gain.value = analyzerVolume;
        nodes.preAnalyzerGainNode2.gain.value = analyzerVolume;
        nodes.gainNode1.gain.value = 1 - balance;
        nodes.gainNode2.gain.value = balance;

        // Connect audio graph for script version
        /*
        nodes.scriptNode.connect(nodes.hpfNode1.node);
        nodes.hpfNode1.connect(nodes.lpfNode1.node);
        nodes.lpfNode1.connect(nodes.preAnalyzerGainNode1);
        //nodes.preAnalyzerGainNode1.connect(nodes.analyserNode1);
        nodes.analyserNode1.connect(nodes.gainNode1);
        nodes.gainNode1.connect(nodes.outputGainNode);

        // Connect audio graph for oscillator bank version
        nodes.oscillatorBankNode.connect(nodes.hpfNode2.node);
        nodes.hpfNode2.connect(nodes.lpfNode2.node);
        nodes.lpfNode2.connect(nodes.preAnalyzerGainNode2);
        //nodes.preAnalyzerGainNode2.connect(nodes.analyserNode2);
        nodes.analyserNode2.connect(nodes.gainNode2);
        nodes.gainNode2.connect(nodes.outputGainNode);
        */
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

        // Apply initial settings
        handleDetuneChange(detune);
        handlePitchChange(pitch);
        handleMixChange(mix);
        handleFilterFreqOffsetChange(filterFreqOffset);
        handleLowpassCutoffChange(lowpassCutoff);
        handleHighpassToggle(highpassEnabled);
        sawStates.forEach((checked, i) => {
            if (nodes.scriptNode) nodes.scriptNode.toggleOn(i, checked);
            if (nodes.oscillatorBankNode) nodes.oscillatorBankNode.toggleOn(i, checked);
        });
    }, [
        audioCtx, isPlaying, volume, analyzerVolume, balance, logScaleX, logScaleY,
        detune, pitch, mix, filterFreqOffset, lowpassCutoff, highpassEnabled, sawStates,
        handleDetuneChange, handlePitchChange, handleMixChange,
        handleFilterFreqOffsetChange, handleLowpassCutoffChange, handleHighpassToggle
    ]);

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
                analyzerVolume={analyzerVolume}
                onAnalyzerVolumeChange={handleAnalyzerVolumeChange}
                mix={mix}
                onMixChange={handleMixChange}
                balance={balance}
                onBalanceChange={handleBalanceChange}
                sawStates={sawStates}
                onSawToggle={handleSawToggle}
                highpassEnabled={highpassEnabled}
                onHighpassToggle={handleHighpassToggle}
                logScaleX={logScaleX}
                onLogScaleXToggle={setLogScaleX}
                logScaleY={logScaleY}
                onLogScaleYToggle={setLogScaleY}
                filterFreqOffset={filterFreqOffset}
                onFilterFreqOffsetChange={handleFilterFreqOffsetChange}
                pitch={pitch}
                onPitchChange={handlePitchChange}
                lowpassCutoff={lowpassCutoff}
                onLowpassCutoffChange={handleLowpassCutoffChange}
                detune={detune}
                onDetuneChange={handleDetuneChange}
            />

            <SpectrumCanvas canvasId="plot1" onCanvasReady={handleCanvas1Ready} />
            <SpectrumCanvas canvasId="plot2" onCanvasReady={handleCanvas2Ready} />
            <SpectrumCanvas canvasId="plot3" onCanvasReady={handleCanvas3Ready} />
        </div>
    );
}

export default App;

