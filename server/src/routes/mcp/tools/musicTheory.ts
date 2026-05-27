const SECTIONS: Record<string, string> = {
  pitch: `## Pitch, Intervals & Frequency

### Equal Temperament (12-TET)
Every note relates to A4 = 440Hz by: f = 440 × 2^((midi - 69) / 12)

### Interval Names & Semitone Distances
| Semitones | Interval        | Sound Quality          |
|-----------|-----------------|------------------------|
| 0         | Unison          | Identity               |
| 1         | Minor 2nd       | Harsh, dissonant       |
| 2         | Major 2nd       | Mild tension           |
| 3         | Minor 3rd       | Sad, dark              |
| 4         | Major 3rd       | Happy, bright          |
| 5         | Perfect 4th     | Open, suspended        |
| 6         | Tritone         | Maximum tension        |
| 7         | Perfect 5th     | Stable, powerful       |
| 8         | Minor 6th       | Bittersweet            |
| 9         | Major 6th       | Warm, sweet            |
| 10        | Minor 7th       | Bluesy, tension        |
| 11        | Major 7th       | Dreamy, jazzy tension  |
| 12        | Octave          | Identity (higher)      |

### Bloop Pitch Encoding (y-axis)
y=0 → B7 (highest), y=86 → C0 (lowest).
Key reference points:
- C5=27, B4=28, A4=30, G4=32, F4=34, E4=35, D4=37, C4=39 (middle C)
- B3=40, A3=42, G3=44, F3=46, E3=47, D3=49, C3=51
- Formula: y = (7 - octave) * 12 + offset, where offsets: C=0, D=2, E=4, F=5, G=7, A=9, B=11... then subtract from 86 for C0 base
- Simpler: C4=39, every semitone UP = y-1, every semitone DOWN = y+1`,

  scales: `## Scales & Modes

### Scale Formulas (intervals in semitones from root)
| Scale              | Intervals                   | Emotion / Use                 |
|--------------------|-----------------------------|-------------------------------|
| Major (Ionian)     | 0,2,4,5,7,9,11             | Happy, bright, resolved       |
| Natural Minor      | 0,2,3,5,7,8,10             | Sad, dark, introspective      |
| Dorian             | 0,2,3,5,7,9,10             | Jazzy minor, hopeful darkness |
| Phrygian           | 0,1,3,5,7,8,10             | Spanish, exotic, tense        |
| Lydian             | 0,2,4,6,7,9,11             | Dreamy, floating, cinematic   |
| Mixolydian         | 0,2,4,5,7,9,10             | Bluesy major, rock            |
| Locrian            | 0,1,3,5,6,8,10             | Unstable, diminished, rare    |
| Minor Pentatonic   | 0,3,5,7,10                 | Universal, lo-fi, chill       |
| Major Pentatonic   | 0,2,4,7,9                  | Bright, folk, pop             |
| Blues               | 0,3,5,6,7,10               | Blues, soul, grit             |
| Whole Tone         | 0,2,4,6,8,10               | Dreamlike, ambiguous          |
| Harmonic Minor     | 0,2,3,5,7,8,11             | Dramatic, classical           |
| Melodic Minor (asc)| 0,2,3,5,7,9,11             | Jazz, sophisticated           |

### Emotional Key Associations
- C major: Pure, simple, innocent
- D minor: Melancholy, serious, pious
- Eb major: Heroic, bold, love
- E minor: Grief, restlessness
- F major: Pastoral, calm
- G minor: Discontent, seriousness
- A minor: Tender, plaintive
- Bb major: Cheerful, optimistic`,

  chords: `## Chords & Harmony

### Chord Construction
| Chord Type       | Formula (semitones) | Sound                     |
|------------------|---------------------|---------------------------|
| Major            | 0, 4, 7            | Happy, bright             |
| Minor            | 0, 3, 7            | Sad, introspective        |
| Diminished       | 0, 3, 6            | Tense, unstable           |
| Augmented        | 0, 4, 8            | Mysterious, unsettled     |
| Sus2             | 0, 2, 7            | Open, airy                |
| Sus4             | 0, 5, 7            | Suspended, anticipating   |
| Major 7th        | 0, 4, 7, 11        | Dreamy, jazzy, lush       |
| Minor 7th        | 0, 3, 7, 10        | Smooth, mellow, lo-fi     |
| Dominant 7th     | 0, 4, 7, 10        | Bluesy, wants resolution  |
| Minor 9th        | 0, 3, 7, 10, 14    | Neo-soul, sophisticated   |
| Add9             | 0, 4, 7, 14        | Shimmery, modern          |

### Diatonic Chords
In Major Key: I(maj) ii(min) iii(min) IV(maj) V(maj) vi(min) vii°(dim)
In Minor Key: i(min) ii°(dim) III(maj) iv(min) v(min) VI(maj) VII(maj)

### Essential Chord Progressions
**Pop / Universal**:
- I - V - vi - IV (the "four chord song")
- vi - IV - I - V (same chords, sadder rotation)
- I - IV - V - I (classic resolution)

**Lo-Fi / Neo-Soul / Chill**:
- ii7 - V7 - Imaj7 (jazz ii-V-I, the gold standard)
- Imaj7 - vi7 - ii7 - V7 (smooth cycle)
- Imaj7 - IVmaj7 - iii7 - vi7 (dreamy descending)
- i7 - iv7 - VII7 - III7 (minor key chill)

**Ambient / Atmospheric**:
- Imaj7 → IVmaj7 (two-chord float)
- Modal interchange (borrow from parallel minor/major)

**Emotional / Cinematic**:
- i - VI - III - VII (epic minor)
- I - iii - vi - IV (bittersweet major)
- i - iv - v - i (pure minor, tragic)

### Voice Leading Rules
1. Move each voice the shortest distance possible (prefer stepwise)
2. Avoid parallel 5ths and octaves
3. Common tones should be held
4. Leading tone (7th degree) resolves UP to tonic
5. 7th of a chord resolves DOWN by step`,

  melody: `## Melody Writing

### Contour Shapes
- Arch (rise then fall): Most natural, ~60% of melodies
- Inverted Arch (fall then rise): tension-to-resolution
- Ascending: Building energy
- Descending: Resolving, calming
- Wave/Oscillating: Playful, exploratory

### Rules for Good Melodies
1. Primarily stepwise motion (70-80% steps, not leaps)
2. Leaps followed by opposite-direction step
3. Single climax point — usually 2/3 through the phrase
4. Rhythmic variety — mix long and short notes
5. Start and end on chord tones (root, 3rd, 5th)
6. Non-chord tones (passing, neighbor, suspension) add interest
7. Repetition with variation — repeat motifs but alter rhythm/pitch
8. Breathing room — include rests

### Motif Development
- Sequence: Repeat pattern at different pitch level
- Inversion: Flip intervals (up becomes down)
- Retrograde: Play motif backwards
- Augmentation: Stretch rhythmic values (double durations)
- Diminution: Compress rhythmic values (halve durations)
- Fragmentation: Use only part of the motif`,

  rhythm: `## Rhythm, Groove & Humanization

### Beat Hierarchy in 4/4
- Beat 1: STRONGEST (downbeat)
- Beat 3: Strong
- Beat 2 & 4: Weak (backbeat — snare in pop/rock)
- Off-beats ("and"s): Weakest → great for syncopation

### Drum Pattern Fundamentals
Standard Electronic 4/4:
  Kick:   X . . . X . . . X . . . X . . .
  Snare:  . . . . X . . . . . . . X . . .
  HiHat:  X . X . X . X . X . X . X . X .

Lo-Fi / Boom-Bap (slightly swung):
  Kick:   X . . . . . X . X . . . . . . .
  Snare:  . . . . X . . . . . . . X . . .
  HiHat:  X . X . X . X . X . X . X . X .

### Humanization (CRITICAL for non-robotic sound)
1. Timing Jitter: Offset note start times by ±5-20ms randomly
2. Velocity Variation: Never use constant velocity
   - Strong beats: 90-127 velocity
   - Weak beats: 60-90 velocity
   - Ghost notes: 20-50 velocity
3. Swing: Delay every other 8th note
   - Subtle: 55-58% ratio | Medium: 58-62% | Heavy shuffle: 62-67%
4. Micro-dynamics: Slight volume automation

### Bloop Timing (at 120 BPM, 4 cols/measure)
- 1 measure = 4 columns
- 1 quarter note = 1 column (w:1)
- 1 eighth note = 0.5 cols (use w:1 minimum)
- 1 half note = 2 columns (w:2)
- 1 whole note = 4 columns (w:4)
- Dotted quarter = 1.5 columns (w:1.5)`,

  structure: `## Song Structure

### Standard Structures
**Pop/Electronic (ABABCB)**:
Intro (4-8 bars) → Verse (8-16) → Chorus (8) → Verse (8-16) → Chorus (8) → Bridge (8) → Chorus (8) → Outro (4-8)

**Lo-Fi / Instrumental**:
Intro (4) → A Section (8-16) → B Section (8-16) → A' (varied repeat) → B' → Outro (4-8)

**Build/Drop (EDM)**:
Intro → Build → Drop → Breakdown → Build → Drop → Outro

### Section Energy Map
- Intro: ~40% energy, establish mood
- Verse: ~50%, narrative
- Pre-Chorus: ~65%, building
- Chorus: ~90-100%, peak
- Bridge: ~60%, contrast
- Outro: Fade from peak to silence

### Arrangement Principles
- Add/subtract elements between sections
- 4 or 8 bar phrases — almost always
- New element every 4-8 bars to maintain interest
- Call and response between instruments
- Tension arcs: Build across 8-16 bars, release on section boundary`,

  bass: `## Bass Lines

### Fundamental Patterns
- Root-Fifth: Alternating root and 5th — simple, strong
- Walking Bass: Stepwise motion connecting chord tones — jazz, neo-soul
- Octave Bounce: Root in low and high octave — dance, funk
- Arpeggiated: Play chord tones sequentially — elegant, ambient
- Pedal Tone: Hold one note while chords change — builds tension

### Bass Writing Rules
1. Root on beat 1 of each chord change (anchor the harmony)
2. Approach target notes by half-step or whole-step
3. Chord tones on strong beats, passing tones on weak beats
4. Keep bass mostly in 40-200Hz range
5. Syncopation adds groove — push or pull off the beat
6. Leave space — rests are part of the bass line`,

  mixing: `## Mixing & Frequency Balance

### Frequency Spectrum Allocation
| Range         | Hz          | Instruments                    |
|---------------|-------------|--------------------------------|
| Sub-Bass      | 20-60       | Kick fundamental, sub bass     |
| Bass          | 60-250      | Bass, kick body                |
| Low Mids      | 250-500     | Bass overtones, warmth         |
| Midrange      | 500-2000    | Vocals, synth body             |
| Upper Mids    | 2-6kHz      | Vocal presence, attack         |
| Presence      | 6-10kHz     | Brilliance, sibilance          |
| Air           | 10-20kHz    | Sparkle, breathiness           |

### Mixing Rules
1. Cut before boost — remove problems before adding color
2. Kick and bass must not fight — sidechain or frequency-split
3. Panning: Bass & kick = center. Spread everything else.
4. High-pass filter everything that doesn't need low end
5. -6dB headroom before mastering

### Dynamic Processing
- 2:1-4:1 compression: Gentle glue for most tracks
- 4:1-8:1: Aggressive for drums, bass
- Fast attack: Tames transients | Slow attack: More punchy`,

  production: `## Production Polish

### Reverb Types & Uses
- Room: Small, intimate (vocal, drums)
- Hall: Large, spacious, cinematic (pads, strings)
- Plate: Dense, metallic sheen (vocals, snare)
- Shimmer: Pitch-shifted reverb tail — ambient, ethereal

### Delay Types
- Slapback (50-120ms): Thickness
- 1/4 note: Spacious, ambient
- Ping-pong: Alternates L/R — width and movement
- Dotted 1/8: Syncopated feel

### Stereo Width
- Pan complementary elements opposite (e.g. two guitars L/R)
- Stereo chorus/unison detune for synths
- Keep low frequencies mono (below ~120Hz)
- Haas effect: 10-30ms delay on one side = perceived width`,
};

const ALL_SECTIONS = Object.values(SECTIONS).join("\n\n---\n\n");

export const getMusicTheoryTool = {
  name: "get_music_theory",
  description:
    "Returns a music theory reference for algorithmic composition in the bloop DAW. " +
    "Call this before composing to get pitch encoding rules, scale formulas, chord progressions, " +
    "melody writing rules, rhythm patterns, song structure guidelines, and mixing tips. " +
    "Available sections: pitch, scales, chords, melody, rhythm, structure, bass, mixing, production. " +
    "Omit 'section' to get the full reference.",
  inputSchema: {
    type: "object" as const,
    properties: {
      section: {
        type: "string",
        description:
          "Optional section to retrieve: pitch | scales | chords | melody | rhythm | structure | bass | mixing | production",
        enum: [
          "pitch",
          "scales",
          "chords",
          "melody",
          "rhythm",
          "structure",
          "bass",
          "mixing",
          "production",
        ],
      },
    },
    required: [],
  },
  async execute(args: Record<string, unknown>) {
    const { section } = args as { section?: string };
    if (section && SECTIONS[section]) {
      return { section, content: SECTIONS[section] };
    }
    return { content: ALL_SECTIONS };
  },
};
