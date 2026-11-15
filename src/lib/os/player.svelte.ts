// The media player holds no recordings. Every song is a list of notes that the
// synth in synth.ts performs while it plays: the tripleS songs come from MIDI
// files (public/music, made by scripts/music.py) and the three house tunes from
// the patterns below.

import remixes from './music.json';
import { parseMidi } from './midi';
import { packedBytes } from './pack.svelte';
import { fromMidi, fromPattern, type Pattern, type Score } from './score';
import { Rack } from './synth';

export interface Song {
  id: string;
  title: string;
  album: string;
  /** The unit that sang it, when it was not the whole group. */
  unit: string;
  year: number;
  bpm: number;
  seconds: number;
  /** Content hash of the MIDI file, so a saved copy is never stale. */
  rev?: string;
  pattern?: Pattern;
}

const house: Pattern[] = [
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
    bassLine: 'x.....x.x.......',
    kick: 'x...x...x...x...',
    snare: '................',
    hat: '..x...x...x...x.',
    pad: true,
    loops: 12
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
    bassLine: 'x.x.x.x.x.x.x.x.',
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.xx',
    pad: false,
    loops: 14
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
    bassLine: 'x...............',
    kick: 'x.........x.....',
    snare: '................',
    hat: '....x.......x...',
    pad: true,
    loops: 8
  }
];

export const songs: Song[] = [
  ...(remixes as Song[]),
  ...house.map((pattern, index) => ({
    id: 'house-' + index,
    title: pattern.title,
    album: 'HaYeon OS',
    unit: '',
    year: 2007,
    bpm: pattern.bpm,
    seconds: (pattern.bars.length * pattern.loops * 240) / pattern.bpm,
    pattern
  }))
];

class Player {
  playing = $state(false);
  index = $state(0);
  volume = $state(0.7);
  /** The notes of the selected song are on their way. */
  loading = $state(false);
  /** The notes of the selected song could not be fetched. */
  failed = $state(false);

  #ctx: AudioContext | null = null;
  #rack: Rack | null = null;
  #scores = new Map<string, Promise<Score>>();
  #score: Score | null = null;
  #timer: ReturnType<typeof setInterval> | undefined;
  /** Index of the next cue to hand to the synth. */
  #cursor = 0;
  /** Context time at which the current song is (or would have been) at zero. */
  #origin = 0;
  /** True until the selected song has actually started. */
  #fresh = true;
  /** Counts song changes, so a slow download cannot start a song that is no longer wanted. */
  #turn = 0;

  /** Set once something has played; the visualizer reads the spectrum from it. */
  get analyser() {
    return this.#rack?.analyser ?? null;
  }

  get song() {
    return songs[this.index];
  }

  // Browsers only allow sound after a click, so the audio graph is built on first play.
  #ensure() {
    if (this.#ctx) return this.#ctx;
    if (typeof AudioContext === 'undefined') return null;
    this.#ctx = new AudioContext();
    this.#rack = new Rack(this.#ctx, this.volume);
    return this.#ctx;
  }

  #load(song: Song) {
    let score = this.#scores.get(song.id);
    if (!score) {
      score = song.pattern
        ? Promise.resolve(fromPattern(song.pattern))
        : (
            packedBytes('music/' + song.id + '.mid') ??
            fetch(import.meta.env.BASE_URL + 'music/' + song.id + '.mid?v=' + song.rev).then((response) => {
              if (!response.ok) throw new Error('HTTP ' + response.status);
              return response.arrayBuffer();
            })
          ).then((buffer) => fromMidi(parseMidi(buffer)));
      this.#scores.set(song.id, score);
      // A failed download is tried again the next time the song is chosen.
      score.catch(() => this.#scores.delete(song.id));
    }
    return score;
  }

  // Runs every few milliseconds and hands over the cues that fall due shortly.
  // Hidden tabs get their timers slowed down, so they look much further ahead.
  #tick = () => {
    const ctx = this.#ctx;
    const score = this.#score;
    if (!ctx || !score) return;
    const now = ctx.currentTime;
    const horizon = now + (document.hidden ? 1.6 : 0.2);
    while (this.#cursor < score.cues.length && this.#origin + score.cues[this.#cursor].t < horizon) {
      const cue = score.cues[this.#cursor++];
      const at = this.#origin + cue.t;
      // After a stall, skip what is already in the past instead of playing it all at once.
      if (at > now - 0.06) this.#rack!.play(cue, Math.max(at, now));
    }
    if (now > this.#origin + score.seconds + 1.2) this.skip(1);
  };

  /** Starts the current song at the given position. */
  #begin(score: Score, from: number) {
    const ctx = this.#ctx!;
    this.#score = score;
    this.#rack!.reset(score.step);
    this.#origin = ctx.currentTime + 0.08 - from;
    this.#cursor = 0;
    while (this.#cursor < score.cues.length && score.cues[this.#cursor].t < from) {
      const cue = score.cues[this.#cursor++];
      // Chords held across the new position carry on from here.
      const left = cue.t + cue.d - from;
      if (cue.voice === 'pad' && left > 0.3) this.#rack!.play(cue, ctx.currentTime + 0.08, left);
    }
  }

  /** Play the given song from its start, or carry on with the current one. */
  play(index = this.index) {
    const ctx = this.#ensure();
    if (!ctx) return;
    void ctx.resume();
    this.playing = true;
    this.#timer ??= setInterval(this.#tick, 25);
    if (index === this.index && !this.#fresh) return;

    this.index = index;
    this.#fresh = false;
    this.#score = null;
    this.#origin = ctx.currentTime;
    this.#rack!.reset(0.125);
    this.failed = false;
    this.loading = true;
    const turn = ++this.#turn;
    this.#load(songs[index]).then(
      (score) => {
        if (turn !== this.#turn) return;
        this.loading = false;
        this.#begin(score, 0);
      },
      () => {
        if (turn !== this.#turn) return;
        this.loading = false;
        this.failed = true;
        this.pause();
        this.#fresh = true;
      }
    );
  }

  pause() {
    clearInterval(this.#timer);
    this.#timer = undefined;
    void this.#ctx?.suspend();
    this.playing = false;
  }

  stop() {
    this.#turn++;
    this.loading = false;
    this.#fresh = true;
    this.playing = false;
    clearInterval(this.#timer);
    this.#timer = undefined;
    // Let the sound fade before the clock stops, so nothing is left hanging for the next play.
    this.#rack?.reset(0.125);
    setTimeout(() => {
      if (!this.playing) void this.#ctx?.suspend();
    }, 120);
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Move to another song: keeps playing if something was playing. */
  skip(by: number) {
    const index = (this.index + by + songs.length) % songs.length;
    if (this.playing) {
      this.#fresh = true;
      this.play(index);
    } else {
      this.#turn++;
      this.index = index;
      this.#fresh = true;
      this.failed = false;
    }
  }

  /** Jump to a position in the current song, in seconds. */
  seek(seconds: number) {
    if (!this.#score || this.#fresh) return;
    this.#begin(this.#score, Math.min(Math.max(0, seconds), this.#score.seconds));
  }

  setVolume(volume: number) {
    this.volume = volume;
    this.#rack?.setVolume(volume);
  }

  /** Seconds into the current song. The context clock stops while paused. */
  elapsed() {
    if (!this.#ctx || !this.#score || this.#fresh) return 0;
    return Math.min(this.#score.seconds, Math.max(0, this.#ctx.currentTime - this.#origin));
  }
}

export const player = new Player();
