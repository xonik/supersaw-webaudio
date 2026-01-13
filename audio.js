const sampleRate = 48000; // does not work for 88200, or rather, different pitches from 44100
const audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate});
let isPlaying = false;

const canvas = document.getElementById('plot');
canvas.width = window.innerWidth;
canvas.height = 150;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, canvas.width, canvas.height);


const sawEnabled = Array(7).fill(true);
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

    // This node is just used for mixing
    const outputNode = audioCtx.createGain();
    outputNode.gain.value = 1;

    for (let i = 0; i < 7; i++) {
        const {oscillatorNode, gainNode} = createOscillator(frequency * (1 + detune_table[i]), 1 / 7);
        oscillators.push(oscillatorNode);
        gains.push(gainNode);
        gainNode.connect(outputNode)
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
        gains[0].gain.value = summingGain
        for (let i = 1; i < 7; i++) {
            gains[i].gain.value = summingGain * mixAmount
        }
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


    return {
        connect,
        disconnect,
        setFrequency,
        setDetuneAmount,
        setMix
    };
}

function createScriptSawNode() {

    let detuneAmount = 0;
    let frequency = 0;
    let pitch = 0;

    function next() {
        let sum = 0
        for (let i = 0; i < 7; i++) {
            if (!sawEnabled[i]) continue;
            let voice_detune = pitch * detune_table[i] * detuneAmount;
            saw[i] += (pitch + voice_detune);

            // amplitude is -1 to 1, so wrap around
            if (saw[i] > 1) saw[i] -= 2;

            sum += saw[i];
        }
        return sum;
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

    return {
        setDetuneAmount,
        setFrequency,
        connect,
        disconnect,
        setMix
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

        if (i > 0) {
            filters[i - 1].connect(lowpassNode);
        }
        filters.push(lowpassNode);
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
        filters[0].connect(otherNode)
        for (let i = 1; i < poles; i++) {
            filters[i].connect(filters[i - 1])
        }
    }

    function disconnect() {
        for (let i = 0; i < poles; i++) {
            filters[i].disconnect()
            filters[i] = undefined
        }
    }

    function toggleOn(value){
        on = value;
    }

    return {
        connect,
        disconnect,
        setFrequency,
        setOffset,
        toggleOn,
        node: filters[filters.length - 1]
    }
}


// Add event listeners for checkboxes
for (let i = 0; i < 7; i++) {
    document.getElementById('saw' + i).onchange = function (e) {
        sawEnabled[i] = e.target.checked;
        console.log(`Setting saw ${i} to ${sawEnabled[i]}`)
    };
}

function sliderHandler(id, callback) {
    const slider = document.getElementById(id);
    const subscribers = [];
    slider.oninput = function () {
        const value = parseFloat(this.value);
        callback(value, subscribers)
    };

    return {
        subscribe: (cb) => {
            console.log(`Subscribed to ${id}`, cb)
            subscribers.push(cb);
            callback(slider.value, subscribers)
        },
        unsubscribe: (cb) => {
            const index = subscribers.indexOf(cb);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        }
    }
}


function toggleHandler(id, callback) {
    const toggle = document.getElementById(id);
    const subscribers = [];
    toggle.onchange = function (e) {
        const on = e.target.checked;
        callback(on, subscribers)
    };

    return {
        subscribe: (cb) => {
            subscribers.push(cb);
            callback(toggle.value, subscribers)
        },
        unsubscribe: (cb) => {
            const index = subscribers.indexOf(cb);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        }
    }
}

const volumeSlider = sliderHandler('volume', (value, subscribers) => {
    subscribers.forEach(node => node.gain.value = value)
    console.log(`Setting output volume to ${value}`)
});

const detuneSlider = sliderHandler('detune', (value, subscribers) => {
    const detune = value / 128;
    subscribers.forEach(node => node.setDetuneAmount(detune))
    console.log(`Setting detune to ${detune}`)
});

const pitchSlider = sliderHandler('pitch', (value, subscribers) => {
    const fraction = value / 1200;
    const lowerstFreq = 20;
    const highestFreq = 10000;
    const freq = lowerstFreq + (highestFreq - lowerstFreq) * fraction;
    console.log(`Setting pitch to ${freq}`)

    subscribers.forEach((node) => node.setFrequency(freq))

});

const hpfOffsetSlider = sliderHandler('filterFreqOffset', (value, subscribers) => {
    console.log(`Setting highpass offset to ${value}`)
    subscribers.forEach(node => node.setOffset(value))
})


const highpassToggle = toggleHandler('highpassToggle', (on, subscribers) => {
    console.log(`Setting use highpass filter to ${on}`)
    subscribers.forEach(node => node.toggleOn(on))
});


const lpfSlider = sliderHandler('lowpassCutoff', (value, subscribers) => {
    subscribers.forEach(node => node.setFrequency(value))
    console.log(`Setting lowpass to ${value}Hz`)
})


function freqToX(freq, minFreq, maxFreq, width) {
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    const freqLog = Math.log10(freq);
    return ((freqLog - minLog) / (maxLog - minLog)) * width;
}

function createAnalyzerNode() {
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048; // Higher = more detail
    const bufferLength = analyserNode.frequencyBinCount;

    function drawFrequencyLabels() {
        const numTicks = 10;
        const minFreq = 20;
        const maxFreq = sampleRate / 2;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= numTicks; i++) {
            const freq = minFreq * Math.pow(maxFreq / minFreq, i / numTicks);
            const x = freqToX(freq, minFreq, maxFreq, canvas.width);

            // Draw tick
            ctx.strokeStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - 15);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            // Draw label
            ctx.fillText(Math.round(freq) + ' Hz', x, canvas.height - 13);
        }
    }

    function drawSpectrum() {
        if (!analyserNode) return;

        const bufferLength = analyserNode.frequencyBinCount;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const minFreq = 20;
        const maxFreq = sampleRate / 2;

        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);
        for (let i = 0; i < bufferLength; i++) {
            const freq = i * sampleRate / analyserNode.fftSize;
            if (freq < minFreq) continue;
            const x = freqToX(freq, minFreq, maxFreq, canvas.width);
            const value = dataArray[i];
            const percent = value / 255;
            const height = percent * canvas.height;
            ctx.fillStyle = '#0ff';
            ctx.fillRect(x, canvas.height - height, 2, height);
        }

        drawFrequencyLabels();
        if (isPlaying) requestAnimationFrame(drawSpectrum);
    }

    drawSpectrum();

    return analyserNode
}

document.getElementById('play').onclick = () => {
    console.log(`Play clicked (isPlaying is ${isPlaying}`)
    if (isPlaying) return;
    isPlaying = true;
    console.log('Press play on tape')

    let scriptNode = createScriptSawNode()
    detuneSlider.subscribe(scriptNode)
    pitchSlider.subscribe(scriptNode)

    let hpfNode1 = createFilter('highpass', 1, 10)
    pitchSlider.subscribe(hpfNode1)
    hpfOffsetSlider.subscribe(hpfNode1)
    highpassToggle.subscribe(hpfNode1)

    let lpfNode1 = createFilter('lowpass', 4, 20000)
    lpfSlider.subscribe(lpfNode1)

    let analyserNode1 = createAnalyzerNode()
    let gainNode1 = audioCtx.createGain();

    let oscillatorBankNode = createOscillatorBank(0, 1, 1)
    detuneSlider.subscribe(oscillatorBankNode)
    pitchSlider.subscribe(oscillatorBankNode)

    let hpfNode2 = createFilter('highpass', 1, 10)
    pitchSlider.subscribe(hpfNode2)
    hpfOffsetSlider.subscribe(hpfNode2)
    highpassToggle.subscribe(hpfNode2)

    let lpfNode2 = createFilter('lowpass', 4, 20000)
    lpfSlider.subscribe(lpfNode2)

    let analyserNode2 = createAnalyzerNode()
    let gainNode2 = audioCtx.createGain();

    let outputGainNode = audioCtx.createGain();
    volumeSlider.subscribe(outputGainNode)

    scriptNode.connect(outputGainNode);
    hpfNode1.connect(lpfNode1.node);
    lpfNode1.connect(analyserNode1)
    analyserNode1.connect(gainNode1);
    gainNode1.connect(outputGainNode)
    gainNode1.gain.value = 1
    oscillatorBankNode.connect(hpfNode2.node);
    hpfNode2.connect(lpfNode2.node);
    lpfNode2.connect(analyserNode2)
    analyserNode2.connect(gainNode2);
    gainNode2.connect(outputGainNode)
    outputGainNode.connect(audioCtx.destination);

    document.getElementById('stop').onclick = () => {
        console.log(`Stop pressed, isPlaying is ${isPlaying}`)
        if(!isPlaying) return
        isPlaying = false
        console.log('Stop, look and listen')

        detuneSlider.unsubscribe(scriptNode)
        pitchSlider.unsubscribe(scriptNode)
        pitchSlider.unsubscribe(hpfNode1)
        hpfOffsetSlider.unsubscribe(hpfNode1)
        highpassToggle.unsubscribe(hpfNode1)
        lpfSlider.unsubscribe(lpfNode1)

        detuneSlider.unsubscribe(oscillatorBankNode)
        pitchSlider.unsubscribe(oscillatorBankNode)
        pitchSlider.unsubscribe(hpfNode2)
        hpfOffsetSlider.unsubscribe(hpfNode2)
        highpassToggle.unsubscribe(hpfNode2)

        lpfSlider.unsubscribe(lpfNode2)

        volumeSlider.unsubscribe(outputGainNode)

        scriptNode.disconnect();
        scriptNode = undefined

        hpfNode1.disconnect();
        hpfNode1 = undefined

        lpfNode1.disconnect()
        lpfNode1 = undefined

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

        analyserNode2.disconnect();
        analyserNode2 = undefined

        gainNode2.disconnect()
        gainNode2 = undefined

        outputGainNode.disconnect();
        outputGainNode = undefined

        // TODO: remove onClick-handler.
    };

};