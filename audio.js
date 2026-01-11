const sampleRate = 44100; // does not work for 88200, or rather, different pitches from 44100
let isPlaying = false;
let audioCtx, scriptNode, gainNode, currentSample = 0;
let highpassNode;
let lowpassNode1;
let lowpassNode2;
let lowpassNode3;
let lowpassNode4;
let analyserNode;
let isHighpassOn = true;

const sawEnabled = Array(7).fill(true);
const saw = [0, Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
const detune_table = [0, 318, -318, 1020, -1029, 1760, -1800].map(v => v / 16384); // divide by 16384 to get approx the same as above

// Prepare arrays to store saw[i] values for each run
const sawHistory = Array.from({length: 7}, () => []);
const sawSum = [];
const sumSum = [];

// JS: Add at the top
let isLogY = true;


function pitchUpdateFromSlider(value) {
    const fraction = value / 1200;

    const waveamplitude = 2;
    const lowerstFreq = 20;
    const highestFreq = 10000;

    const freq = lowerstFreq + (highestFreq - lowerstFreq) * fraction;

    //20 hz: 2 skal dekkes på 88200/ 20 samples.
    // ( 88200 / 20 ) * x = 2  => x = 2 * 20 / 88200 = 0.00045351473922902497
    const pitch = (freq / sampleRate) * waveamplitude;
    console.log('Freq: ', freq, ' Pitch: ', pitch);

    if (highpassNode && isHighpassOn) {
        highpassNode.frequency.value = freq * filterFreqOffset; // Set cutoff frequency as needed
    }
    return {
        pitch,
        freq,
    };
}

// all numbers between 0 and 1
function next(pitch, detuneVal) {
    let sum = 0
    for (let i = 0; i < 7; i++) {
        if (!sawEnabled[i]) continue;
        let voice_detune = pitch * detune_table[i] * detuneVal;
        saw[i] += (pitch + voice_detune);

        // amplitude is -1 to 1, so wrap around
        if (saw[i] > 1) saw[i] -= 2;

        sum += saw[i];
    }
    return sum;
}


// Add event listeners for checkboxes
for (let i = 0; i < 7; i++) {
    document.getElementById('saw' + i).onchange = function (e) {
        sawEnabled[i] = e.target.checked;
    };
}

document.getElementById('logY').onchange = function (e) {
    isLogY = e.target.checked;
    console.log('New y scale log: ', isLogY);
};

document.getElementById('highpassToggle').onchange = function (e) {
    isHighpassOn = e.target.checked;
    if (highpassNode) {
        highpassNode.frequency.value = isHighpassOn ? freq * filterFreqOffset : 10; // 200 Hz when on, 10 Hz when off
    }
    console.log('High-pass filter: ', isHighpassOn);
};

const volumeSlider = document.getElementById('volume');
const detuneSlider = document.getElementById('detune');
const pitchSlider = document.getElementById('pitch');

// JS: At the top, after other slider declarations
const filterFreqOffsetSlider = document.getElementById('filterFreqOffset');
const filterFreqOffsetValue = document.getElementById('filterFreqOffsetValue');
let filterFreqOffset = parseFloat(filterFreqOffsetSlider.value);

filterFreqOffsetSlider.oninput = function () {
    filterFreqOffset = parseFloat(this.value);
    filterFreqOffsetValue.textContent = filterFreqOffset.toFixed(2);
    // Update highpass frequency if needed
    if (highpassNode && isHighpassOn) {
        highpassNode.frequency.value = freq * filterFreqOffset;
    }
};
filterFreqOffsetValue.textContent = filterFreqOffset.toFixed(2);

// JS: At the top, after other slider declarations
const lowpassCutoffSlider = document.getElementById('lowpassCutoff');
const lowpassCutoffValue = document.getElementById('lowpassCutoffValue');
let lowpassCutoff = parseFloat(lowpassCutoffSlider.value);

lowpassCutoffSlider.oninput = function () {
    lowpassCutoff = parseFloat(this.value);
    lowpassCutoffValue.textContent = lowpassCutoff;
    if (lowpassNode1) {
        lowpassNode1.frequency.value = lowpassCutoff;
    }
    if (lowpassNode2) {
        lowpassNode1.frequency.value = lowpassCutoff;
    }
    if (lowpassNode3) {
        lowpassNode1.frequency.value = lowpassCutoff;
    }
    if (lowpassNode4) {
        lowpassNode1.frequency.value = lowpassCutoff;
    }
};
lowpassCutoffValue.textContent = lowpassCutoff;

let detune = detuneSlider.value / 128;
console.log('Initial detune: ', detune);

detuneSlider.oninput = function (event) {
    sliderValue = Number.parseInt(event.target.value);
    console.log('Detune: ', detune / 128);
    detune = sliderValue / 129;
}

let {pitch, freq} = pitchUpdateFromSlider(5)
pitchSlider.oninput = function (event) {
    const sliderValue = Number.parseInt(event.target.value);
    console.log('Slider: ', sliderValue);
    let {pitch: newPitch, freq: newFreq} = pitchUpdateFromSlider(sliderValue);
    pitch = newPitch;
    freq = newFreq;
}

document.getElementById('play').onclick = () => {
    if (isPlaying) return;
    isPlaying = true;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({sampleRate});
    scriptNode = audioCtx.createScriptProcessor(1024, 0, 1);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = parseFloat(volumeSlider.value);

    scriptNode.onaudioprocess = function (e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
            output[i] = next(pitch, detune);
            currentSample++;
        }
    };

    // In the play button handler, after creating scriptNode:
    highpassNode = audioCtx.createBiquadFilter();
    highpassNode.type = 'highpass';

    // TODO: Adjust frequency along with pitch, keeping it a bit below the fundamental frequency
    highpassNode.frequency.value = isHighpassOn ? freq * filterFreqOffset : 10; // Set cutoff frequency as needed

    // In play button handler, after creating highpassNode:
    lowpassNode1 = audioCtx.createBiquadFilter();
    lowpassNode1.type = 'lowpass';
    lowpassNode1.frequency.value = lowpassCutoff;
    lowpassNode2 = audioCtx.createBiquadFilter();
    lowpassNode2.type = 'lowpass';
    lowpassNode2.frequency.value = lowpassCutoff;
    lowpassNode3 = audioCtx.createBiquadFilter();
    lowpassNode3.type = 'lowpass';
    lowpassNode3.frequency.value = lowpassCutoff;
    lowpassNode4 = audioCtx.createBiquadFilter();
    lowpassNode4.type = 'lowpass';
    lowpassNode4.frequency.value = lowpassCutoff;



    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048; // Higher = more detail
    const bufferLength = analyserNode.frequencyBinCount;

    // Connect: scriptNode -> highpassNode -> lowpassNode -> analyserNode
    scriptNode.connect(highpassNode);
    highpassNode.connect(lowpassNode1);
    lowpassNode1.connect(lowpassNode2);
    lowpassNode2.connect(lowpassNode3);
    lowpassNode3.connect(lowpassNode4);
    lowpassNode4.connect(analyserNode);
    analyserNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

// After filling the background, add this to draw x-axis frequency labels
    function drawFrequencyLabels() {
        const numTicks = 10;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= numTicks; i++) {
            const x = Math.floor(i * canvas.width / numTicks);
            const bin = Math.floor(i * analyserNode.frequencyBinCount / numTicks);
            const freq = Math.round(bin * sampleRate / analyserNode.fftSize);

            // Draw tick
            ctx.strokeStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - 15);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            // Draw label
            ctx.fillText(freq + ' Hz', x, canvas.height - 13);
        }
    }

    function drawSpectrum() {
        if (!analyserNode) return;

        const bufferLength = analyserNode.frequencyBinCount;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isLogY) {
            const dataArray = new Float32Array(bufferLength);
            analyserNode.getFloatFrequencyData(dataArray);
            const minDb = analyserNode.minDecibels;
            const maxDb = analyserNode.maxDecibels;
            for (let i = 0; i < bufferLength; i++) {
                const db = dataArray[i];
                const percent = (db - minDb) / (maxDb - minDb);
                const height = percent * canvas.height;
                ctx.fillStyle = '#0ff';
                ctx.fillRect(i * canvas.width / bufferLength, canvas.height - height, canvas.width / bufferLength, height);
            }
        } else {
            const dataArray = new Uint8Array(bufferLength);
            analyserNode.getByteFrequencyData(dataArray);
            for (let i = 0; i < bufferLength; i++) {
                const value = dataArray[i];
                const percent = value / 255;
                const height = percent * canvas.height;
                ctx.fillStyle = '#0ff';
                ctx.fillRect(i * canvas.width / bufferLength, canvas.height - height, canvas.width / bufferLength, height);
            }
        }
        drawFrequencyLabels();
        if (isPlaying) requestAnimationFrame(drawSpectrum);
    }

    drawSpectrum();
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
    // In the stop button handler, disconnect and nullify highpassNode
    if (highpassNode) {
        highpassNode.disconnect();
        highpassNode = null;
    }

    // In stop button handler, disconnect and nullify analyserNode
    if (analyserNode) {
        analyserNode.disconnect();
        analyserNode = null;
    }

    // In stop button handler, disconnect and nullify lowpassNode
    if (lowpassNode) {
        lowpassNode.disconnect();
        lowpassNode = null;
    }

    currentSample = 0;
};

volumeSlider.oninput = function () {
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
let min = -7;
let max = 7;
const results = [];
for (let i = 0; i < 1000; i++) {
    // Reset saw arrays for each run if needed
    const y = next(pitch, detune);
    results.push(y);
    /*
    let sawSumCurr = 0;
    for (let j = 0; j < 7; j++) {
        sawHistory[j].push(saw[j].get());
        if (saw[j].get() < min) min = saw[j].get();
        if (saw[j].get() > max) max = saw[j].get();
        sawSumCurr += saw[j].get() / 8;
    }
    sawSum.push(sawSumCurr)
    */
}

// Plot main result
for (let i = 0; i < 1000; i++) {
    const norm = (results[i] - min) / (max - min);
    const x = Math.floor(i * canvas.width / 1000);
    const y = Math.floor((1 - norm) * (canvas.height - 1));
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, 1, 1);
}