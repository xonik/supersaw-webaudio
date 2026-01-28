
const useAudioInputAsSourceForAnalyzer2and3 = false;

export const sampleRate = 44100;

export const saw = [0, Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
export const detune_table = [0, 318, -318, 1020, -1029, 1760, -1800].map(v => v / 16384);

export function createOscillator(audioCtx, frequency, gain) {
    const oscillatorNode = audioCtx.createOscillator();
    oscillatorNode.type = 'sawtooth';
    oscillatorNode.frequency.value = frequency;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = gain;

    oscillatorNode.connect(gainNode);
    oscillatorNode.start();

    return {oscillatorNode, gainNode};
}

export async function createWavPlayerNode(audioCtx, filename) {
    const response = await fetch(filename);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    let bufferSource = null;

    function start() {
        if (bufferSource) {
            bufferSource.stop();
        }
        bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.loop = true;
        bufferSource.connect(outputNode);
        bufferSource.start();
    }

    function stop() {
        if (bufferSource) {
            bufferSource.stop();
            bufferSource.disconnect();
            bufferSource = null;
        }
    }

    const outputNode = audioCtx.createGain();
    outputNode.gain.value = 1;

    function connect(node) {
        outputNode.connect(node);
    }

    function disconnect() {
        stop();
        outputNode.disconnect();
    }

    return {
        start,
        stop,
        connect,
        disconnect,
        node: outputNode
    };
}

export function createOscillatorBank(audioCtx, initialFrequency, initialDetuneAmount, initialMix) {
    let summingGain = 1 / 7;
    let mix = initialMix;
    let frequency = initialFrequency;
    let detuneAmount = initialDetuneAmount;
    const oscillators = [];
    const gains = [];
    const oscillatorOn = [1, 0, 0, 0, 0, 0, 0];

    const outputNode = audioCtx.createGain();
    outputNode.gain.value = 1;

    for (let i = 0; i < 7; i++) {
        const {oscillatorNode, gainNode} = createOscillator(audioCtx, frequency * (1 + detune_table[i]), 1 / 7);
        oscillators.push(oscillatorNode);
        gains.push(gainNode);
        gainNode.connect(outputNode);
    }

    function updateGain() {
        gains[0].gain.value = summingGain * oscillatorOn[0];
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
        detuneAmount = amount;
        updateFrequency();
    }

    function setFrequency(newFrequency) {
        frequency = newFrequency;
        updateFrequency();
    }

    function setMix(mixAmount) {
        mix = mixAmount;
        updateGain();
    }

    function connect(node) {
        outputNode.connect(node);
    }

    function disconnect() {
        for (let i = 0; i < 7; i++) {
            oscillators[i].stop();
            oscillators[i].disconnect();
            gains[i].disconnect();
        }
    }

    function toggleOn(oscIndex, on) {
        oscillatorOn[oscIndex] = on ? 1 : 0;
        updateGain();
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

export function createScriptSawNode(audioCtx, sampleRate) {
    let detuneAmount = 0;
    let frequency = 0;
    let pitch = 0;
    let oscillatorOn = [true, false, false, false, false, false, false];

    function next() {
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            if (!oscillatorOn[i]) continue;
            let voice_detune = pitch * detune_table[i] * detuneAmount;
            saw[i] += (pitch + voice_detune);

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
        pitch = (frequency / sampleRate) * waveAmplitude;
    }

    function setDetuneAmount(amount) {
        detuneAmount = amount;
        updateFrequency();
    }

    function setFrequency(newFrequency) {
        frequency = newFrequency;
        updateFrequency();
    }

    function setMix(newMix) {
        // Not used in script version
    }

    function connect(node) {
        scriptNode.connect(node);
    }

    function disconnect() {
        scriptNode.disconnect();
        scriptNode = undefined;
    }

    function toggleOn(oscIndex, on) {
        console.log(`Toggling script osc ${oscIndex} to ${on}`);
        oscillatorOn[oscIndex] = on;
    }

    return {
        setDetuneAmount,
        setFrequency,
        connect,
        disconnect,
        setMix,
        toggleOn,
    };
}

export function createFilter(audioCtx, type, poles, initialFrequency) {
    let filters = [];
    let frequency = 20;
    let offset = 1;
    let on = true;
    let offFreq = type === 'highpass' ? 10 : 30000;

    for (let i = 0; i < poles; i++) {
        const filterNode = audioCtx.createBiquadFilter();
        filterNode.type = type;
        filterNode.frequency.value = initialFrequency;
        filters.push(filterNode);
    }

    function updateFrequency() {
        for (let i = 0; i < poles; i++) {
            filters[i].frequency.value = on ? frequency * offset : offFreq;
        }
    }

    function setFrequency(value) {
        frequency = value;
        updateFrequency();
    }

    function setOffset(value) {
        offset = value;
        updateFrequency();
    }

    function connect(otherNode) {
        for (let i = 1; i < poles; i++) {
            filters[i - 1].connect(filters[i]);
        }
        filters[poles - 1].connect(otherNode);
    }

    function disconnect() {
        for (let i = 0; i < poles; i++) {
            filters[i].disconnect();
            filters[i] = undefined;
        }
    }

    function toggleOn(value) {
        on = value;
        updateFrequency();
    }

    return {
        connect,
        disconnect,
        setFrequency,
        setOffset,
        toggleOn,
        node: filters[0]
    };
}

export function freqToX(freq, minFreq, maxFreq, width, isLogScaleX) {
    if (isLogScaleX) {
        const minLog = Math.log10(minFreq);
        const maxLog = Math.log10(maxFreq);
        const freqLog = Math.log10(freq);
        return ((freqLog - minLog) / (maxLog - minLog)) * width;
    } else {
        return ((freq - minFreq) / (maxFreq - minFreq)) * width;
    }
}

export function createAnalyzerNode(audioCtx, canvasHelper, sampleRate, isLogScaleX, isLogScaleY, isPlaying, startFreq = 20, endFreq = sampleRate / 2, fftSize = 2048) {
    const canvas = canvasHelper.canvas;
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = fftSize;
    analyserNode.maxDecibels = -30;

    function drawFrequencyLabels() {
        const numTicks = 10;
        for (let i = 0; i <= numTicks; i++) {
            const freq = startFreq * Math.pow(endFreq / startFreq, i / numTicks);
            const x = freqToX(freq, startFreq, endFreq, canvas.width, isLogScaleX);
            canvasHelper.drawVerticalLines(numTicks, '#888');
            canvasHelper.drawText(Math.round(freq) + ' Hz', x, canvas.height - 13);
        }
    }

    function db2dec(dB){
        return Math.pow(10, dB / 20);
    }

    function drawSpectrum() {
        if (!analyserNode) return;
        canvasHelper.clear();
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
            const freq = i * sampleRate / analyserNode.fftSize;
            if (freq < startFreq || freq > endFreq) continue;
            const x = freqToX(freq, startFreq, endFreq, canvas.width, isLogScaleX);
            const dbFraction = dataArray[i] / 255;
            const minDb = analyserNode.minDecibels;
            const maxDb = analyserNode.maxDecibels;

            const dB = (maxDb - minDb) * dbFraction + minDb;

            const minLin = db2dec(minDb);
            const maxLin = db2dec(maxDb);
            const lin = db2dec(dB);
            const linFraction = (lin - minLin) / (maxLin - minLin);

            let y;
            if (isLogScaleY) {
                y = (1-dbFraction) * canvas.height;
            } else {
                if(useAudioInputAsSourceForAnalyzer2and3){
                    y = (1-linFraction / 0.04) * canvas.height;
                } else {
                    y = (1-linFraction ) * canvas.height;
                }
            }
            canvasHelper.drawSpectrumBar(x, y, 2, canvas.height - y / 2);
        }
        drawFrequencyLabels();
        if (isPlaying) requestAnimationFrame(drawSpectrum);
    }

    drawSpectrum();
    return analyserNode;
}

export async function createInputNode(audioCtx){
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    });

    return audioCtx.createMediaStreamSource(stream);
}

