const sampleRate = 44100;
let isPlaying = false;
let audioCtx, scriptNode, gainNode, currentSample = 0;

class Int24 {
    static MASK = 0xFFFFFF;
    static SIGN = 0x800000;

    constructor(value = 0) {
        this.value = Int24.from(value);
    }

    static from(x) {
        x = x | 0;
        x = x & Int24.MASK;
        if (x & Int24.SIGN) x |= ~Int24.MASK;
        return x;
    }

    add(x) {
        if (!(x instanceof Int24)) throw new TypeError('add expects Int24');
        this.value = Int24.from(this.value + x.value);
        return this;
    }

    mul(x) {
        if (!(x instanceof Int24)) throw new TypeError('mul expects Int24');
        // Multiply, mask to 24 bits, then sign-extend
        let result = (this.value * x.value) & Int24.MASK;
        if (result & Int24.SIGN) result |= ~Int24.MASK;
        return new Int24(result);
    }

    shiftRight(bits) {
        let shifted = this.value >> bits;
        return new Int24(shifted);
    }

    get() {
        return this.value;
    }
}

const saw = Array.from({ length: 7 }, () => new Int24(0));
//const detune_table = [0, 128, -128, 816, -824, 1408, -1440].map(v => new Int24(v));
const detune_table = [0, 318, -318, 1020, -1029, 1760, -1800].map(v => new Int24(v));

// But with szabo detune values: min detune is 0, max is what is in the detune table.

// The factors we want are [0, 0.01953125, -0.01953125, 0.06225585, -0.0628662, 0.107421875, -0.10986328125]


/*
Lets allow a detune value from 0 to 128, just for now.

That means the result has to be scaled down by 128.
 */

/*
I cant get it to work and I don't understand the code.
- summing overflows
- detune factors make no sense.
 */

// To

// Prepare arrays to store saw[i] values for each run
const sawHistory = Array.from({ length: 7 }, () => []);
const sawSum = [];

function next(pitchIn, spreadIn, detuneIn) {
    let pitch = new Int24(pitchIn);
    let detune = new Int24(detuneIn);
    let sum = new Int24(0);
    for (let i = 0; i < 7; i++) {
        let voice_detune = pitch.shiftRight(7).mul(detune_table[i]).mul(detune).shiftRight(14);
        //console.log('Pitch:', pitch.get(), 'ps', pitch.shiftRight(7).get(), 'detune:', voice_detune.get());
        saw[i].add(pitch.add(voice_detune));
        if (i === 0) {
            sum.add(saw[i]);
        } else {
            sum.add(saw[i].mul(new Int24(spreadIn)));
        }
    }
    return sum.get();
}

//19161600, 149700
// 8388607

//218 høy 219 lav
const detuneSlider = document.getElementById('detune');

let prevSum = 0;
let sampleCounter = 0;
let frequency = detuneSlider.value;
function getSampleValue(time) {
//    const frequency = 38000;
    const detune = parseInt(detuneSlider.value, 10);
    const sum = next(100 * frequency, 1, 128);

    sampleCounter++;
    if(sum < prevSum){
        //console.log('Waveform cycle completed at sample:', sampleRate / sampleCounter, 'Time (s):', (sampleCounter / sampleRate).toFixed(4));
        sampleCounter = 0;
    }
    prevSum = sum;

    return sum / 8388607;
}

const volumeSlider = document.getElementById('volume');
detuneSlider.oninput = function(event) {
    console.log('Frequency set to:', event.target.value);
    frequency = Number.parseInt(event.target.value);
}

document.getElementById('play').onclick = () => {
    if (isPlaying) return;
    isPlaying = true;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    scriptNode = audioCtx.createScriptProcessor(1024, 0, 1);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = parseFloat(volumeSlider.value);

    scriptNode.onaudioprocess = function(e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
            const time = currentSample / sampleRate;
            output[i] = getSampleValue(time);
            //console.log(output[i]);
            currentSample++;
        }
    };

    scriptNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
};

document.getElementById('stop').onclick = () => {
    if (!isPlaying) return;
    isPlaying = false;
    if (scriptNode) {
        scriptNode.disconnect();
        scriptNode = null;
    }
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    currentSample = 0;
};

volumeSlider.oninput = function() {
    if (gainNode) {
        gainNode.gain.value = parseFloat(this.value);
    }
};

const canvas = document.getElementById('plot');
canvas.width = window.innerWidth;
canvas.height = 150;
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Run next() 1000 times and collect saw[i] values
let min = Infinity, max = -Infinity;
const results = [];
for (let i = 0; i < 1000; i++) {
    // Reset saw arrays for each run if needed
    const y = next(100 * 440, 1, 1024);
    results.push(y);
    let sawSumCurr = 0;
    for (let j = 0; j < 7; j++) {
        sawHistory[j].push(saw[j].get());
        if (saw[j].get() < min) min = saw[j].get();
        if (saw[j].get() > max) max = saw[j].get();
        sawSumCurr += saw[j].get() / 8;
    }
    sawSum.push(sawSumCurr)
    if (y < min) min = y;
    if (y > max) max = y;
}

// Plot main result
for (let i = 0; i < 1000; i++) {
    const norm = (results[i] - min) / (max - min);
    const x = Math.floor(i * canvas.width / 1000);
    const y = Math.floor((1 - norm) * (canvas.height - 1));
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, 1, 1);
}

// Plot saw[i] histories (different color for each)
/*
const colors = ['#f00', '#0ff', '#ff0', '#0f0', '#00f', '#f0f', '#fff'];
for (let j = 0; j < 7; j++) {
    ctx.strokeStyle = colors[j % colors.length];
    ctx.beginPath();
    for (let i = 0; i < 1000; i++) {
        const norm = (sawHistory[j][i] - min) / (max - min);
        const x = Math.floor(i * canvas.width / 1000);
        const y = Math.floor((1 - norm) * (canvas.height - 1));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}
 */




// JavaScript:
const canvasSum = document.getElementById('plotSum');
canvasSum.width = window.innerWidth;
canvasSum.height = 150;
const ctxSum = canvasSum.getContext('2d');

// Fill background
ctxSum.fillStyle = '#111';
ctxSum.fillRect(0, 0, canvasSum.width, canvasSum.height);

// Find min/max for sawSum
let minSum = Math.min(...sawSum);
let maxSum = Math.max(...sawSum);

// Plot sawSum
ctxSum.strokeStyle = '#fff';
ctxSum.beginPath();
for (let i = 0; i < sawSum.length; i++) {
    const norm = (sawSum[i] - minSum) / (maxSum - minSum);
    const x = Math.floor(i * canvasSum.width / sawSum.length);
    const y = Math.floor((1 - norm) * (canvasSum.height - 1));
    if (i === 0) ctxSum.moveTo(x, y);
    else ctxSum.lineTo(x, y);
}
ctxSum.stroke();