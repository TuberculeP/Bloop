# Complete Music Theory Reference for Algorithmic Composition

> A comprehensive reference for synthesizing professional-sounding music from code.

---

## 1. Pitch, Intervals & Frequency

### Equal Temperament (12-TET)
Every note relates to A4 = 440Hz by: `f = 440 × 2^((midi - 69) / 12)`

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

### Critical Rule
Consonance hierarchy: Unison > Octave > P5 > P4 > M3/m3 > M6/m6 > M2/m2 > Tritone

---

## 2. Scales & Modes

### Scale Formulas (intervals in semitones from root)

| Scale              | Intervals                   | Emotion / Use                 |
|--------------------|-----------------------------|-------------------------------|
| Major (Ionian)     | 0,2,4,5,7,9,11             | Happy, bright, resolved       |
| Natural Minor      | 0,2,3,5,7,8,10             | Sad, dark, introspective      |
| Dorian             | 0,2,3,5,7,9,10             | Jazzy minor, hopeful darkness |
| Phrygian           | 0,1,3,5,7,8,10             | Spanish, exotic, tense        |
| Lydian             | 0,2,4,6,7,9,11             | Dreamy, floating, cinematic   |
| Mixolydian         | 0,2,4,5,7,9,10             | Bluesy major, rock            |
| Aeolian            | 0,2,3,5,7,8,10             | = Natural Minor                |
| Locrian            | 0,1,3,5,6,8,10             | Unstable, diminished, rare    |
| Minor Pentatonic   | 0,3,5,7,10                 | Universal, lo-fi, chill       |
| Major Pentatonic   | 0,2,4,7,9                  | Bright, folk, pop             |
| Blues               | 0,3,5,6,7,10               | Blues, soul, grit             |
| Whole Tone         | 0,2,4,6,8,10               | Dreamlike, ambiguous          |
| Harmonic Minor     | 0,2,3,5,7,8,11             | Dramatic, classical, Middle Eastern |
| Melodic Minor (asc)| 0,2,3,5,7,9,11             | Jazz, sophisticated           |

### Emotional Key Associations
- **C major**: Pure, simple, innocent
- **D minor**: Melancholy, serious, pious
- **Eb major**: Heroic, bold, love
- **E minor**: Grief, restlessness
- **F major**: Pastoral, calm
- **G minor**: Discontent, seriousness
- **A minor**: Tender, plaintive
- **Bb major**: Cheerful, optimistic

---

## 3. Chords & Harmony

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

### Diatonic Chords (built on each scale degree)

**In Major Key**: I(maj) ii(min) iii(min) IV(maj) V(maj) vi(min) vii°(dim)
**In Minor Key**: i(min) ii°(dim) III(maj) iv(min) v(min) VI(maj) VII(maj)

### Essential Chord Progressions

**Pop / Universal**:
- **I - V - vi - IV** (the "four chord song" — Axis of Awesome progression)
- **vi - IV - I - V** (same chords, sadder rotation)
- **I - IV - V - I** (classic resolution)
- **I - vi - IV - V** (50s/doo-wop)

**Lo-Fi / Neo-Soul / Chill**:
- **ii7 - V7 - Imaj7** (jazz ii-V-I, the gold standard)
- **Imaj7 - vi7 - ii7 - V7** (smooth cycle)
- **Imaj7 - IVmaj7 - iii7 - vi7** (dreamy descending)
- **i7 - iv7 - VII7 - III7** (minor key chill)

**Ambient / Atmospheric**:
- **Imaj7 → IVmaj7** (two-chord float, evolve with timbre)
- **Sustained single chord** with textural evolution
- **Modal interchange** (borrow chords from parallel minor/major)

**Emotional / Cinematic**:
- **i - VI - III - VII** (epic minor, Adele-style)
- **I - iii - vi - IV** (bittersweet major)
- **i - iv - v - i** (pure minor, tragic)

### Voice Leading Rules
1. Move each voice the shortest distance possible (prefer stepwise motion)
2. Avoid parallel 5ths and octaves between voices
3. Common tones between chords should be held (not moved)
4. Leading tone (7th degree) resolves UP to tonic
5. 7th of a chord resolves DOWN by step
6. Avoid voice crossing (soprano stays above alto, etc.)

---

## 4. Melody Writing

### Contour Shapes
- **Arch** (rise then fall): Most natural, used in ~60% of melodies
- **Inverted Arch** (fall then rise): Creates tension-to-resolution
- **Ascending**: Building energy, anticipation
- **Descending**: Resolving, calming, closure
- **Wave/Oscillating**: Playful, exploratory

### Rules for Good Melodies
1. **Primarily stepwise motion** (70-80% of notes should be step, not leap)
2. **Leaps followed by opposite-direction step** (compensating motion)
3. **Single climax point** — usually 2/3 through the phrase
4. **Rhythmic variety** — mix long and short notes
5. **Start and end on chord tones** (root, 3rd, 5th) for stability
6. **Non-chord tones** (passing, neighbor, suspension) create interest between chord tones
7. **Repetition with variation** — repeat motifs but alter rhythm, pitch, or contour
8. **Breathing room** — include rests, don't fill every beat

### Motif Development Techniques
- **Sequence**: Repeat pattern at different pitch level
- **Inversion**: Flip intervals (up becomes down)
- **Retrograde**: Play motif backwards
- **Augmentation**: Stretch rhythmic values (double durations)
- **Diminution**: Compress rhythmic values (halve durations)
- **Fragmentation**: Use only part of the motif

### Tension/Resolution Map
- **Tension builders**: Non-chord tones, syncopation, ascending motion, chromatic notes, wider intervals
- **Resolution**: Return to chord tones, tonic, descending motion, stepwise, rhythmic downbeats

---

## 5. Rhythm, Groove & Humanization

### Time Signatures
- **4/4**: Standard pop/electronic (the vast majority)
- **3/4**: Waltz, ballad
- **6/8**: Compound feel, flowing
- **7/8**: Unusual, progressive

### Beat Hierarchy in 4/4
- Beat 1: STRONGEST (downbeat)
- Beat 3: Strong
- Beat 2: Weak (backbeat — snare in pop/rock)
- Beat 4: Weak (backbeat — snare)
- Off-beats ("and"s): Weakest → great for syncopation

### Drum Pattern Fundamentals

**Standard Electronic 4/4**:
```
Kick:   X . . . X . . . X . . . X . . .
Snare:  . . . . X . . . . . . . X . . .
HiHat:  X . X . X . X . X . X . X . X .
```

**Lo-Fi / Boom-Bap** (slightly swung):
```
Kick:   X . . . . . X . X . . . . . . .
Snare:  . . . . X . . . . . . . X . . .
HiHat:  X . X . X . X . X . X . X . X .
```

### Humanization Techniques (CRITICAL for non-robotic sound)

1. **Timing Jitter**: Offset note start times by ±5-20ms randomly
   - Laid-back feel: notes slightly late (+5 to +15ms)
   - Urgent feel: notes slightly early (-5 to -10ms)

2. **Velocity Variation**: Never use constant velocity
   - Strong beats: 90-127 velocity
   - Weak beats: 60-90 velocity
   - Ghost notes: 20-50 velocity
   - Random ±5-15% variation on top

3. **Swing**: Delay every other 8th/16th note
   - Subtle swing: 55-58% ratio (vs. 50% = straight)
   - Medium swing: 58-62%
   - Heavy shuffle: 62-67%
   - Triplet feel: 66.7%

4. **Micro-dynamics**: Slight volume automation, filter movement

### Groove Template Approach
Record or define a "groove" as timing + velocity offsets per beat position, then apply to all programmed parts for cohesive feel.

---

## 6. Song Structure

### Standard Structures

**Pop/Electronic (ABABCB)**:
Intro (4-8 bars) → Verse (8-16) → Chorus (8) → Verse (8-16) → Chorus (8) → Bridge (8) → Chorus (8) → Outro (4-8)

**Lo-Fi / Instrumental**:
Intro (4) → A Section (8-16) → B Section (8-16) → A' (varied repeat) → B' → Outro (4-8)

**Build/Drop (EDM)**:
Intro → Build → Drop → Breakdown → Build → Drop → Outro

### Section Energy Map
- **Intro**: ~40% energy, establish mood
- **Verse**: ~50%, narrative
- **Pre-Chorus**: ~65%, building
- **Chorus**: ~90-100%, peak
- **Bridge**: ~60%, contrast
- **Outro**: Fade from peak to silence

### Arrangement Principles
- **Add/subtract elements** between sections (don't change everything at once)
- **4 or 8 bar phrases** — almost always
- **New element every 4-8 bars** to maintain interest
- **Call and response** between instruments
- **Tension arcs**: Build across 8-16 bars, release on section boundary

---

## 7. Bass Lines

### Fundamental Patterns

**Root-Fifth**: Alternating root and 5th — simple, strong foundation
**Walking Bass**: Stepwise motion connecting chord tones — jazz, neo-soul
**Octave Bounce**: Root in low and high octave — dance, funk
**Arpeggiated**: Play chord tones sequentially — elegant, ambient
**Pedal Tone**: Hold one note while chords change above — builds tension

### Bass Writing Rules
1. Root on beat 1 of each chord change (anchor the harmony)
2. Approach target notes by half-step or whole-step
3. Use chord tones on strong beats, passing tones on weak beats
4. Keep bass mostly in 40-200Hz range (fundamental)
5. Syncopation adds groove — push or pull off the beat
6. Leave space — rests are part of the bass line

---

## 8. Vocal Synthesis (Formant-Based)

### How Vowels Work Acoustically
The voice produces a **source signal** (vocal cord vibration — a rich harmonic buzz) which is then **filtered** by the vocal tract (throat, mouth, tongue position). The resonant peaks of this filter are called **formants**.

### Vowel Formant Frequencies (Hz)

| Vowel | F1 (Hz) | F2 (Hz) | F3 (Hz) | Example Word |
|-------|---------|---------|---------|-------------|
| /a/   | 730     | 1090    | 2440    | "father"    |
| /ɛ/   | 530     | 1840    | 2480    | "bet"       |
| /i/   | 270     | 2290    | 3010    | "beat"      |
| /o/   | 570     | 840     | 2410    | "boat"      |
| /u/   | 300     | 870     | 2240    | "boot"      |
| /æ/   | 660     | 1720    | 2410    | "bat"       |
| /ʌ/   | 640     | 1190    | 2390    | "but"       |
| /ɪ/   | 390     | 1990    | 2550    | "bit"       |

### Formant Synthesis Algorithm
1. Generate **source signal**: sawtooth or pulse wave at desired pitch (simulates vocal cords)
2. Apply **parallel band-pass filters** at F1, F2, F3 frequencies with appropriate bandwidths
3. **F1 bandwidth**: ~60-80 Hz, **F2**: ~70-100 Hz, **F3**: ~100-150 Hz
4. Sum the filtered outputs with relative amplitudes: F1 strongest, F2 ~-10dB, F3 ~-20dB
5. Apply **vibrato**: ±5-8Hz pitch modulation, ~2-4% depth
6. Apply **amplitude envelope** to shape syllables

### Vowel Morphing
To transition between vowels, **interpolate** all three formant frequencies linearly (or with easing curves) over the transition duration. 50-150ms transition time sounds natural.

### Consonant Approximations
- **S/SH**: Filtered white noise (high-pass for S, band-pass lower for SH)
- **T/P/K**: Very short noise burst with specific spectral shape
- **M/N**: Low sine with nasal resonance (~250-300Hz emphasis)
- **L/R**: Brief formant glide

---

## 9. Mixing & Frequency Balance

### Frequency Spectrum Allocation

| Range         | Hz          | Instruments                    | Treatment                |
|---------------|-------------|--------------------------------|--------------------------|
| Sub-Bass      | 20-60       | Kick fundamental, sub bass     | Mono, minimal content    |
| Bass          | 60-250      | Bass, kick body                | Mono below 120Hz         |
| Low Mids      | 250-500     | Bass overtones, warmth         | Cut to reduce mud        |
| Midrange      | 500-2000    | Vocals, synth body, guitars    | Most important for clarity|
| Upper Mids    | 2-6kHz      | Vocal presence, attack         | Boost for clarity        |
| Presence      | 6-10kHz     | Brilliance, sibilance          | Careful — can be harsh   |
| Air           | 10-20kHz    | Sparkle, breathiness           | Subtle boost for sheen   |

### Mixing Rules
1. **Cut before boost** — remove problems before adding color
2. **Kick and bass must not fight** — sidechain or frequency-split them
3. **Panning**: Bass & kick = center. Spread everything else for width.
4. **Volume balance**: Start with the most important element and build around it
5. **High-pass filter everything** that doesn't need low end (removes rumble/mud)
6. **-6dB headroom** before mastering

### Dynamic Processing
- **Compression ratio 2:1-4:1**: Gentle glue for most tracks
- **4:1-8:1**: Aggressive for drums, bass
- **Fast attack**: Tames transients (more controlled)
- **Slow attack**: Lets transients through (more punchy)
- **Sidechain compression**: Duck one sound when another plays (kick ducks bass)

---

## 10. Production Polish

### Reverb Types & Uses
- **Room**: Small, intimate, natural (vocal, drums)
- **Hall**: Large, spacious, cinematic (pads, strings)
- **Plate**: Dense, metallic sheen (vocals, snare)
- **Spring**: Vintage, surf-rock character
- **Shimmer**: Pitch-shifted reverb tail — ambient, ethereal

### Delay Types
- **Slapback** (50-120ms): Rockabilly, thickness
- **1/8 note**: Rhythmic echo, dance music
- **1/4 note**: Spacious, ambient
- **Ping-pong**: Alternates L/R — width and movement
- **Dotted 1/8**: Creates syncopated feel against straight rhythm

### Stereo Width Techniques
- Pan complementary elements opposite (e.g., two guitars L/R)
- Stereo chorus/unison detune for synths
- Mid-side EQ: boost highs on sides for "air"
- Haas effect: 10-30ms delay on one side = perceived width
- Keep low frequencies mono (below ~120Hz)

### The Loudness Curve (Equal-Loudness Contours)
Human ears are less sensitive to very low and very high frequencies at lower volumes. At moderate listening levels, boost bass slightly and add high-end presence to compensate.

---

## Sources
- Native Instruments Blog: Pop Chord Progressions, Song Structure 101
- Wikipedia: Voice Leading, Song Structure, Chord Progression, Formant
- Berklee Online: Voice Leading Paradigms
- MasterClass: Songwriting 101, Common Song Structures
- EDMProd: Advanced Melodies, Bass Line Tips
- LANDR Blog: Mastering EQ, Bassline Styles
- Sound on Sound: Formant Synthesis
- Production Music Live: Humanizing MIDI
- Unison Audio: EDM Chord Progressions, Humanize MIDI
- LedgerNote: Musical Key Characteristics & Emotions
- StudyBass: Common Bass Patterns
- iZotope: Humanizing Drums
- Soundbridge: Formants & Vowel Sounds
- Audio Issues: EQ Cheat Sheet