// Reads a standard MIDI file into a flat list of notes, timed in seconds.
// Only what scripts/music.py writes is needed: notes and tempo.

export interface MidiNote {
  channel: number;
  pitch: number;
  /** 0..1 */
  velocity: number;
  /** Seconds from the start. */
  time: number;
  length: number;
}

export interface Midi {
  notes: MidiNote[];
  /** Beats per minute at the start. */
  bpm: number;
  seconds: number;
}

export function parseMidi(buffer: ArrayBuffer): Midi {
  const data = new DataView(buffer);
  let at = 0;

  const text = (length: number) => {
    let out = '';
    for (let i = 0; i < length; i++) out += String.fromCharCode(data.getUint8(at++));
    return out;
  };
  // A number stored seven bits at a time; the top bit says another byte follows.
  const variable = () => {
    let value = 0;
    for (;;) {
      const byte = data.getUint8(at++);
      value = (value << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
  };

  if (text(4) !== 'MThd') throw new Error('Not a MIDI file');
  const headerLength = data.getUint32(at);
  const trackCount = data.getUint16(at + 6);
  const division = data.getUint16(at + 8);
  at += 4 + headerLength;
  if (division & 0x8000) throw new Error('SMPTE time is not supported');

  const tempos: { tick: number; micros: number }[] = [];
  const raw: { channel: number; pitch: number; velocity: number; tick: number; ticks: number }[] = [];

  for (let track = 0; track < trackCount && at < data.byteLength; track++) {
    if (text(4) !== 'MTrk') throw new Error('Broken MIDI track');
    const end = at + 4 + data.getUint32(at);
    at += 4;
    let tick = 0;
    let status = 0;
    const open = new Map<number, { tick: number; velocity: number }>();
    while (at < end) {
      tick += variable();
      // A data byte here means the previous status byte still applies.
      if (data.getUint8(at) & 0x80) {
        status = data.getUint8(at);
        at++;
      }
      if (status === 0xff) {
        const type = data.getUint8(at++);
        const length = variable();
        if (type === 0x51) tempos.push({ tick, micros: (data.getUint8(at) << 16) | (data.getUint8(at + 1) << 8) | data.getUint8(at + 2) });
        at += length;
      } else if (status === 0xf0 || status === 0xf7) {
        at += variable();
      } else {
        const kind = status & 0xf0;
        const channel = status & 0x0f;
        const first = data.getUint8(at++);
        const second = kind === 0xc0 || kind === 0xd0 ? 0 : data.getUint8(at++);
        const key = (channel << 8) | first;
        if (kind === 0x90 && second > 0) {
          open.set(key, { tick, velocity: second / 127 });
        } else if (kind === 0x80 || kind === 0x90) {
          const start = open.get(key);
          if (start) {
            raw.push({ channel, pitch: first, velocity: start.velocity, tick: start.tick, ticks: tick - start.tick });
            open.delete(key);
          }
        }
      }
    }
    at = end;
  }

  tempos.sort((a, b) => a.tick - b.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, micros: 500_000 });
  // Seconds elapsed at the start of each tempo section.
  const starts = [0];
  for (let i = 1; i < tempos.length; i++) {
    starts.push(starts[i - 1] + ((tempos[i].tick - tempos[i - 1].tick) / division) * (tempos[i - 1].micros / 1e6));
  }
  const seconds = (tick: number) => {
    let i = tempos.length - 1;
    while (i > 0 && tempos[i].tick > tick) i--;
    return starts[i] + ((tick - tempos[i].tick) / division) * (tempos[i].micros / 1e6);
  };

  const notes = raw
    .map((note) => {
      const time = seconds(note.tick);
      return { channel: note.channel, pitch: note.pitch, velocity: note.velocity, time, length: seconds(note.tick + note.ticks) - time };
    })
    .sort((a, b) => a.time - b.time);
  const last = notes.reduce((end, note) => Math.max(end, note.time + note.length), 0);
  return { notes, bpm: 60e6 / tempos[0].micros, seconds: last };
}
