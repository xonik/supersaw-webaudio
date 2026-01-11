
const samples = 1000;

const saw = [0, Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
const detune_table = [0, 0.01, -0.01, 0.022, -0.022, 0.034, -0.034];

// Prepare arrays to store saw[i] values for each run
const sawHistory = Array.from({ length: 7 }, () => []);
const sawSum = [];
const sumSum = [];

// all numbers between 0 and 1
function next(pitch, detune) {
    let sum = 0
    for (let i = 0; i < 7; i++) {
        let voice_detune = pitch * detune_table[i] * detune;
        console.log(pitch)
        saw[i] += (pitch + voice_detune);
        saw[i] %= 1;

        sum += saw[i];
        sum %= 1;
    }

    console.log(sum)
    return sum;
}

//19161600, 149700
// 8388607

//218 høy 219 lav
const detuneSlider = document.getElementById('detune');


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
for (let i = 0; i < samples; i++) {
    // Reset saw arrays for each run if needed
    const y = next(0.002, 1);

    //if(i >= 9000) {
        results.push(y);

        let sawSumCurr = 0;
        for (let j = 0; j < 7; j++) {
            sawHistory[j].push(saw[j]);
            if (saw[j] < min) min = saw[j];
            if (saw[j] > max) max = saw[j];
            sawSumCurr += saw[j] / 8;
        }
        sawSum.push(sawSumCurr)
        if (y < min) min = y;
        if (y > max) max = y;
    //}
}

// Plot main result
for (let i = 0; i < samples; i++) {
    const norm = (results[i] - min) / (max - min);
    const x = Math.floor(i * canvas.width / samples);
    const y = Math.floor((1 - norm) * (canvas.height - 1));
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, 1, 1);
}

// Plot saw[i] histories (different color for each)
const colors = ['#f00', '#0ff', '#ff0', '#0f0', '#00f', '#f0f', '#fff'];
for (let j = 0; j < 7; j++) {
    ctx.strokeStyle = colors[j % colors.length];
    ctx.beginPath();
    for (let i = 0; i < samples; i++) {
        const norm = (sawHistory[j][i] - min) / (max - min);
        const x = Math.floor(i * canvas.width / samples);
        const y = Math.floor((1 - norm) * (canvas.height - 1));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}




// JavaScript:
const canvasSum = document.getElementById('plotSum');
canvasSum.width = window.innerWidth;
canvasSum.height = 500;
const ctxSum = canvasSum.getContext('2d');

// Fill background
ctxSum.fillStyle = '#111';
ctxSum.fillRect(0, 0, canvasSum.width, canvasSum.height);

// Find min/max for sawSum
let minSum = Math.min(...results);
let maxSum = Math.max(...results);

console.log('Max sum:', maxSum);
console.log('Min sum:', minSum);

// Draw horizontal lines every 1/8 of canvasSum height
ctxSum.strokeStyle = '#333';
ctxSum.lineWidth = 1;
for (let i = 1; i < 8; i++) {
    const y = Math.floor(i * canvasSum.height / 8);
    ctxSum.beginPath();
    ctxSum.moveTo(0, y);
    ctxSum.lineTo(canvasSum.width, y);
    ctxSum.stroke();
}


// Plot sawSum
ctxSum.strokeStyle = '#fff';
ctxSum.beginPath();
for (let i = 0; i < sawSum.length; i++) {
    const norm = (sawSum[i]) / (maxSum - minSum);
    const x = Math.floor(i * canvasSum.width / sawSum.length);
    const y = Math.floor((1 - norm) * (canvasSum.height - 1));
    if (i === 0) ctxSum.moveTo(x, y);
    else ctxSum.lineTo(x, y);
}
ctxSum.stroke();


// After plotting sawSum, plot sumDiv8:
ctxSum.strokeStyle = '#0ff'; // Choose a distinct color
ctxSum.beginPath();
for (let i = 0; i < sawSum.length; i++) {
    const norm = (results[i]/8 - minSum) / (maxSum - minSum);
    const x = Math.floor(i * canvasSum.width / sawSum.length);
    const y = Math.floor((1 - norm) * (canvasSum.height - 1));
    if (i === 0) ctxSum.moveTo(x, y);
    else ctxSum.lineTo(x, y);
}
ctxSum.stroke();

// This approximates a 24x24 bit signed multiplication,
// with the result shifted right by 7 bits, and can be used
// on a DSP with only 24 x 8 multipliers in hardware.
function mul24x24_high7(A, B) {
    // Sign-extend to 32 bits if negative
    if (A & 0x800000) A |= ~0xFFFFFF;
    else A &= 0xFFFFFF;
    if (B & 0x800000) B |= ~0xFFFFFF;
    else B &= 0xFFFFFF;

    // Split B into bytes
    let b0 =  B        & 0xFF;
    let b1 = (B >> 8)  & 0xFF;
    let b2 = (B >> 16) & 0xFF;
    // Sign-extend b2 if needed
    if (b2 & 0x80) b2 |= ~0xFF;

    // Partial products
    let P0 = (A * b0) >> 7;
    let P1 = (A * b1) >> 7;
    let P2 = (A * b2) >> 7;

    // Re-align and sum
    let result = P0 + (P1 << 8) + (P2 << 16);

    // Clamp to signed 24-bit range
    if (result > 0x7FFFFF) result = 0x7FFFFF;
    if (result < -0x800000) result = -0x800000;

    console.log(`Mult24x24: ${result}`)
    console.log(`Normal: ${(A * B) >> 7}`)

    return result;
}

 mul24x24_high7(1556, 256) // mult er litt lavere
 mul24x24_high7(150000, 1800) // mult er litt høyere
