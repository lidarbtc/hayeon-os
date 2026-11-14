// The media player has no audio files. Each track is a short pattern that is
// synthesized with WebAudio while it plays.

export interface Track {
  title: string;
  bpm: number;
  /** One entry per bar: the bass note and the chord tones the arpeggio picks from (MIDI numbers). */
  bars: { bass: number; tones: number[] }[];
  /** Patterns have sixteen steps per bar. In arp a digit picks a chord tone and a dot is a rest. */
  arp: string;
  arpWave: OscillatorType;
  arpGain: number;
  /** In the patterns below an x plays and a dot rests. */
  bassLine: string;
  bassWave: OscillatorType;
  kick: string;
  snare: string;
  hat: string;
  /** Hold each bar's chord quietly underneath. */
  pad: boolean;
}

export const tracks: Track[] = [
  {
    title: '물방울',
    bpm: 108,
    bars: [
      { bass: 36, tones: [60, 64, 67, 72] },
      { bass: 33, tones: [57, 60, 64, 69] },
      { bass: 41, tones: [60, 65, 69, 72] },
      { bass: 43, tones: [59, 62, 67, 71] }
    ],
    arp: '0.2.1.3.2.1.3.5.',
    arpWave: 'triangle',
    arpGain: 0.16,
    bassLine: 'x.....x.x.......',
    bassWave: 'triangle',
    kick: 'x...x...x...x...',
    snare: '................',
    hat: '..x...x...x...x.',
    pad: true
  },
  {
    title: '터쿼이즈 드라이브',
    bpm: 124,
    bars: [
      { bass: 33, tones: [57, 60, 64, 69] },
      { bass: 41, tones: [57, 60, 65, 69] },
      { bass: 36, tones: [55, 60, 64, 67] },
      { bass: 43, tones: [55, 59, 62, 67] }
    ],
    arp: '0123210301232104',
    arpWave: 'square',
    arpGain: 0.045,
    bassLine: 'x.x.x.x.x.x.x.x.',
    bassWave: 'sawtooth',
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.xx',
    pad: false
  },
  {
    title: '밤 언덕',
    bpm: 76,
    bars: [
      { bass: 41, tones: [65, 69, 72, 76] },
      { bass: 40, tones: [64, 67, 71, 74] },
      { bass: 38, tones: [62, 65, 69, 72] },
      { bass: 36, tones: [60, 64, 67, 71] }
    ],
    arp: '0...2...1...3.2.',
    arpWave: 'sine',
    arpGain: 0.2,
    bassLine: 'x...............',
    bassWave: 'sine',
    kick: 'x.........x.....',
    snare: '................',
    hat: '....x.......x...',
    pad: true
  }
];

function hz(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

class Player {
  playing = $state(false);
  index = $state(0);
  volume = $state(0.7);

  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #analyser: AnalyserNode | null = null;
  #noise: AudioBuffer | null = null;
  #timer: ReturnType<typeof setInterval> | undefined;
  #step = 0;
  /** Context time at which the next step is due. */
  #next = 0;
  /** Context time at which the current track started. */
  #origin = 0;
  /** True until the selected track has actually started. */
  #fresh = true;

  /** Set once something has played; the visualizer reads the spectrum from it. */
  get analyser() {
    return this.#analyser;
  }

  // Browsers only allow sound after a click, so the audio graph is built on first play.
  #ensure() {
    if (this.#ctx) return this.#ctx;
    if (typeof AudioContext === 'undefined') return null;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = this.volume;
    const limiter = ctx.createDynamicsCompressor();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    master.connect(limiter).connect(analyser).connect(ctx.destination);

    const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    this.#ctx = ctx;
    this.#master = master;
    this.#analyser = analyser;
    this.#noise = noise;
    return ctx;
  }

  #tone(time: number, freq: number, length: number, wave: OscillatorType, peak: number, attack: number, cutoff?: number) {
    const ctx = this.#ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    if (cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      osc.connect(filter).connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(this.#master!);
    osc.start(time);
    osc.stop(time + length + 0.02);
  }

  #kick(time: number) {
    const ctx = this.#ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    osc.connect(gain).connect(this.#master!);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  #hit(time: number, type: BiquadFilterType, freq: number, peak: number, length: number) {
    const ctx = this.#ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.#noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter).connect(gain).connect(this.#master!);
    source.start(time);
    source.stop(time + length + 0.02);
  }

  #schedule(track: Track, step: number, time: number, stepLength: number) {
    const bar = track.bars[Math.floor(step / 16) % track.bars.length];
    const at = step % 16;
    if (track.pad && at === 0) {
      for (const tone of bar.tones) this.#tone(time, hz(tone), stepLength * 16, 'sine', 0.04, 0.3);
    }
    const pick = track.arp[at];
    if (pick !== '.') {
      // Picks past the end of the chord climb an octave.
      const n = Number(pick);
      const tone = bar.tones[n % bar.tones.length] + 12 * Math.floor(n / bar.tones.length);
      this.#tone(time, hz(tone), stepLength * 1.8, track.arpWave, track.arpGain, 0.005);
    }
    if (track.bassLine[at] === 'x') this.#tone(time, hz(bar.bass), stepLength * 1.7, track.bassWave, 0.24, 0.005, 520);
    if (track.kick[at] === 'x') this.#kick(time);
    if (track.snare[at] === 'x') this.#hit(time, 'bandpass', 1800, 0.4, 0.14);
    if (track.hat[at] === 'x') this.#hit(time, 'highpass', 7000, 0.2, 0.05);
  }

  // Runs every few milliseconds and queues the notes that fall due shortly. Hidden
  // tabs get their timers slowed down, so they queue much further ahead.
  #tick = () => {
    const ctx = this.#ctx;
    if (!ctx) return;
    const track = tracks[this.index];
    const stepLength = 60 / track.bpm / 4;
    const ahead = document.hidden ? 1.6 : 0.15;
    if (this.#next < ctx.currentTime) this.#next = ctx.currentTime + 0.02;
    while (this.#next < ctx.currentTime + ahead) {
      this.#schedule(track, this.#step, this.#next, stepLength);
      this.#next += stepLength;
      this.#step = (this.#step + 1) % (track.bars.length * 16);
    }
  };

  /** Play the given track from its start, or carry on with the current one. */
  play(index = this.index) {
    const ctx = this.#ensure();
    if (!ctx) return;
    if (index !== this.index || this.#fresh) {
      this.index = index;
      this.#step = 0;
      this.#origin = ctx.currentTime;
      this.#next = ctx.currentTime + 0.08;
      this.#fresh = false;
    }
    void ctx.resume();
    this.#timer ??= setInterval(this.#tick, 25);
    this.playing = true;
  }

  pause() {
    clearInterval(this.#timer);
    this.#timer = undefined;
    void this.#ctx?.suspend();
    this.playing = false;
  }

  stop() {
    this.pause();
    this.#fresh = true;
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Move to another track: keeps playing if something was playing. */
  skip(by: number) {
    const index = (this.index + by + tracks.length) % tracks.length;
    if (this.playing) {
      this.play(index);
    } else {
      this.index = index;
      this.#fresh = true;
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.#master) this.#master.gain.value = volume;
  }

  /** Seconds the current track has been playing. The context clock stops while paused. */
  elapsed() {
    return this.#ctx && !this.#fresh ? Math.max(0, this.#ctx.currentTime - this.#origin) : 0;
  }
}

export const player = new Player();
