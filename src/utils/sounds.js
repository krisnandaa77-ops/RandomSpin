// 🔊 Epic Sound Effects using Web Audio API

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ===== DIGITAL SPIN TICK (spinning) =====
let drumRollTimer = null;
let drumSpeed = 60;

function playDrumHit() {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Core digital blip — square wave with a fast downward pitch sweep,
  // like a slot-machine reel tick / synth arpeggiator step.
  const baseFreq = 850 + Math.random() * 550;

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, t + 0.045);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(5000, t);

  oscGain.gain.setValueAtTime(0.001, t);
  oscGain.gain.exponentialRampToValueAtTime(0.07, t + 0.004);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

  osc.connect(lp);
  lp.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);

  // Crisp high-frequency click layer for extra digital "snap"
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = 'square';
  click.frequency.setValueAtTime(baseFreq * 3.2, t);
  clickGain.gain.setValueAtTime(0.025, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
  click.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(t);
  click.stop(t + 0.02);
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
    // Rising second climax — bigger than the first
    { notes: [440, 554.4, 659.3, 880], start: 1.75, dur: 0.6, vol: 0.07 },
    // Final sustained triumph chord — long ringing finish
    { notes: [523.2, 659.3, 784, 1046.5], start: 2.4, dur: 2.0, vol: 0.055 },
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
    // Second climax arpeggio (matches the 1.75s brass hit)
    { freq: 1760, start: 1.75, dur: 0.5 },
    { freq: 2217, start: 1.9, dur: 0.5 },
    { freq: 2637, start: 2.05, dur: 0.6 },
    { freq: 3520, start: 2.2, dur: 0.9 },
    // Long ringing finish arpeggio, trailing off
    { freq: 2093, start: 2.5, dur: 0.7 },
    { freq: 2637, start: 2.7, dur: 0.8 },
    { freq: 3136, start: 2.95, dur: 0.9 },
    { freq: 4186, start: 3.2, dur: 1.1 },
    { freq: 3136, start: 3.6, dur: 0.8 },
    { freq: 4186, start: 3.85, dur: 1.0 },
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

  // --- Layer 3: Rising Shimmer Sweeps (one per climax) ---
  [{ from: 0.8, to: 2.0 }, { from: 1.75, to: 2.9 }].forEach(({ from, to }) => {
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const shimmerFilter = ctx.createBiquadFilter();
    shimmer.type = 'sawtooth';
    shimmer.frequency.setValueAtTime(500, t + from);
    shimmer.frequency.exponentialRampToValueAtTime(4000, t + to);
    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.setValueAtTime(2000, t + from);
    shimmerFilter.frequency.exponentialRampToValueAtTime(6000, t + to);
    shimmerFilter.Q.value = 2;
    shimmerGain.gain.setValueAtTime(0, t + from);
    shimmerGain.gain.linearRampToValueAtTime(0.03, t + from + 0.4);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + to + 0.5);
    shimmer.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(t + from);
    shimmer.stop(t + to + 0.6);
  });

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

  // --- Layer 5: Crash Cymbals (one per climax hit) ---
  [0, 1.75].forEach(startAt => {
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
    crashGain.gain.setValueAtTime(startAt === 0 ? 0.08 : 0.1, t + startAt);
    crashGain.gain.exponentialRampToValueAtTime(0.001, t + startAt + 1.5);
    crash.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(ctx.destination);
    crash.start(t + startAt);
  });

  // --- Layer 6: Sparkle Pings, scattered across the whole celebration ---
  for (let i = 0; i < 26; i++) {
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    const startT = 0.6 + Math.random() * 3.6;
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

  // --- Layer 7: Crowd Cheer/Applause (filtered, amplitude-modulated noise) ---
  const cheerDur = 3.6;
  const cheerLen = Math.floor(ctx.sampleRate * cheerDur);
  const cheerBuf = ctx.createBuffer(1, cheerLen, ctx.sampleRate);
  const cheerData = cheerBuf.getChannelData(0);
  for (let i = 0; i < cheerLen; i++) {
    cheerData[i] = Math.random() * 2 - 1;
  }
  const cheer = ctx.createBufferSource();
  cheer.buffer = cheerBuf;
  const cheerFilter = ctx.createBiquadFilter();
  cheerFilter.type = 'bandpass';
  cheerFilter.frequency.value = 1800;
  cheerFilter.Q.value = 0.6;
  const cheerGain = ctx.createGain();
  const cheerStart = t + 0.3;
  cheerGain.gain.setValueAtTime(0, cheerStart);
  cheerGain.gain.linearRampToValueAtTime(0.05, cheerStart + 0.5);
  // Gentle swell/dip pattern so it reads as an excited crowd, not flat static
  cheerGain.gain.linearRampToValueAtTime(0.035, cheerStart + 1.2);
  cheerGain.gain.linearRampToValueAtTime(0.06, cheerStart + 2.0);
  cheerGain.gain.linearRampToValueAtTime(0.03, cheerStart + 2.8);
  cheerGain.gain.exponentialRampToValueAtTime(0.001, cheerStart + cheerDur);
  cheer.connect(cheerFilter);
  cheerFilter.connect(cheerGain);
  cheerGain.connect(ctx.destination);
  cheer.start(cheerStart);
}
