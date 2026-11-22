#!/usr/bin/env python3
"""Turns a folder of songs into the MIDI files the media player performs.

Each song is split into vocals, bass, drums and the rest (Demucs). The vocal
line becomes the melody and the bass stem the bass line (Basic Pitch), the rest
gives one chord per half bar, and the drum stem gives kick, snare and hi-hat
hits. Everything is snapped to a sixteenth-note grid fitted to the recording.

    python scripts/music.py ~/Music/songs            # every song
    python scripts/music.py ~/Music/songs --only 24  # titles containing "24"

Writes public/music/<id>.mid and src/lib/os/music.json. Needs ffmpeg and, in
Python: torch, demucs, basic-pitch (ONNX), librosa, mido, soundfile.
The folder layout is "<year> [<unit> - ]<album>/<nn> - <title>.mp3".
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'music'
INDEX = ROOT / 'src' / 'lib' / 'os' / 'music.json'

SR = 44100
TICKS = 480  # per beat; a sixteenth step is 120 ticks


def decode(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()


def separate(model, audio):
    import torch
    from demucs.apply import apply_model

    wav = torch.from_numpy(audio)
    ref = wav.mean(0)
    mean, std = ref.mean(), ref.std() + 1e-8
    with torch.no_grad():
        out = apply_model(model, ((wav - mean) / std)[None], split=True, overlap=0.1, shifts=0, progress=False)[0]
    out = out * std + mean
    return {name: out[i].mean(0).numpy() for i, name in enumerate(model.sources)}


def resample(y, sr):
    import librosa
    return librosa.resample(y, orig_sr=SR, target_sr=sr, res_type='soxr_hq')


# ---------------------------------------------------------------- the grid

def fit_tempo(drums, rest):
    """Returns (bpm, time of a beat). Studio recordings keep one exact tempo, so a
    single period and phase are fitted to the whole song."""
    import librosa

    sr, hop = 22050, 128
    fps = sr / hop
    env = librosa.onset.onset_strength(y=resample(drums, sr), sr=sr, hop_length=hop)
    if env.max() < 1e-3 or np.percentile(env, 99) < 0.5:
        env = librosa.onset.onset_strength(y=resample(rest, sr), sr=sr, hop_length=hop)
    env = np.maximum(env - np.median(env), 0)
    guess = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=env, sr=sr, hop_length=hop, start_bpm=120))[0])
    while guess < 80:
        guess *= 2
    while guess >= 180:
        guess /= 2
    t = np.arange(len(env)) / fps
    bins = 48

    def fold(bpm):
        period = 60 / bpm
        hist = np.bincount(((t % period) / period * bins).astype(int) % bins, weights=env, minlength=bins)
        return hist

    def sharp(bpm):
        hist = fold(bpm)
        return float((hist ** 2).sum())

    best = max(np.arange(guess * 0.95, guess * 1.05, 0.02), key=sharp)
    best = max(np.arange(best - 0.03, best + 0.03, 0.001), key=sharp)
    # Producers work at whole (sometimes half) tempos; prefer one when it fits as well.
    for snap in (round(best), round(best * 2) / 2):
        if abs(snap - best) < 0.08 and sharp(snap) > sharp(best) * 0.97:
            best = float(snap)
            break
    hist = fold(best)
    smooth = hist + np.roll(hist, 1) + np.roll(hist, -1)
    k = int(np.argmax(smooth))
    # Centre of mass around the peak bin, for sub-bin precision.
    offs = np.array([-1, 0, 1])
    w = hist[(k + offs) % bins]
    phase = ((k + 0.5 + float((w * offs).sum() / max(w.sum(), 1e-9))) / bins) * (60 / best)
    return float(best), float(phase % (60 / best)), float(sharp(best) / max(sharp(best * 1.013), 1e-9))


def band_rise(y, sr, bands, n_fft=2048, hop=256):
    """For each (low Hz, high Hz, from ms, to ms) band: how many dB the energy just
    after each moment (the from..to window) stands above the energy just before it.
    A kick's click is over in a few milliseconds while a snare's noise lasts, so
    the window is what tells a snare from the click of a kick."""
    import librosa
    power = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop)) ** 2
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    fps = sr / hop
    out = []
    for lo, hi, start, stop in bands:
        energy = power[(freqs >= lo) & (freqs < hi)].sum(0)
        level = 10 * np.log10(energy + energy.max() * 1e-5 + 1e-12)
        total = np.concatenate([[0], np.cumsum(level)])

        def mean(a, b):  # mean of level over frames [i+a, i+b)
            i = np.arange(len(level))
            lo_i = np.clip(i + a, 0, len(level))
            hi_i = np.clip(i + b, 0, len(level))
            return (total[hi_i] - total[lo_i]) / np.maximum(hi_i - lo_i, 1)

        after = mean(int(round(start / 1000 * fps)), int(round(stop / 1000 * fps)) + 1)
        before = mean(-int(round(0.07 * fps)), -int(round(0.012 * fps)))
        out.append(np.maximum(after - before, 0))
    return out, fps


def per_step(curve, fps, t0, step, count, reach=0.4):
    """The peak of a curve around each grid step."""
    out = np.zeros(count)
    for s in range(count):
        centre = t0 + s * step
        a = int(max(0, round((centre - reach * step) * fps)))
        b = int(min(len(curve), round((centre + reach * step) * fps) + 1))
        if b > a:
            out[s] = curve[a:b].max()
    return out


def chroma_per(y, sr, edges):
    """One chroma vector per span between consecutive edges (seconds)."""
    import librosa
    hop = 1024
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop, fmin=librosa.note_to_hz('C1'), n_octaves=6)
    fps = sr / hop
    out = np.zeros((len(edges) - 1, 12))
    for i in range(len(edges) - 1):
        a = int(max(0, round(edges[i] * fps)))
        b = int(min(chroma.shape[1], round(edges[i + 1] * fps)))
        if b > a:
            out[i] = np.median(chroma[:, a:b], axis=1)
    return out


# ---------------------------------------------------------------- the notes

def transcribe(pitch_model, y, lo, hi, onset=0.5, frame=0.3, shortest=90):
    import soundfile
    from basic_pitch.inference import predict

    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        soundfile.write(tmp.name, resample(y, 22050), 22050)
        _, _, events = predict(
            tmp.name, pitch_model, onset_threshold=onset, frame_threshold=frame,
            minimum_note_length=shortest, minimum_frequency=lo, maximum_frequency=hi, melodia_trick=True,
        )
    return [(float(a), float(b), int(p), float(v)) for a, b, p, v, _ in events]


def single_line(events, t0, step, count, floor, prefer_low=False):
    """Snaps notes to the grid and keeps one voice: where notes overlap, the
    louder one wins (or the lower one, for a bass line)."""
    owner = [None] * count
    notes = []
    for a, b, pitch, vel in events:
        if vel < floor:
            continue
        s = int(round((a - t0) / step))
        e = max(s + 1, int(round((b - t0) / step)))
        if e <= 0 or s >= count:
            continue
        notes.append([max(s, 0), min(e, count), pitch, vel])
    notes.sort(key=lambda n: (n[0], -n[3]))
    rank = (lambda n: (-n[2], n[3])) if prefer_low else (lambda n: (n[3], n[1] - n[0]))
    for i, n in enumerate(notes):
        for s in range(n[0], n[1]):
            if owner[s] is None or rank(n) > rank(notes[owner[s]]):
                owner[s] = i
    out = []
    s = 0
    while s < count:
        i = owner[s]
        if i is None:
            s += 1
            continue
        e = s
        while e < count and owner[e] == i:
            e += 1
        out.append([s, e - s, notes[i][2], notes[i][3]])
        s = e
    return out


def tidy_melody(notes):
    """Drops the debris a transcriber leaves behind: blips between two longer
    notes, octave slips and stray notes far from everything around them."""
    if not notes:
        return notes
    pitches = np.array([n[2] for n in notes])
    centre = np.median(pitches)
    out = []
    for i, n in enumerate(notes):
        near = pitches[max(0, i - 6): i + 7]
        local = np.median(near)
        pitch = n[2]
        # Fold octave errors back towards the surrounding line.
        while pitch - local > 9:
            pitch -= 12
        while local - pitch > 9:
            pitch += 12
        if abs(pitch - centre) > 19:
            continue
        out.append([n[0], n[1], int(pitch), n[3]])
    # A one-step note a semitone off between two notes of the same pitch is a scoop, not a note.
    merged = []
    for n in out:
        if merged and n[2] == merged[-1][2] and n[0] == merged[-1][0] + merged[-1][1] and n[1] == 1 and merged[-1][1] <= 2 and n[3] < merged[-1][3] * 0.8:
            merged[-1][1] += 1
            continue
        merged.append(n)
    out = []
    for i, n in enumerate(merged):
        if 0 < i < len(merged) - 1 and n[1] == 1:
            before, after = merged[i - 1], merged[i + 1]
            touching = before[0] + before[1] == n[0] and n[0] + 1 == after[0]
            if touching and before[2] == after[2] and abs(n[2] - before[2]) <= 1 and n[3] < max(before[3], after[3]):
                out[-1][1] += 1
                continue
        out.append(list(n))
    return out


MAJOR = np.zeros(12)
MAJOR[[0, 4, 7]] = [1.0, 0.8, 0.9]
MINOR = np.zeros(12)
MINOR[[0, 3, 7]] = [1.0, 0.8, 0.9]


def chords_from(chroma, bass_pc, loud):
    """One triad per span, picked by template match and smoothed so the harmony
    does not flicker. Returns (root, minor) or None where there is no harmony."""
    n = len(chroma)
    scores = np.zeros((n, 24))
    for c in range(24):
        template = np.roll(MINOR if c >= 12 else MAJOR, c % 12)
        template = template / np.linalg.norm(template)
        scores[:, c] = chroma @ template
    norms = np.linalg.norm(chroma, axis=1) + 1e-9
    scores /= norms[:, None]
    for i in range(n):
        if bass_pc[i] is not None:
            for c in range(24):
                root, third = c % 12, (c % 12 + (3 if c >= 12 else 4)) % 12
                if root == bass_pc[i]:
                    scores[i, c] += 0.18
                elif third == bass_pc[i] or (root + 7) % 12 == bass_pc[i]:
                    scores[i, c] += 0.05
    stay = 0.06
    best = np.zeros((n, 24))
    back = np.zeros((n, 24), int)
    best[0] = scores[0]
    for i in range(1, n):
        hop = best[i - 1].max() - stay
        keep = best[i - 1]
        back[i] = np.where(keep >= hop, np.arange(24), best[i - 1].argmax())
        best[i] = np.maximum(keep, hop) + scores[i]
    path = [int(best[-1].argmax())]
    for i in range(n - 1, 0, -1):
        path.append(int(back[i][path[-1]]))
    path.reverse()
    return [(c % 12, c >= 12) if loud[i] else None for i, c in enumerate(path)]


# ---------------------------------------------------------------- one song

def analyse(path, demucs_model, pitch_model):
    import librosa

    audio = decode(path)
    seconds = audio.shape[1] / SR
    stems = separate(demucs_model, audio)
    rest = stems['other'] + stems['bass']

    bpm, phase, confidence = fit_tempo(stems['drums'], rest)
    beat = 60 / bpm
    step = beat / 4
    beats = int((seconds - phase) / beat)

    # Which beat is the "one": chords change there, kicks land there, snares do not.
    (kick_f, snare_f, hat_f), fps = band_rise(stems['drums'], SR, [(35, 105, 6, 60), (1800, 5500, 18, 95), (8000, 16000, 0, 24)])
    beat_edges = phase + beat * np.arange(beats + 1)
    beat_chroma = chroma_per(resample(rest, 22050), 22050, beat_edges)
    unit = beat_chroma / (np.linalg.norm(beat_chroma, axis=1, keepdims=True) + 1e-9)
    change = np.r_[0, 1 - (unit[1:] * unit[:-1]).sum(1)]
    kick_b = per_step(kick_f, fps, phase, beat, beats, 0.12)
    snare_b = per_step(snare_f, fps, phase, beat, beats, 0.12)

    def z(v):
        return (v - v.mean()) / (v.std() + 1e-9)

    votes = [z(change)[p::4].mean() + 0.6 * z(kick_b)[p::4].mean() - 0.6 * z(snare_b)[p::4].mean() for p in range(4)]
    one = int(np.argmax(votes))
    t0 = phase + one * beat
    t0 -= np.ceil(t0 / (4 * beat)) * 4 * beat  # the bar line at or just before the start
    bars = int(np.ceil((seconds - t0) / (4 * beat)))
    steps = bars * 16

    # Drums, as a strength per step.
    def hits(curve, least, reach=0.4):
        """least: the rise in dB below which nothing counts as a hit."""
        v = per_step(curve, fps, t0, step, steps, reach)
        strong = v[v >= least]
        if len(strong) < 4:
            return np.zeros(steps)
        top = max(np.percentile(strong, 90), least + 3)
        v = np.clip((v - least * 0.6) / (top - least * 0.6), 0, 1) * (v >= least)
        # Keep a step only when it is the local peak, so one hit is not counted twice.
        keep = (v > 0) & (v >= np.r_[v[1:], 0] * 0.999) & (v > np.r_[0, v[:-1]] * 0.6)
        return np.where(keep, v, 0)

    drum_level = float(np.sqrt((stems['drums'] ** 2).mean()))
    if drum_level > 0.004:
        kick = hits(kick_f, 9)
        snare = hits(snare_f, 9)
        hat = hits(hat_f, 8)
        hat[snare > 0] = 0
    else:
        kick = snare = hat = np.zeros(steps)

    # Melody and bass.
    melody = single_line(transcribe(pitch_model, stems['vocals'], 140, 1100, onset=0.5, frame=0.3), t0, step, steps, floor=0.28)
    melody = tidy_melody(melody)
    bass = single_line(transcribe(pitch_model, stems['bass'], 30, 270, onset=0.45, frame=0.25, shortest=70), t0, step, steps, floor=0.22, prefer_low=True)
    for n in bass:
        while n[2] > 52:
            n[2] -= 12
        while n[2] < 28:
            n[2] += 12

    # Chords, one per half bar.
    spans = bars * 2
    edges = t0 + 2 * beat * np.arange(spans + 1)
    chroma = chroma_per(resample(rest, 22050), 22050, np.clip(edges, 0, seconds))
    hop = int(SR * 2 * beat)
    start = int(t0 * SR)
    level = np.array([
        np.sqrt((rest[max(0, start + i * hop): max(0, start + (i + 1) * hop)] ** 2).mean()) if start + (i + 1) * hop > 0 else 0
        for i in range(spans)
    ])
    level = np.nan_to_num(level)
    loud = level > max(0.006, 0.12 * np.percentile(level, 90))
    bass_pc = []
    for i in range(spans):
        weight = np.zeros(12)
        for s, length, pitch, vel in bass:
            over = min(s + length, (i + 1) * 8) - max(s, i * 8)
            if over > 0:
                weight[pitch % 12] += over * (1.5 if s == i * 8 else 1)
        bass_pc.append(int(weight.argmax()) if weight.sum() > 0 else None)
    chords = chords_from(chroma, bass_pc, loud)

    # Loudness per bar, so the performance can swell with the song.
    mix = audio.mean(0)
    bar_len = int(SR * 4 * beat)
    energy = np.array([
        np.sqrt((mix[max(0, start + i * bar_len): max(0, start + (i + 1) * bar_len)] ** 2).mean()) if start + (i + 1) * bar_len > 0 else 0
        for i in range(bars)
    ])
    energy = np.nan_to_num(energy)
    energy = np.clip(energy / (np.percentile(energy, 95) + 1e-9), 0, 1)

    # How well the melody agrees with the recording: share of sung steps whose
    # pitch class is the strongest or second strongest in the vocal stem there.
    agree = None
    if melody:
        voc = librosa.feature.chroma_cqt(y=resample(stems['vocals'], 22050), sr=22050, hop_length=512)
        vfps = 22050 / 512
        good = total = 0
        for s, length, pitch, _ in melody:
            a = int(max(0, (t0 + s * step) * vfps))
            b = int(min(voc.shape[1], (t0 + (s + length) * step) * vfps))
            if b > a:
                order = np.argsort(voc[:, a:b].mean(1))[::-1]
                total += length
                good += length if pitch % 12 in order[:2] else 0
        agree = good / max(total, 1)

    return {
        'bpm': bpm, 'seconds': seconds, 't0': t0, 'bars': bars, 'steps': steps, 'confidence': confidence,
        'melody': melody, 'bass': bass, 'chords': chords, 'kick': kick, 'snare': snare, 'hat': hat,
        'energy': energy, 'agree': agree, 'votes': votes,
    }


# ---------------------------------------------------------------- writing

def write_midi(song, title, path):
    import mido

    # Start at the first bar that has anything in it.
    used = [n[0] for n in song['melody'] + song['bass']]
    used += [i * 8 for i, c in enumerate(song['chords']) if c]
    used += [int(s) for s in np.nonzero(song['kick'] + song['snare'] + song['hat'])[0]]
    shift = (min(used) // 16) * 16 if used else 0
    tick = TICKS // 4

    mid = mido.MidiFile(type=1, ticks_per_beat=TICKS, charset='utf-8')
    head = mido.MidiTrack()
    head.append(mido.MetaMessage('track_name', name=title, time=0))
    head.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(song['bpm']), time=0))
    head.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
    mid.tracks.append(head)

    def track(name, channel, program, notes):
        events = []
        for start, length, pitch, vel in notes:
            a = (start - shift) * tick
            if a < 0:
                continue
            events.append((a, 1, pitch, int(np.clip(round(vel * 127), 1, 127))))
            events.append((a + max(1, int(length * tick) - 1), 0, pitch, 0))
        events.sort(key=lambda e: (e[0], e[1]))
        out = mido.MidiTrack()
        out.append(mido.MetaMessage('track_name', name=name, time=0))
        if program is not None:
            out.append(mido.Message('program_change', channel=channel, program=program, time=0))
        now = 0
        for at, on, pitch, vel in events:
            out.append(mido.Message('note_on' if on else 'note_off', channel=channel, note=pitch, velocity=vel, time=at - now))
            now = at
        mid.tracks.append(out)
        return now

    end = track('Melody', 0, 11, [[s, l, p, 0.45 + 0.55 * min(1, v)] for s, l, p, v in song['melody']])
    end = max(end, track('Bass', 1, 38, [[s, l, p, 0.5 + 0.5 * min(1, v)] for s, l, p, v in song['bass']]))

    # Chords: each tone placed between G3 and F#4, which keeps the voices close together.
    pads = []
    i = 0
    chords = song['chords']
    while i < len(chords):
        j = i
        while j < len(chords) and chords[j] == chords[i]:
            j += 1
        if chords[i]:
            root, minor = chords[i]
            level = float(np.mean(song['energy'][i // 2: max(i // 2 + 1, (j + 1) // 2)]))
            for interval in (0, 3 if minor else 4, 7):
                pads.append([i * 8, (j - i) * 8, 55 + (root + interval - 55) % 12, 0.35 + 0.6 * level])
        i = j
    end = max(end, track('Chords', 2, 89, pads))

    drums = []
    for name, pitch in (('kick', 36), ('snare', 38), ('hat', 42)):
        for s in np.nonzero(song[name])[0]:
            drums.append([int(s), 0.5, pitch, 0.35 + 0.65 * float(song[name][s])])
    end = max(end, track('Drums', 9, None, drums))

    head.append(mido.MetaMessage('end_of_track', time=end))
    mid.save(path)
    return end / TICKS * 60 / song['bpm']


def slug(text):
    inner = re.search(r'\(([\x20-\x7e]+)\)', text)
    base = inner.group(1) if inner and not re.search(r'[A-Za-z0-9]', re.sub(r'\(.*?\)', '', text)) else text
    base = base.replace('@%', 'alpha percent').replace('&', ' and ')
    return re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', type=Path)
    parser.add_argument('--only', help='only songs whose path contains this text')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--redo', action='store_true', help='transcribe songs again even when their MIDI file exists')
    args = parser.parse_args()

    files = sorted(args.folder.rglob('*.mp3'))
    if args.only:
        files = [f for f in files if args.only.lower() in str(f).lower()]
    if args.limit:
        files = files[: args.limit]
    if not files:
        sys.exit('No mp3 files found.')

    import torch
    from basic_pitch import FilenameSuffix, build_icassp_2022_model_path
    from basic_pitch.inference import Model
    from demucs.pretrained import get_model

    torch.set_num_threads(os.cpu_count() or 4)
    demucs_model = get_model('htdemucs')
    demucs_model.eval()
    pitch_path = build_icassp_2022_model_path(FilenameSuffix.onnx)
    pitch_model = Model(pitch_path)
    if pitch_model.model_type != Model.MODEL_TYPES.ONNX:
        raise RuntimeError(f'Basic Pitch selected {pitch_model.model_type.name} for {pitch_path}. ONNX is required.')

    OUT.mkdir(parents=True, exist_ok=True)
    index = {entry['id']: entry for entry in (json.loads(INDEX.read_text()) if INDEX.exists() else [])}
    for number, file in enumerate(files, 1):
        began = time.time()
        year, _, rest = file.parent.name.partition(' ')
        unit, sep, album = rest.partition(' - ')
        if not sep:
            unit, album = '', rest
        track_no, _, title = file.stem.partition(' - ')
        ident = slug(album) + '-' + slug(title) if slug(album) != slug(title) else slug(title)
        target = OUT / (ident + '.mid')
        if target.exists() and ident in index and not (args.redo or args.only):
            continue

        song = analyse(file, demucs_model, pitch_model)
        seconds = write_midi(song, title, target)
        index[ident] = {
            'id': ident, 'title': title, 'album': album, 'unit': unit, 'year': int(year), 'track': int(track_no),
            'bpm': round(song['bpm'], 3), 'seconds': round(seconds, 1),
            'rev': hashlib.sha1(target.read_bytes()).hexdigest()[:8],
        }
        chords = ' '.join(
            'C C# D D# E F F# G G# A A# B'.split()[c[0]] + ('m' if c[1] else '') if c else '-' for c in song['chords'][16:32]
        )
        print(
            f"[{number}/{len(files)}] {ident}: {song['bpm']:.3f} bpm (fit {song['confidence']:.2f}), {song['bars']} bars, "
            f"melody {len(song['melody'])} (agree {song['agree'] if song['agree'] is None else round(song['agree'], 2)}), "
            f"bass {len(song['bass'])}, kick {int((song['kick'] > 0).sum())}, snare {int((song['snare'] > 0).sum())}, "
            f"hat {int((song['hat'] > 0).sum())}, {target.stat().st_size} bytes, {time.time() - began:.0f}s\n      chords: {chords}",
            flush=True,
        )
        ordered = sorted(index.values(), key=lambda e: (e['year'], e['album'], e['track']))
        INDEX.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
