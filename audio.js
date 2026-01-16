const sampleRate = 48000; // does not work for 88200, or rather, different pitches from 44100
const audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate});
let isPlaying = false;
let isLogScaleX = true;
let isLogScaleY = false;

const createPlotCanvas = (id) => {
    const canvas = document.getElementById(id);
    canvas.width = window.innerWidth;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return {canvas, ctx};
}

const {canvas: canvasPlot1, ctx: ctxPlot1} = createPlotCanvas('plot1');
const {canvas: canvasPlot2, ctx: ctxPlot2} = createPlotCanvas('plot2');
const {canvas: canvasPlot3, ctx: ctxPlot3} = createPlotCanvas('plot3');

const saw = [0, Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
const detune_table = [0, 318, -318, 1020, -1029, 1760, -1800].map(v => v / 16384); // divide by 16384 to get approx the same as above

function createOscillator(frequency, gain) {
    const oscillatorNode = audioCtx.createOscillator();
    oscillatorNode.type = 'sawtooth';
    oscillatorNode.frequency.value = frequency; // Set frequency based on index or other logic

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = gain; // Set gain based on index or other logic

    oscillatorNode.connect(gainNode);
    oscillatorNode.start();

    return {oscillatorNode, gainNode};
}

function createOscillatorBank(initialFrequency, initialDetuneAmount, initialMix) {
    let summingGain = 1 / 7;
    let mix = initialMix;
    let frequency = initialFrequency;
    let detuneAmount = initialDetuneAmount;
    const oscillators = [];
    const gains = [];
    const oscillatorOn = [1, 0, 0, 0, 0, 0, 0]

    // This node is just used for mixing
    const outputNode = audioCtx.createGain();
    outputNode.gain.value = 1;

    for (let i = 0; i < 7; i++) {
        const {oscillatorNode, gainNode} = createOscillator(frequency * (1 + detune_table[i]), 1 / 7);
        oscillators.push(oscillatorNode);
        gains.push(gainNode);
        gainNode.connect(outputNode)
    }

    function updateGain() {
        gains[0].gain.value = summingGain * oscillatorOn[0]
        for(let i = 1; i < 7; i++) {
            gains[i].gain.value = summingGain * mix * oscillatorOn[i];
        }
    }

    function updateFrequency() {
        for (let i = 0; i < 7; i++) {
            oscillators[i].frequency.value = frequency * (1 + detune_table[i] * detuneAmount);
        }
    }

    function setDetuneAmount(amount) {
        detuneAmount = amount
        updateFrequency()
    }

    function setFrequency(newFrequency) {
        frequency = newFrequency
        updateFrequency()
    }

    function setMix(mixAmount) {
        mix = mixAmount
        updateGain()
    }

    function connect(node) {
        outputNode.connect(node)
    }

    function disconnect() {
        for (let i = 1; i < 7; i++) {
            oscillators[i].stop()
            oscillators[i].disconnect()
            oscillators[i] = undefined
            gains[i].disconnect()
            gains[i] = undefined
        }
    }

    function toggleOn(oscIndex, on) {
        oscillatorOn[oscIndex] = on ? 1 : 0
        updateGain()
    }

    return {
        connect,
        disconnect,
        setFrequency,
        setDetuneAmount,
        setMix,
        toggleOn,
    };
}

function createScriptSawNode() {

    let detuneAmount = 0;
    let frequency = 0;
    let pitch = 0;
    let oscillatorOn = [true, false, false, false, false, false, false,]

    function next() {
        let sum = 0
        for (let i = 0; i < 7; i++) {
            if (!oscillatorOn[i]) continue;
            let voice_detune = pitch * detune_table[i] * detuneAmount;
            saw[i] += (pitch + voice_detune);

            // amplitude is -1 to 1, so wrap around
            if (saw[i] > 1) saw[i] -= 2;

            sum += saw[i];
        }
        return sum / 7;
    }

    let scriptNode = audioCtx.createScriptProcessor(1024, 0, 1);
    scriptNode.onaudioprocess = function (e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
            output[i] = next();
        }
    };

    function updateFrequency() {
        const waveAmplitude = 2;
        //20 hz: 2 skal dekkes på 88200/ 20 samples.
        // ( 88200 / 20 ) * x = 2  => x = 2 * 20 / 88200 = 0.00045351473922902497
        pitch = (frequency / sampleRate) * waveAmplitude;
    }

    function setDetuneAmount(amount) {
        detuneAmount = amount
        updateFrequency()
    }

    function setFrequency(newFrequency) {
        frequency = newFrequency
        updateFrequency()
    }

    function setMix(newMix) {

    }

    function connect(node) {
        scriptNode.connect(node)
    }

    function disconnect() {
        scriptNode.disconnect()
        scriptNode = undefined
    }

    function toggleOn(oscIndex, on) {
        console.log(`Toggling script osc ${oscIndex} to ${on}`)
        oscillatorOn[oscIndex] = on
    }

    return {
        setDetuneAmount,
        setFrequency,
        connect,
        disconnect,
        setMix,
        toggleOn,
    }
}


function createFilter(type, poles, initialFrequency) {
    let filters = [];

    let frequency = 20;
    let offset = 1;
    let on = true
    let offFreq = type === 'highpass' ? 10 : 30000

    for (let i = 0; i < poles; i++) {
        const lowpassNode = audioCtx.createBiquadFilter();
        lowpassNode.type = type;
        lowpassNode.frequency.value = initialFrequency;
        filters.push(lowpassNode)
    }

    function updateFrequency() {
        for (let i = 0; i < poles; i++) {
            filters[i].frequency.value = on ? frequency * offset : offFreq;
        }
    }

    function setFrequency(value) {
        frequency = value
        updateFrequency()
    }

    function setOffset(value) {
        offset = value
        updateFrequency()
    }

    function connect(otherNode) {
        for (let i = 1; i < poles; i++) {
            filters[i - 1].connect(filters[i])
        }
        filters[poles - 1].connect(otherNode)
    }

    function disconnect() {
        for (let i = 0; i < poles; i++) {
            filters[i].disconnect()
            filters[i] = undefined
        }
    }

    function toggleOn(value) {
        on = value;
    }

    return {
        connect,
        disconnect,
        setFrequency,
        setOffset,
        toggleOn,
        node: filters[0]
    }
}

// Update freqToX to support both scales
function freqToX(freq, minFreq, maxFreq, width) {
    if (isLogScaleX) {
        const minLog = Math.log10(minFreq);
        const maxLog = Math.log10(maxFreq);
        const freqLog = Math.log10(freq);
        return ((freqLog - minLog) / (maxLog - minLog)) * width;
    } else {
        return ((freq - minFreq) / (maxFreq - minFreq)) * width;
    }
}

function createAnalyzerNode(canvas, ctx, startFreq = 20, endFreq = sampleRate / 2, fftSize = 2048) {
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = fftSize;
    analyserNode.maxDecibels = -30;

    function drawFrequencyLabels() {
        const numTicks = 10;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= numTicks; i++) {
            const freq = startFreq * Math.pow(endFreq / startFreq, i / numTicks);
            const x = freqToX(freq, startFreq, endFreq, canvas.width);
            ctx.strokeStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - 15);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
            ctx.fillText(Math.round(freq) + ' Hz', x, canvas.height - 13);
        }
    }

    function db2dec(dB){
        return Math.pow(10, dB / 20);
    }

    let repeat = 0;
// Update drawSpectrum in createAnalyzerNode:
    function drawSpectrum() {
        if (!analyserNode) return;
        const bufferLength = analyserNode.frequencyBinCount;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        let min = Infinity;
        let max = -Infinity;

        for (let i = 0; i < bufferLength; i++) {
            const freq = i * sampleRate / analyserNode.fftSize;
            if (freq < startFreq || freq > endFreq) continue;
            const x = freqToX(freq, startFreq, endFreq, canvas.width);
            // Convert value (0-255) to dB
            const dbFraction = dataArray[i] / 255
            const minDb = analyserNode.minDecibels
            const maxDb = analyserNode.maxDecibels

            const dB = (maxDb - minDb) * dbFraction + minDb

            const minLin = db2dec(minDb);
            const maxLin = db2dec(maxDb);
            const lin = db2dec(dB);
            const linFraction = (lin - minLin) / (maxLin - minLin);

            if(linFraction < min) min = linFraction;
            if(linFraction > max) max = linFraction;

            let y;
            if (isLogScaleY) {
                y = (1-dbFraction) * canvas.height;
            } else {
                y = (1-linFraction) * canvas.height;
            }
            ctx.fillStyle = '#0ff';
            ctx.fillRect(x, y, 2, canvas.height - y / 2);
            console.log(minDb, maxDb);
        }
        console.log(`Spectrum min lin ${repeat++}:`, min, 'max lin:', max);
        drawFrequencyLabels();
        if (isPlaying) requestAnimationFrame(drawSpectrum);
    }

    drawSpectrum();
    return analyserNode;
}

let freqSelectClicks = [];
let selectedStartFreq = 20;
let selectedEndFreq = sampleRate / 2;

const createZoomerAnalyzerBetween = (nodeBefore, nodeAfter) => {

    let zoomerAnalyserNode
    canvasPlot2.addEventListener('click', function (e) {
        const rect = canvasPlot1.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const minFreq = 20;
        const maxFreq = sampleRate / 2;
        let freq;
        if (isLogScaleX) {
            freq = Math.pow(10, (x / canvasPlot1.width) * (Math.log10(maxFreq) - Math.log10(minFreq)) + Math.log10(minFreq));
        } else {
            freq = minFreq + (x / canvasPlot1.width) * (maxFreq - minFreq);
        }
        freqSelectClicks.push(freq);
        console.log('Selected frequency:', freq);
        if (freqSelectClicks.length === 2) {
            selectedStartFreq = Math.min(freqSelectClicks[0], freqSelectClicks[1]);
            selectedEndFreq = Math.max(freqSelectClicks[0], freqSelectClicks[1]);
            freqSelectClicks = [];
            // Create or update the third analyser node
            if (zoomerAnalyserNode) {
                zoomerAnalyserNode.disconnect();
            }
            zoomerAnalyserNode = createAnalyzerNode(canvasPlot3, ctxPlot3, selectedStartFreq, selectedEndFreq, 16384);
            nodeBefore.connect(zoomerAnalyserNode);
            zoomerAnalyserNode.connect(nodeAfter)
        }
    });
    return {
        disconnect: () => {
            if (zoomerAnalyserNode) {
                zoomerAnalyserNode.disconnect();
                zoomerAnalyserNode = undefined
            }
        }
    }
}

document.getElementById('play').onclick = () => {
    console.log(`Play clicked (isPlaying is ${isPlaying}`)
    if (isPlaying) return;
    isPlaying = true;
    console.log('Press play on tape')

    let scriptNode = createScriptSawNode()
    detuneSlider.subscribe(scriptNode)
    pitchSlider.subscribe(scriptNode)
    sawsToggler.subscribe(scriptNode)
    mixSlider.subscribe(scriptNode)

    let hpfNode1 = createFilter('highpass', 1, 10)
    pitchSlider.subscribe(hpfNode1)
    hpfOffsetSlider.subscribe(hpfNode1)
    highpassToggle.subscribe(hpfNode1)

    let lpfNode1 = createFilter('lowpass', 4, 20000)
    lpfSlider.subscribe(lpfNode1)

    let preAnalyzerGainNode1 = audioCtx.createGain();
    analyzerVolumeSlider.subscribe(preAnalyzerGainNode1)

    let analyserNode1 = createAnalyzerNode(canvasPlot1, ctxPlot1)
    let gainNode1 = audioCtx.createGain();

    let oscillatorBankNode = createOscillatorBank(0, 1, 1)
    detuneSlider.subscribe(oscillatorBankNode)
    pitchSlider.subscribe(oscillatorBankNode)
    sawsToggler.subscribe(oscillatorBankNode)
    mixSlider.subscribe(oscillatorBankNode)

    let hpfNode2 = createFilter('highpass', 1, 10)
    pitchSlider.subscribe(hpfNode2)
    hpfOffsetSlider.subscribe(hpfNode2)
    highpassToggle.subscribe(hpfNode2)

    let lpfNode2 = createFilter('lowpass', 4, 20000)
    lpfSlider.subscribe(lpfNode2)

    let preAnalyzerGainNode2 = audioCtx.createGain();
    analyzerVolumeSlider.subscribe(preAnalyzerGainNode2)

    let analyserNode2 = createAnalyzerNode(canvasPlot2, ctxPlot2)
    let gainNode2 = audioCtx.createGain();

    let outputGainNode = audioCtx.createGain();
    volumeSlider.subscribe(outputGainNode)

    balanceSlider.subscribe(gainNode1)

    balanceSlider.subscribe(gainNode2)

    scriptNode.connect(hpfNode1.node);
    hpfNode1.connect(lpfNode1.node);
    lpfNode1.connect(preAnalyzerGainNode1)
    preAnalyzerGainNode1.connect(analyserNode1)
    analyserNode1.connect(gainNode1);
    gainNode1.connect(outputGainNode)

    oscillatorBankNode.connect(hpfNode2.node);
    hpfNode2.connect(lpfNode2.node);
    lpfNode2.connect(preAnalyzerGainNode2)
    preAnalyzerGainNode2.connect(analyserNode2)
    gainNode2.connect(outputGainNode)
    let analyzerNode3 = createZoomerAnalyzerBetween(analyserNode2, gainNode2)

    outputGainNode.connect(audioCtx.destination);

    document.getElementById('stop').onclick = () => {
        console.log(`Stop pressed, isPlaying is ${isPlaying}`)
        if (!isPlaying) return
        isPlaying = false
        console.log('Stop, look and listen')

        sawsToggler.unsubscribe(scriptNode)
        detuneSlider.unsubscribe(scriptNode)
        pitchSlider.unsubscribe(scriptNode)
        mixSlider.unsubscribe(scriptNode)
        pitchSlider.unsubscribe(hpfNode1)
        hpfOffsetSlider.unsubscribe(hpfNode1)
        highpassToggle.unsubscribe(hpfNode1)
        lpfSlider.unsubscribe(lpfNode1)
        analyzerVolumeSlider.unsubscribe(preAnalyzerGainNode1)

        sawsToggler.unsubscribe(oscillatorBankNode)
        detuneSlider.unsubscribe(oscillatorBankNode)
        pitchSlider.unsubscribe(oscillatorBankNode)
        mixSlider.unsubscribe(oscillatorBankNode)
        pitchSlider.unsubscribe(hpfNode2)
        hpfOffsetSlider.unsubscribe(hpfNode2)
        highpassToggle.unsubscribe(hpfNode2)
        lpfSlider.unsubscribe(lpfNode2)
        analyzerVolumeSlider.unsubscribe(preAnalyzerGainNode2)

        balanceSlider.unsubscribe(gainNode1)
        balanceSlider.unsubscribe(gainNode2)
        volumeSlider.unsubscribe(outputGainNode)

        scriptNode.disconnect();
        scriptNode = undefined

        hpfNode1.disconnect();
        hpfNode1 = undefined

        lpfNode1.disconnect()
        lpfNode1 = undefined

        preAnalyzerGainNode1.disconnect()
        preAnalyzerGainNode1 = undefined

        analyserNode1.disconnect();
        analyserNode1 = undefined

        gainNode1.disconnect()
        gainNode1 = undefined

        oscillatorBankNode.disconnect();
        oscillatorBankNode = undefined

        hpfNode2.disconnect();
        hpfNode2 = undefined

        lpfNode2.disconnect()
        lpfNode2 = undefined

        preAnalyzerGainNode2.disconnect()
        preAnalyzerGainNode2 = undefined

        analyserNode2.disconnect();
        analyserNode2 = undefined

        gainNode2.disconnect()
        gainNode2 = undefined

        outputGainNode.disconnect();
        outputGainNode = undefined

        analyzerNode3.disconnect();
        analyzerNode3 = undefined

        // TODO: remove onClick-handler.
    };

};