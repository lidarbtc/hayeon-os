// A score is the list of cues the synth plays: which voice, when, how long, which
// pitch and how hard. Remixes come from MIDI files; the three house tunes come
// from short step patterns.

import type { Midi } from './midi';

export type Voice = 'lead' | 'bass' | 'pad' | 'pluck' | 'chime' | 'kick' | 'snare' | 'hat';

export interface Cue {
  voice: Voice;
  /** Seconds from the start of the song. */
  t: number;
  /** Length in seconds. */
  d: number;
  /** MIDI pitch. */
  p: number;
  /** Strength, 0..1. */
  v: number;
}

export interface Score {
  cues: Cue[];
  seconds: number;
  /** Length of a sixteenth note in seconds. */
  step: number;
}

/** A looping tune written as sixteen-step patterns. */
export interface Pattern {
  title: string;
  bpm: number;
  /** One entry per bar: the bass note and the chord tones the arpeggio picks from (MIDI numbers). */
  bars: { bass: number; tones: number[] }[];
  /** In arp a digit picks a chord tone and a dot is a rest. Elsewhere an x plays and a dot rests. */
  arp: string;
  bassLine: string;
  kick: string;
  snare: string;
  hat: string;
  /** Hold each bar's chord underneath. */
  pad: boolean;
  /** How many times the bars repeat. */
  loops: number;
}

function finish(cues: Cue[], step: number): Score {
  cues.sort((a, b) => a.t - b.t);
  const seconds = cues.reduce((end, cue) => Math.max(end, cue.t + (cue.voice === 'pad' || cue.voice === 'lead' || cue.voice === 'bass' ? cue.d : step)), 0);
  return { cues, seconds, step };
}

const DRUMS: Record<number, Voice> = { 36: 'kick', 38: 'snare', 42: 'hat' };

// Up and back down through the chord over two octaves.
const CLIMB = [0, 1, 2, 3, 4, 5, 4, 3];

/**
 * Builds the remix from a MIDI file written by scripts/music.py: channel 0 is the
 * melody, 1 the bass, 2 the chords and 9 the drums. On top of what was
 * transcribed it adds a plucked arpeggio that follows the chords and a run of
 * chimes wherever the song lifts.
 */
export function fromMidi(midi: Midi): Score {
  const step = 60 / midi.bpm / 4;
  const cues: Cue[] = [];
  // Chord tones that start together, in time order.
  const chords: { t: number; d: number; v: number; tones: number[] }[] = [];

  for (const note of midi.notes) {
    const base = { t: note.time, d: note.length, p: note.pitch, v: note.velocity };
    if (note.channel === 0) cues.push({ voice: 'lead', ...base });
    else if (note.channel === 1) cues.push({ voice: 'bass', ...base });
    else if (note.channel === 2) {
      cues.push({ voice: 'pad', ...base });
      const last = chords[chords.length - 1];
      if (last && Math.abs(last.t - note.time) < step / 4) last.tones.push(note.pitch);
      else chords.push({ t: note.time, d: note.length, v: note.velocity, tones: [note.pitch] });
    } else if (note.channel === 9 && DRUMS[note.pitch]) cues.push({ voice: DRUMS[note.pitch], ...base, d: step });
  }

  let before: (typeof chords)[number] | undefined;
  for (const chord of chords) {
    const tones = [...chord.tones].sort((a, b) => a - b);
    const ladder = [...tones, ...tones.map((tone) => tone + 12)];
    // The chord's strength follows how loud the song is there: 0 in the quietest bars, 1 in the loudest.
    const lift = Math.min(1, Math.max(0, (chord.v - 0.35) / 0.6));
    // Quiet passages get a sparse arpeggio, loud ones a busy one.
    const every = lift < 0.35 ? 4 : lift < 0.62 ? 2 : 1;
    const count = Math.round(chord.d / step);
    for (let i = 0; i < count; i += every) {
      cues.push({ voice: 'pluck', t: chord.t + i * step, d: step, p: ladder[CLIMB[(i / every) % CLIMB.length] % ladder.length] + 12, v: 0.3 + 0.6 * lift });
    }
    // A sweep of chimes where the music returns after a pause or steps up in strength.
    const gap = before ? chord.t - (before.t + before.d) : Infinity;
    if (gap > step * 8 || (before && chord.v - before.v > 0.14)) {
      for (let i = 0; i < 6; i++) {
        cues.push({ voice: 'chime', t: chord.t + (i * step) / 2, d: step * 6, p: ladder[i % ladder.length] + 24, v: 0.5 + 0.4 * lift });
      }
    }
    before = chord;
  }
  return finish(cues, step);
}

export function fromPattern(pattern: Pattern): Score {
  const step = 60 / pattern.bpm / 4;
  const cues: Cue[] = [];
  const total = pattern.bars.length * pattern.loops;
  for (let index = 0; index < total; index++) {
    const bar = pattern.bars[index % pattern.bars.length];
    const start = index * 16 * step;
    if (pattern.pad) for (const tone of bar.tones) cues.push({ voice: 'pad', t: start, d: 16 * step, p: tone, v: 0.6 });
    if (index % pattern.bars.length === 0 && index % (pattern.bars.length * 4) === 0) {
      bar.tones.forEach((tone, i) => cues.push({ voice: 'chime', t: start + (i * step) / 2, d: step * 6, p: tone + 24, v: 0.6 }));
    }
    for (let at = 0; at < 16; at++) {
      const t = start + at * step;
      const pick = pattern.arp[at];
      if (pick !== '.') {
        // Picks past the end of the chord climb an octave.
        const n = Number(pick);
        cues.push({ voice: 'pluck', t, d: step * 2, p: bar.tones[n % bar.tones.length] + 12 * Math.floor(n / bar.tones.length), v: 0.75 });
      }
      if (pattern.bassLine[at] === 'x') cues.push({ voice: 'bass', t, d: step * 1.7, p: bar.bass, v: 0.8 });
      if (pattern.kick[at] === 'x') cues.push({ voice: 'kick', t, d: step, p: 36, v: 0.85 });
      if (pattern.snare[at] === 'x') cues.push({ voice: 'snare', t, d: step, p: 38, v: 0.7 });
      if (pattern.hat[at] === 'x') cues.push({ voice: 'hat', t, d: step, p: 42, v: 0.6 });
    }
  }
  return finish(cues, step);
}
