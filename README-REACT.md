# Web Audio Super Saw Testing - React App

This is a React conversion of the original Web Audio super saw synthesizer application.

## Project Structure

```
/Users/joakim/git/xonik/supersaw-webaudio/
├── src/
│   ├── components/
│   │   ├── ControlPanel.jsx   # UI controls for the synthesizer
│   │   └── SpectrumCanvas.jsx # Canvas component for spectrum visualization
│   ├── hooks/
│   │   └── useAudioContext.js # Custom hook for Web Audio API context
│   ├── utils/
│   │   ├── audioUtils.js      # Audio processing utilities
│   │   └── canvasHelper.js    # Canvas drawing utilities
│   ├── App.jsx                # Main application component
│   ├── App.css                # Application styles
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles
├── public/
│   └── je8086_out.wav         # WAV file for playback
├── index-react.html           # HTML entry point
├── vite.config.js             # Vite configuration
└── package.json               # Dependencies and scripts
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is busy).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

- **Dual Algorithm Synthesis**: Script-based and native oscillator-based super saw
- **Real-time Spectrum Analysis**: Three canvas displays showing frequency analysis
- **Filter Control**: High-pass and low-pass filters with adjustable cutoff
- **Detune & Mix Controls**: Adjust the character of the super saw sound
- **Individual Oscillator Control**: Toggle each of the 7 saw waves on/off
- **WAV File Playback**: Loops audio file for analysis

## Controls

- **Play/Stop**: Start and stop audio processing
- **Master Volume**: Overall output volume
- **Analyzer Volume**: Pre-analyzer gain control
- **Mix**: Blend between center oscillator and detuned oscillators
- **Algo Mix**: Balance between script and native implementations
- **Pitch**: Frequency control (20 Hz - 10 kHz)
- **Detune**: Amount of detuning for outer oscillators
- **Filter Controls**: High-pass and low-pass filter cutoff frequencies
- **Saw Toggles**: Enable/disable individual oscillators
- **Scale Toggles**: Switch between linear and logarithmic scales

## Original Files

The original vanilla JavaScript implementation can be found in:
- `index.html` - Original HTML interface
- `audio.js` - Original audio processing
- `inputs.js` - Original input handling
- `canvasHelper.js` - Original canvas utilities

## Technologies

- React 19
- Vite 7
- Web Audio API
- Canvas API

