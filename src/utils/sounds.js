// 🔊 Epic Sound Effects using Web Audio API

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ===== DRUM ROLL (spinning) =====
let drumRollTimer = null;
let drumSpeed = 60;

function playDrumHit() {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Snare-like noise burst
  const bufferSize = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 3000 + Math.random() * 2000;
  noiseFilter.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.12, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t);

  // Tonal hit
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200 + Math.random() * 100, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);
  oscGain.gain.setValueAtTime(0.08, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

export function startDrumRoll() {
  stopDrumRoll();
  drumSpeed = 80;

  const roll = () => {
    playDrumHit();
    // Accelerate over time for tension
    if (drumSpeed > 35) drumSpeed -= 0.3;
    drumRollTimer = setTimeout(roll, drumSpeed);
  };
  roll();
}

export function stopDrumRoll() {
  if (drumRollTimer) {
    clearTimeout(drumRollTimer);
    drumRollTimer = null;
  }
  drumSpeed = 80;
}

// ===== WINNER FANFARE — EPIC VERSION =====
export function playWinnerSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // --- Layer 1: Brass Fanfare (sawtooth chords) ---
  const fanfare = [
    // First hit — big power chord
    { notes: [261.6, 329.6, 392, 523.2], start: 0, dur: 0.25, vol: 0.06 },
    // Second hit
    { notes: [293.7, 370, 440, 587.3], start: 0.28, dur: 0.25, vol: 0.06 },
    // Third hit — climax!
    { notes: [329.6, 415.3, 523.2, 659.3], start: 0.56, dur: 0.5, vol: 0.07 },
    // Sustained triumph chord
    { notes: [392, 523.2, 659.3, 784], start: 0.9, dur: 0.8, vol: 0.06 },
    // Final sparkle
    { notes: [523.2, 659.3, 784, 1046.5], start: 1.4, dur: 1.0, vol: 0.05 },
  ];

  fanfare.forEach(chord => {
    chord.notes.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + chord.start);

      // Filter to soften sawtooth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, t + chord.start);

      gain.gain.setValueAtTime(0, t + chord.start);
      gain.gain.linearRampToValueAtTime(chord.vol, t + chord.start + 0.03);
      gain.gain.setValueAtTime(chord.vol, t + chord.start + chord.dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + chord.start + chord.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + chord.start);
      osc.stop(t + chord.start + chord.dur + 0.05);
    });
  });

  // --- Layer 2: Bright Bell Arpeggios ---
  const bells = [
    { freq: 1046.5, start: 0.1, dur: 0.6 },
    { freq: 1318.5, start: 0.2, dur: 0.5 },
    { freq: 1568, start: 0.35, dur: 0.5 },
    { freq: 2093, start: 0.5, dur: 0.7 },
    { freq: 1568, start: 0.9, dur: 0.4 },
    { freq: 2093, start: 1.05, dur: 0.5 },
    { freq: 2637, start: 1.2, dur: 0.8 },
    { freq: 3136, start: 1.5, dur: 1.0 },
  ];

  bells.forEach(bell => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(bell.freq, t + bell.start);

    gain.gain.setValueAtTime(0, t + bell.start);
    gain.gain.linearRampToValueAtTime(0.06, t + bell.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + bell.start + bell.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + bell.start);
    osc.stop(t + bell.start + bell.dur + 0.05);
  });

  // --- Layer 3: Rising Shimmer Sweep ---
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  const shimmerFilter = ctx.createBiquadFilter();
  shimmer.type = 'sawtooth';
  shimmer.frequency.setValueAtTime(500, t + 0.8);
  shimmer.frequency.exponentialRampToValueAtTime(4000, t + 2.0);
  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.setValueAtTime(2000, t + 0.8);
  shimmerFilter.frequency.exponentialRampToValueAtTime(6000, t + 2.0);
  shimmerFilter.Q.value = 2;
  shimmerGain.gain.setValueAtTime(0, t + 0.8);
  shimmerGain.gain.linearRampToValueAtTime(0.03, t + 1.2);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
  shimmer.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmer.start(t + 0.8);
  shimmer.stop(t + 2.6);

  // --- Layer 4: Impact Boom ---
  const boom = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(120, t);
  boom.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  boomGain.gain.setValueAtTime(0.2, t);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  boom.connect(boomGain);
  boomGain.connect(ctx.destination);
  boom.start(t);
  boom.stop(t + 0.55);

  // --- Layer 5: Crash Cymbal ---
  const crashLen = ctx.sampleRate * 1.5;
  const crashBuf = ctx.createBuffer(1, crashLen, ctx.sampleRate);
  const crashData = crashBuf.getChannelData(0);
  for (let i = 0; i < crashLen; i++) {
    crashData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crashLen, 1.5);
  }
  const crash = ctx.createBufferSource();
  crash.buffer = crashBuf;
  const crashFilter = ctx.createBiquadFilter();
  crashFilter.type = 'highpass';
  crashFilter.frequency.value = 5000;
  const crashGain = ctx.createGain();
  crashGain.gain.setValueAtTime(0.08, t);
  crashGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  crash.connect(crashFilter);
  crashFilter.connect(crashGain);
  crashGain.connect(ctx.destination);
  crash.start(t);

  // --- Layer 6: Sparkle Pings ---
  for (let i = 0; i < 12; i++) {
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    const startT = 0.6 + Math.random() * 1.5;
    const freq = 2000 + Math.random() * 4000;
    
    ping.type = 'sine';
    ping.frequency.setValueAtTime(freq, t + startT);
    pingGain.gain.setValueAtTime(0, t + startT);
    pingGain.gain.linearRampToValueAtTime(0.04, t + startT + 0.005);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + startT + 0.3);
    
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(t + startT);
    ping.stop(t + startT + 0.35);
  }
}
