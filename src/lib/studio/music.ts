"use client";

// Free, generated soundtrack for videos — pure Web Audio, no files, no API.
// Each mood is a small synth graph (pads / drone / arps) built into an
// AudioContext. We can route it to the speakers (live preview) and/or to a
// MediaStreamDestination so it can be muxed into the exported video file.

export type Mood = "none" | "ambient" | "cinematic" | "lofi" | "epic";

export const MUSIC_MOODS: { value: Mood; label: string }[] = [
  { value: "none", label: "No music" },
  { value: "ambient", label: "Ambient ✨" },
  { value: "cinematic", label: "Cinematic 🎬" },
  { value: "lofi", label: "Lo-fi 🎧" },
  { value: "epic", label: "Epic 🥁" },
];

export type MusicHandle = { stream: MediaStream | null; stop: () => void };

type AC = typeof AudioContext;

function getAC(): AC | null {
  if (typeof window === "undefined") return null;
  return (window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext) || null;
}

// Frequencies (Hz) for a few pleasant chords.
const CHORDS: Record<Exclude<Mood, "none">, number[]> = {
  ambient: [110, 164.81, 220, 329.63], // A minor-ish pad
  cinematic: [98, 146.83, 196, 293.66], // G suspended, wide
  lofi: [130.81, 155.56, 196, 261.63], // C minor 7 warmth
  epic: [65.41, 98, 130.81, 196], // low C power drone
};

function buildGraph(ctx: AudioContext, out: GainNode, mood: Exclude<Mood, "none">) {
  const chord = CHORDS[mood];
  const now = ctx.currentTime;

  // Warm lowpass on the whole thing.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = mood === "lofi" ? 1400 : mood === "epic" ? 2600 : 2000;
  filter.connect(out);

  // Sustained pad: a couple of detuned oscillators per chord note.
  chord.forEach((freq, idx) => {
    for (let d = 0; d < 2; d++) {
      const osc = ctx.createOscillator();
      osc.type = mood === "epic" ? "sawtooth" : mood === "lofi" ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = (d === 0 ? -6 : 6) + idx;
      const g = ctx.createGain();
      g.gain.value = 0.0;
      // Slow swell in.
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.12 / chord.length, now + 1.2 + idx * 0.15);
      // Gentle LFO on gain for movement.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + idx * 0.02;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.04 / chord.length;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      lfo.start(now);
    }
  });

  // Rhythmic pulse for lo-fi / epic (a soft repeating low thump via gain LFO).
  if (mood === "lofi" || mood === "epic") {
    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = "sine";
    pulseOsc.frequency.value = mood === "epic" ? 55 : 70;
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.0001;
    const beat = ctx.createOscillator(); // ~1.1 Hz => ~66 bpm feel
    beat.frequency.value = mood === "epic" ? 1.0 : 1.3;
    const beatShaper = ctx.createGain();
    beatShaper.gain.value = 0.25;
    beat.connect(beatShaper);
    beatShaper.connect(pulseGain.gain);
    pulseOsc.connect(pulseGain);
    pulseGain.connect(out);
    pulseOsc.start(now);
    beat.start(now);
  }
}

// Start a mood. Returns a handle with an audio stream (for muxing) + stop().
export function startMood(mood: Mood, opts?: { toSpeakers?: boolean }): MusicHandle | null {
  if (mood === "none") return null;
  const ACtor = getAC();
  if (!ACtor) return null;
  let ctx: AudioContext;
  try {
    ctx = new ACtor();
  } catch {
    return null;
  }
  try {
    void ctx.resume();
  } catch {
    /* ignore */
  }

  const master = ctx.createGain();
  master.gain.value = 0.28;

  let stream: MediaStream | null = null;
  try {
    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    stream = dest.stream;
  } catch {
    stream = null;
  }
  if (opts?.toSpeakers) {
    try {
      master.connect(ctx.destination);
    } catch {
      /* ignore */
    }
  }

  try {
    buildGraph(ctx, master, mood);
  } catch {
    try {
      ctx.close();
    } catch {
      /* ignore */
    }
    return null;
  }

  return {
    stream,
    stop: () => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    },
  };
}
