
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


const volumeSlider = sliderHandler('volume', (value, subscribers) => {
    subscribers.forEach(node => node.gain.value = value)
    console.log(`Setting output volume to ${value}`)
});

const balanceSlider = sliderHandler('balance', (value, subscribers) => {
    if(subscribers[0]) subscribers[0].gain.value = 1 - value
    if(subscribers[1]) subscribers[1].gain.value = value
    console.log(`Setting version balance to ${value}`)
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

const lpfSlider = sliderHandler('lowpassCutoff', (value, subscribers) => {
    subscribers.forEach(node => node.setFrequency(value))
    console.log(`Setting lowpass to ${value}Hz`)
})

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

function createSawsToggler() {
    const subscribers = [];
    const toggles = [];

    const callback = (i, on, subscribers) => {
        console.log(`Setting saws to ${on}`)
        subscribers.forEach(node => node.toggleOn(i, on))
    }

    for (let i = 0; i < 7; i++) {
        toggles.push(document.getElementById('saw' + i))
        console.log('Initial sawtoggle', i, toggles[i].value)
        toggles[i].onchange = function (e) {
            callback(i, e.target.checked, subscribers);
        };
    }

    return {
        subscribe: (cb) => {
            subscribers.push(cb);
            for(let i = 0; i < 7; i++) {
                console.log('Subscribed to toggle', i, cb, toggles[i].value)
                callback(i, toggles[i].value, subscribers)
            }
        },
        unsubscribe: (cb) => {
            const index = subscribers.indexOf(cb);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        }
    }
}

const sawsToggler = createSawsToggler();

const highpassToggle = toggleHandler('highpassToggle', (on, subscribers) => {
    console.log(`Setting use highpass filter to ${on}`)
    subscribers.forEach(node => node.toggleOn(on))
});
