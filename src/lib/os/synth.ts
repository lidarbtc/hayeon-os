// The instruments of the media player, built from WebAudio oscillators and noise.
// The palette is meant to sound like glass and water: a bell for the melody, a
// soft wide pad that breathes with the kick, droplet plucks, a round bass and
// light drums, all in a bright room with an echo.

import type { Cue } from './score';

function hz(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Everything one song plays through. A new one is built for each song so the last one can fade out. */
interface Stage {
  out: GainNode;
  lead: GainNode;
  pad: GainNode;
  pluck: GainNode;
  bass: GainNode;
  drums: GainNode;
  /** Dips on every kick and takes the pad, plucks and bass down with it. */
  pump: GainNode;
  delays: DelayNode[];
}

export class Rack {
  readonly analyser: AnalyserNode;
  #ctx: BaseAudioContext;
  #master: GainNode;
  #noise: AudioBuffer;
  #room: AudioBuffer;
  #stage: Stage;
  #flip = 1;

  constructor(ctx: BaseAudioContext, volume: number) {
    this.#ctx = ctx;
    this.#master = ctx.createGain();
    this.#master.gain.value = volume;
    // A little air on top, then a limiter so stacked voices never clip.
    const air = ctx.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = 6500;
    air.gain.value = 4;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.18;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.72;
    this.#master.connect(air).connect(limiter).connect(this.analyser).connect(ctx.destination);

    this.#noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = this.#noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    // The room: noise that dies away over two and a half seconds, losing its top as it goes.
    const length = Math.floor(ctx.sampleRate * 2.6);
    this.#room = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const tail = this.#room.getChannelData(channel);
      let smooth = 0;
      let power = 0;
      for (let i = 0; i < length; i++) {
        const age = i / length;
        smooth += (Math.random() * 2 - 1 - smooth) * (0.75 - 0.6 * age);
        tail[i] = smooth * (1 - age) ** 2.6;
        power += tail[i] * tail[i];
      }
      // Scaled to a known strength here, because browsers disagree on how to do it themselves.
      const scale = 1 / Math.sqrt(power);
      for (let i = 0; i < length; i++) tail[i] *= scale;
    }
    this.#stage = this.#build();
  }

  #build(): Stage {
    const ctx = this.#ctx;
    const gain = (value: number) => {
      const node = ctx.createGain();
      node.gain.value = value;
      return node;
    };
    const out = gain(1);
    out.connect(this.#master);

    const room = ctx.createConvolver();
    room.normalize = false;
    room.buffer = this.#room;
    const toRoom = gain(1);
    toRoom.connect(room).connect(gain(0.24)).connect(out);

    // An echo that bounces from one side to the other.
    const left = ctx.createDelay(2);
    const right = ctx.createDelay(2);
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 3400;
    const toEcho = gain(1);
    const panLeft = ctx.createStereoPanner();
    panLeft.pan.value = -0.65;
    const panRight = ctx.createStereoPanner();
    panRight.pan.value = 0.65;
    toEcho.connect(left);
    left.connect(panLeft).connect(out);
    left.connect(damp).connect(right);
    right.connect(panRight).connect(out);
    right.connect(gain(0.36)).connect(left);
    panLeft.connect(gain(0.25)).connect(toRoom);

    const pump = gain(1);
    pump.connect(out);

    const bus = (dry: number, target: AudioNode, room: number, echo: number) => {
      const node = gain(1);
      node.connect(gain(dry)).connect(target);
      if (room) node.connect(gain(room)).connect(toRoom);
      if (echo) node.connect(gain(echo)).connect(toEcho);
      return node;
    };
    return {
      out,
      pump,
      lead: bus(1, out, 0.42, 0.3),
      pad: bus(1, pump, 0.5, 0),
      pluck: bus(1, pump, 0.45, 0.34),
      bass: bus(1, pump, 0, 0),
      drums: bus(1, out, 0.1, 0),
      delays: [left, right]
    };
  }

  /** Fades out whatever is sounding and starts with a clean stage. The echo is timed to the new song. */
  reset(step: number) {
    const old = this.#stage;
    const now = this.#ctx.currentTime;
    old.out.gain.setTargetAtTime(0, now, 0.015);
    setTimeout(() => old.out.disconnect(), 400);
    this.#stage = this.#build();
    for (const delay of this.#stage.delays) delay.delayTime.value = Math.min(1.9, step * 3);
  }

  setVolume(volume: number) {
    this.#master.gain.value = volume;
  }

  play(cue: Cue, at: number, held = cue.d) {
    switch (cue.voice) {
      case 'lead':
        // The tune was sung; bells carry it better an octave above the voice.
        return this.#lead(at, hz(cue.p + 12), held, cue.v);
      case 'bass':
        return this.#bass(at, hz(cue.p), held, cue.v);
      case 'pad':
        return this.#pad(at, hz(cue.p), held, cue.v);
      case 'pluck':
        return this.#pluck(at, hz(cue.p), cue.v);
      case 'chime':
        return this.#chime(at, hz(cue.p), cue.v);
      case 'kick':
        return this.#kick(at, cue.v);
      case 'snare':
        return this.#snare(at, cue.v);
      case 'hat':
        return this.#hat(at, cue.v);
    }
  }

  #osc(type: OscillatorType, freq: number, at: number, until: number) {
    const osc = this.#ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.start(at);
    osc.stop(until);
    return osc;
  }

  #gain(value: number) {
    const node = this.#ctx.createGain();
    node.gain.value = value;
    return node;
  }

  // A glass bell: one sine bent by another four times as fast. The bending is
  // strong at the strike and fades, which is what makes it ring.
  #lead(at: number, freq: number, length: number, v: number) {
    const end = at + Math.max(length, 0.12);
    const until = end + 1;
    const peak = 0.21 * (0.55 + 0.45 * v);
    const amp = this.#gain(0);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(peak, at + 0.006);
    amp.gain.setTargetAtTime(peak * 0.45, at + 0.006, 0.18);
    // Pinning the level once it has settled keeps the release exact on every engine.
    if (length > 1.2) amp.gain.setValueAtTime(peak * 0.45, end);
    amp.gain.setTargetAtTime(0, end, 0.14);

    const voice = this.#osc('sine', freq, at, until);
    const bend = this.#osc('sine', freq * 4, at, until);
    const depth = this.#gain(0);
    depth.gain.setValueAtTime(freq * (1.8 + 1.4 * v), at);
    depth.gain.setTargetAtTime(freq * 0.7, at, 0.14);
    bend.connect(depth).connect(voice.frequency);
    voice.connect(amp);

    // A faint octave above that dies quickly, like the tap of the mallet.
    const tap = this.#osc('sine', freq * 2.003, at, until);
    const tapLevel = this.#gain(0);
    tapLevel.gain.setValueAtTime(0.45, at);
    tapLevel.gain.setTargetAtTime(0.1, at, 0.25);
    tap.connect(tapLevel).connect(amp);

    if (length > 0.45) {
      // Long notes get a slow wobble once they have settled.
      const wobble = this.#osc('sine', 5.4, at, until);
      const amount = this.#gain(0);
      amount.gain.setValueAtTime(0, at);
      amount.gain.setTargetAtTime(freq * 0.005, at + 0.25, 0.2);
      wobble.connect(amount).connect(voice.frequency);
    }
    amp.connect(this.#stage.lead);
  }

  // Two saws tuned slightly apart and placed left and right, softened by a filter that opens slowly.
  #pad(at: number, freq: number, length: number, v: number) {
    const ctx = this.#ctx;
    const end = at + length;
    const until = end + 1.4;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.setValueAtTime(900 + 1200 * v, at);
    filter.frequency.setTargetAtTime(2200 + 5200 * v, at, 0.9);
    const amp = this.#gain(0);
    const level = 0.07 + 0.06 * v;
    amp.gain.setValueAtTime(0, at);
    amp.gain.setTargetAtTime(level, at, 0.16);
    if (length > 1.2) amp.gain.setValueAtTime(level, end);
    amp.gain.setTargetAtTime(0, end, 0.24);
    for (const side of [-1, 1]) {
      const saw = this.#osc('sawtooth', freq, at, until);
      saw.detune.value = side * 8;
      const pan = ctx.createStereoPanner();
      pan.pan.value = side * 0.7;
      saw.connect(pan).connect(filter);
    }
    const top = this.#osc('triangle', freq * 2, at, until);
    top.detune.value = 4;
    top.connect(this.#gain(0.5)).connect(filter);
    filter.connect(amp).connect(this.#stage.pad);
  }

  // A droplet: a sine that starts sharp and falls onto its note within a blink.
  #pluck(at: number, freq: number, v: number) {
    const until = at + 0.6;
    const osc = this.#osc('sine', freq, at, until);
    osc.frequency.setValueAtTime(freq * 1.32, at);
    osc.frequency.exponentialRampToValueAtTime(freq, at + 0.024);
    const amp = this.#gain(0);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(0.26 * v, at + 0.004);
    amp.gain.setTargetAtTime(0, at + 0.004, 0.075);
    // A click of overtone at the very start makes the droplet read as glass.
    const glint = this.#osc('triangle', freq * 3, at, at + 0.2);
    const glintLevel = this.#gain(0);
    glintLevel.gain.setValueAtTime(0.5, at);
    glintLevel.gain.setTargetAtTime(0, at, 0.03);
    glint.connect(glintLevel).connect(amp);
    const pan = this.#ctx.createStereoPanner();
    this.#flip = -this.#flip;
    pan.pan.value = this.#flip * 0.45;
    osc.connect(amp).connect(pan).connect(this.#stage.pluck);
  }

  // A small bell with an out-of-tune overtone, for the sweeps.
  #chime(at: number, freq: number, v: number) {
    const until = at + 2.4;
    const amp = this.#gain(0);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(0.11 * v, at + 0.003);
    amp.gain.setTargetAtTime(0, at + 0.003, 0.45);
    this.#osc('sine', freq, at, until).connect(amp);
    this.#osc('sine', freq * 2.76, at, until).connect(this.#gain(0.25)).connect(amp);
    amp.connect(this.#stage.pluck);
  }

  // A sine for the weight and a filtered saw for the edge.
  #bass(at: number, freq: number, length: number, v: number) {
    const ctx = this.#ctx;
    const end = at + Math.max(length, 0.09);
    const until = end + 0.3;
    const amp = this.#gain(0);
    const level = 0.3 + 0.2 * v;
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(level, at + 0.008);
    amp.gain.setValueAtTime(level, end);
    amp.gain.setTargetAtTime(0, end, 0.04);
    this.#osc('sine', freq, at, until).connect(this.#gain(0.3)).connect(amp);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 12, 2200), at);
    filter.frequency.setTargetAtTime(freq * 4, at, 0.14);
    this.#osc('sawtooth', freq, at, until).connect(filter).connect(this.#gain(0.3)).connect(amp);
    amp.connect(this.#stage.bass);
  }

  #kick(at: number, v: number) {
    const osc = this.#osc('sine', 150, at, at + 0.4);
    osc.frequency.setValueAtTime(155, at);
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.11);
    const amp = this.#gain(0);
    amp.gain.setValueAtTime(0.5 * (0.5 + 0.5 * v), at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    osc.connect(amp).connect(this.#stage.drums);
    // The beater: a tick of bright noise so the kick is heard on small speakers too.
    this.#burst(at, 'highpass', 3000, 0.7, 0.12 * v, 0.02);
    // The pad, the plucks and the bass step back for a moment and swell back in.
    const pump = this.#stage.pump.gain;
    pump.setValueAtTime(1 - 0.45 * (0.4 + 0.6 * v), at);
    pump.linearRampToValueAtTime(1, at + 0.22);
  }

  #burst(at: number, type: BiquadFilterType, freq: number, q: number, peak: number, length: number) {
    const ctx = this.#ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.#noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = this.#gain(0);
    amp.gain.setValueAtTime(peak, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(amp).connect(this.#stage.drums);
    // Start somewhere new in the noise each time so repeated hits do not sound identical.
    source.start(at, Math.random() * 0.5);
    source.stop(at + length + 0.02);
  }

  #snare(at: number, v: number) {
    this.#burst(at, 'bandpass', 2400, 0.6, 0.55 * (0.4 + 0.6 * v), 0.15);
    this.#burst(at, 'highpass', 6000, 0.7, 0.26 * (0.4 + 0.6 * v), 0.09);
    const body = this.#osc('triangle', 200, at, at + 0.12);
    body.frequency.setValueAtTime(215, at);
    body.frequency.exponentialRampToValueAtTime(160, at + 0.07);
    const amp = this.#gain(0);
    amp.gain.setValueAtTime(0.16 * v, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    body.connect(amp).connect(this.#stage.drums);
  }

  #hat(at: number, v: number) {
    this.#burst(at, 'highpass', 8500, 0.7, 0.5 * (0.4 + 0.6 * v), 0.05);
  }
}
