const sampleRate = 48000; // does not work for 88200, or rather, different pitches from 44100
const audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate});


const canvas = document.getElementById('plot');
canvas.width = window.innerWidth;
canvas.height = 150;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, canvas.width, canvas.height);

let isPlaying = false;
let isHighpassOn = true;

// TODO init in a single method, iterate over inputs
// to set correct values.

const scriptNode = createScriptSawNode()
const hpfNode1 = createFilter('highpass', 1, 10)
const lpfNode1 = createFilter('lowpass', 4, 20000)
const analyserNode1 = createAnalyzerNode()
const gainNode1 = audioCtx.createGain();

const oscillatorBankNode = createOscillatorBank(0, 1, 1)
const hpfNode2 = createFilter('highpass', 1, 10)
const lpfNode2 = createFilter('lowpass', 4, 20000)
const analyserNode2 = createAnalyzerNode()
const gainNode2 = audioCtx.createGain();

outputGainNode = audioCtx.createGain();

const lpfNodes = [lpfNode1, lpfNode2]
const hpfNodes = [hpfNode1, hpfNode2]
const oscillatorNodes = [scriptNode, oscillatorBankNode]


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
    gainNode.connect(audioCtx.destination);
    oscillatorNode.start();

    return { oscillatorNode, gainNode };
}

function createOscillatorBank(initialFrequency, initialDetuneAmount, initialMix) {
    let summingGain = 1 / 7;
    let mix = initialMix;
    let frequency = initialFrequency;
    let detuneAmount = initialDetuneAmount;
    const oscillators = [];
    const gains = [];
    const detune_table = [0, 318, -318, 1020, -1029, 1760, -1800].map(v => v / 16384);

    // This node is just used for mixing
    const outputNode = audioCtx.createGain();
    outputNode.gain.value = 1;

    for (let i = 0; i < 7; i++) {
        const { oscillatorNode, gainNode } = createOscillator(frequency * (1 + detune_table[i]), 1 / 7);
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

    // TODO: connect internally
    function connect(node) {
        //outputNode.connect(node)
    }

    function disconnect() {
        for (let i = 1; i < 7; i++) {
            oscillators[i].disconnect()
            gains[i].disconnect()
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
        console.log(sum)
        return sum;
    }

    const scriptNode = audioCtx.createScriptProcessor(1024, 0, 1);
    scriptNode.onaudioprocess = function (e) {
        console.log('hello')
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

    for(let i = 0; i < poles; i++) {
        const lowpassNode = audioCtx.createBiquadFilter();
        lowpassNode.type = type;
        lowpassNode.frequency.value = initialFrequency;
        filters.push(lowpassNode)

        if(i > 0) {
            filters[i-1].connect(lowpassNode);
        }
        filters.push(lowpassNode);
    }

    function frequency(value) {
        for(let i = 0; i < poles; i++) {
            filters[i].frequency.value = value;
        }
    }

    function connect(otherNode) {
        filters[0].connect(otherNode)
        for(let i = 1; i < poles; i++) {
            filters[i].connect(filters[i-1])
        }
    }

    function disconnect() {
        for(let i=0; i < poles; i++) {
            filters[i].disconnect()
        }
    }

    return {
        connect,
        disconnect,
        frequency,
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

function sliderHandler(id, callback){
    const slider = document.getElementById(id);
    slider.oninput = function () {
        const value = parseFloat(this.value);
        callback(value)
    };
    callback(slider.value)
}

sliderHandler('volume', (value) => {
    outputGainNode.gain.value = value
    console.log(`Setting output volume to ${value}`)
});

sliderHandler('detune', (sliderValue) => {
    detune = sliderValue / 128;
    oscillatorNodes.forEach(node => node.setDetuneAmount(detune))
    console.log(`Setting detune to ${detune}`)
});

let freq = 0
let hpfOffset = 0
sliderHandler('pitch', (sliderValue) => {
    const fraction = sliderValue / 1200;
    const lowerstFreq = 20;
    const highestFreq = 10000;
    freq = lowerstFreq + (highestFreq - lowerstFreq) * fraction;
    console.log(`Setting pitch to ${freq}`)

    oscillatorNodes.forEach((node) => node.setFrequency(freq))
    if (isHighpassOn) {
        hpfNodes.forEach(node => node.frequency(freq * hpfOffset))
    }

});

sliderHandler('filterFreqOffset', (sliderValue) => {
    hpfOffset = sliderValue
    if (isHighpassOn) {
        console.log(`Setting highpass offset to ${hpfOffset}`)
        hpfNodes.forEach(node => node.frequency(freq * hpfOffset))
    }
})


document.getElementById('highpassToggle').onchange = function (e) {
    const isHighpassOn = e.target.checked;
    console.log(`Setting use highpass filter to ${isHighpassOn}`)
    const filterFreq = isHighpassOn ? freq * hpfOffset : 10; // 200 Hz when on, 10 Hz when off
    console.log(`Setting highpass to ${filterFreq}`)
    hpfNodes.forEach(node => node.frequency(filterFreq))
};


sliderHandler('lowpassCutoff', (sliderValue) => {
    lpfNodes.forEach(node => node.frequency(sliderValue))
    console.log(`Setting lowpass to ${sliderValue}Hz`)
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
    if (isPlaying) return;
    isPlaying = true;
    console.log('Press play on tape')

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440; // A4
    osc.connect(audioCtx.destination);
    osc.start();

    document.getElementById('stop').onclick = () => {
        osc.stop();
        osc.disconnect();
    };
    /*
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

    nodes = [
        scriptNode,
        oscillatorBankNode,
        hpfNode1,
        hpfNode2,
        lpfNode1,
        lpfNode2,
        analyserNode1,
        analyserNode2,
        gainNode1,
        gainNode2,
        outputGainNode
    ]
     */
};

document.getElementById('stop').onclick = () => {
    if (!isPlaying) return;
    isPlaying = false;
    console.log('Stop. Be kind, rewind.')

    nodes.forEach((node) => node.disconnect())
    nodes = []
};
