import { ref, computed, watch, onScopeDispose } from "vue";
import { useTimelineStore } from "../../stores/timelineStore";
import { useTrackAudioStore } from "../../stores/trackAudioStore";
import { useProjectStore } from "../../stores/projectStore";
import { useAudioBusStore } from "../../stores/audioBusStore";
import { useAudioLibraryStore } from "../../stores/audioLibraryStore";
import type {
  Track,
  MidiNote,
  AudioClip,
  NoteName,
} from "../../lib/utils/types";
import { getAutomationValueAt } from "../../lib/audio/automation";
import { noteIndexToName } from "../../lib/audio/pianoRollConstants";
import {
  TICKS_PER_BEAT,
  ticksPerBar,
  ticksPerSecond,
} from "../../lib/audio/timeGrid";
import { createSchedulerClock } from "../../lib/audio/schedulerClock";

export interface PlaybackEmit {
  (
    e: "note-start",
    note: MidiNote,
    noteName: NoteName,
    position: number,
    trackId: string,
  ): void;
  (
    e: "note-end",
    note: MidiNote,
    noteName: NoteName,
    position: number,
    trackId: string,
  ): void;
}

export interface LoopEndHandlers {
  /** Asked when scheduling reaches the loop end: true stops there instead of looping. */
  shouldStop: () => boolean;
  /** Called once the loop end is actually reached, after `shouldStop` returned true. */
  onReached: () => void;
}

// Scheduling ahead on the audio clock ("A Tale of Two Clocks"): a timer wakes
// every SCHEDULER_INTERVAL_MS and hands the engines every event of the next
// LOOKAHEAD_SECONDS with its exact AudioContext time. Timing therefore no
// longer depends on frame rate or main-thread hiccups. requestAnimationFrame
// only draws the cursor.
const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;
// Delay between pressing play and the first note, so the first window is
// scheduled before it is due.
const START_DELAY_SECONDS = 0.05;
// Automation is sampled at this period and smoothed by the engines.
const AUTOMATION_STEP_SECONDS = 0.02;
const EPSILON_TICKS = 1e-6;
const EIGHTH_NOTE_TICKS = TICKS_PER_BEAT / 2;

// A stretch of playback at constant tempo: tick `startTick` plays at
// AudioContext time `startTime`. A new segment starts on each loop and tempo
// change.
interface Segment {
  startTime: number;
  startTick: number;
  ticksPerSec: number;
}

interface ScheduledNote {
  trackId: string;
  note: MidiNote;
  noteName: NoteName;
  // null while held: its note-off is not scheduled yet.
  offTime: number | null;
}

interface ScheduledClip {
  trackId: string;
  clipId: string;
  offTime: number | null;
}

interface UiNoteEvent {
  time: number;
  type: "note-start" | "note-end";
  note: MidiNote;
  noteName: NoteName;
  tick: number;
  trackId: string;
}

/**
 * Moteur de playback : scheduling des notes/clips, métronome, automation et
 * effets synchronisés au tempo sur l'horloge audio, curseur en rAF.
 * `loopEnd` lets the caller (export) stop at the loop end instead of looping,
 * and `onStop` is called on every stopPlayback (voice recording finalizes
 * there); both avoid circular dependencies with those composables.
 */
export function useTimelinePlaybackEngine(
  emit: PlaybackEmit,
  colWidth: () => number,
  trackHeaderWidth: number,
  loopEnd: LoopEndHandlers,
  onStop?: () => void,
) {
  const timelineStore = useTimelineStore();
  const trackAudioStore = useTrackAudioStore();
  const projectStore = useProjectStore();
  const audioBusStore = useAudioBusStore();
  const audioLibraryStore = useAudioLibraryStore();

  const isPlaying = ref(false);
  const currentPosition = ref(0);
  const checkpointPosition = ref(0);
  const animationFrameId = ref<number | null>(null);

  // Scheduler state, non-reactive (read and written up to 40 times a second).
  let segments: Segment[] = [];
  // Every event at or before this tick of the last segment is scheduled.
  let scheduledTick = 0;
  let automationScheduledUntil = 0;
  // AudioContext time at which playback stops (loop end with shouldStop).
  let endTime: number | null = null;
  // Notes and clips whose note-off is not scheduled or still in the future:
  // stopping or seeking must cancel them, including those not started yet.
  const scheduledNotes = new Map<string, ScheduledNote>();
  const scheduledClips = new Map<string, ScheduledClip>();
  let uiEvents: UiNoteEvent[] = [];

  const cursorStyle = computed(() => ({
    transform: `translateX(${currentPosition.value * colWidth() + trackHeaderWidth}px)`,
  }));

  const checkpointStyle = computed(() => ({
    left: `${checkpointPosition.value * colWidth() + trackHeaderWidth}px`,
  }));

  const loopEndPosition = computed(() => {
    let lastEnd = 0;

    for (const track of timelineStore.getPlayableTracks()) {
      for (const note of track.notes) {
        const noteEnd = note.x + note.w;
        if (noteEnd > lastEnd) lastEnd = noteEnd;
      }
      for (const clip of track.clips ?? []) {
        const clipEnd = clip.x + clip.w;
        if (clipEnd > lastEnd) lastEnd = clipEnd;
      }
    }

    if (lastEnd === 0) return timelineStore.project.cols;
    const barLength = ticksPerBar(timelineStore.timeSignature);
    return Math.ceil(lastEnd / barLength) * barLength;
  });

  const ctx = () => audioBusStore.audioContext;

  const tickToTime = (segment: Segment, tick: number): number =>
    segment.startTime + (tick - segment.startTick) / segment.ticksPerSec;

  const timeToTick = (segment: Segment, time: number): number =>
    segment.startTick + (time - segment.startTime) * segment.ticksPerSec;

  const currentSegment = (): Segment => segments[segments.length - 1];

  const positionAtTime = (time: number): number => {
    let segment = segments[0];
    for (const candidate of segments) {
      if (candidate.startTime <= time) segment = candidate;
    }
    return Math.max(segment.startTick, timeToTick(segment, time));
  };

  // AudioContext time of what the speakers output right now: currentTime
  // runs ahead of the output by the device latency.
  const heardTime = (): number => {
    const audioContext = ctx();
    const timestamp = audioContext.getOutputTimestamp?.();
    if (timestamp?.contextTime && timestamp.performanceTime) {
      const extrapolated =
        timestamp.contextTime +
        (performance.now() - timestamp.performanceTime) / 1000;
      return Math.min(extrapolated, audioContext.currentTime);
    }
    return audioContext.currentTime - (audioContext.outputLatency || 0);
  };

  // ============================================
  // Event scheduling
  // ============================================

  const scheduleNoteOn = (track: Track, note: MidiNote, time: number) => {
    const noteName = noteIndexToName(note.y);
    trackAudioStore.playNoteOnTrack(
      track.id,
      noteName,
      note.i,
      note.v ?? 100,
      time,
    );
    scheduledNotes.set(`${track.id}_${note.i}`, {
      trackId: track.id,
      note,
      noteName,
      offTime: null,
    });
    uiEvents.push({
      time,
      type: "note-start",
      note,
      noteName,
      tick: note.x,
      trackId: track.id,
    });
  };

  const scheduleNoteOff = (entry: ScheduledNote, time: number) => {
    trackAudioStore.stopNoteOnTrack(entry.trackId, entry.note.i, time);
    entry.offTime = time;
    uiEvents.push({
      time,
      type: "note-end",
      note: entry.note,
      noteName: entry.noteName,
      tick: entry.note.x + entry.note.w,
      trackId: entry.trackId,
    });
  };

  const scheduleClipOn = (
    track: Track,
    clip: AudioClip,
    offsetTicks: number,
    time: number,
  ) => {
    trackAudioStore.playClipOnTrack(track.id, clip, offsetTicks, time);
    scheduledClips.set(`${track.id}_${clip.id}`, {
      trackId: track.id,
      clipId: clip.id,
      offTime: null,
    });
  };

  const scheduleClipOff = (entry: ScheduledClip, time: number) => {
    trackAudioStore.stopClipOnTrack(entry.trackId, entry.clipId, time);
    entry.offTime = time;
  };

  // Metronome click straight to the output, bypassing the master bus (no
  // EQ/reverb, not captured by the export).
  const playMetronomeClick = (accent: boolean, when?: number) => {
    const audioContext = ctx();
    const time = Math.max(when ?? 0, audioContext.currentTime);
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.value = accent ? 1500 : 1000;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(gain).connect(audioContext.destination);
    osc.onended = () => gain.disconnect();
    osc.start(time);
    osc.stop(time + 0.06);
  };

  // Schedules every event whose tick falls in (fromTick, toTick] of `segment`.
  const scheduleRange = (
    segment: Segment,
    fromTick: number,
    toTick: number,
  ) => {
    const time = (tick: number) => tickToTime(segment, tick);
    const seenNotes = new Set<string>();
    const seenClips = new Set<string>();

    for (const track of timelineStore.getPlayableTracks()) {
      for (const note of track.notes) {
        const key = `${track.id}_${note.i}`;
        seenNotes.add(key);
        const noteEnd = note.x + note.w;
        let entry = scheduledNotes.get(key);

        if (note.x > fromTick && note.x <= toTick && entry?.offTime !== null) {
          scheduleNoteOn(track, note, time(note.x));
          entry = scheduledNotes.get(key);
        }
        // No lower bound: also stops a held note shortened behind the cursor.
        if (entry && entry.offTime === null && noteEnd <= toTick) {
          scheduleNoteOff(entry, time(noteEnd));
        }
      }

      if (track.instrument.type !== "audioTrack") continue;
      for (const clip of track.clips ?? []) {
        const key = `${track.id}_${clip.id}`;
        seenClips.add(key);
        const clipEnd = clip.x + clip.w;
        let entry = scheduledClips.get(key);

        if (clip.x > fromTick && clip.x <= toTick && entry?.offTime !== null) {
          scheduleClipOn(track, clip, 0, time(clip.x));
          entry = scheduledClips.get(key);
        }
        if (entry && entry.offTime === null && clipEnd <= toTick) {
          scheduleClipOff(entry, time(clipEnd));
        }
      }
    }

    // Held notes/clips deleted (or on a track muted) since they started.
    for (const [key, entry] of scheduledNotes) {
      if (entry.offTime === null && !seenNotes.has(key)) {
        scheduleNoteOff(entry, ctx().currentTime);
      }
    }
    for (const [key, entry] of scheduledClips) {
      if (entry.offTime === null && !seenClips.has(key)) {
        scheduleClipOff(entry, ctx().currentTime);
      }
    }

    if (timelineStore.metronomeEnabled) {
      const barLength = ticksPerBar(timelineStore.timeSignature);
      for (
        let tick = (Math.floor(fromTick / TICKS_PER_BEAT) + 1) * TICKS_PER_BEAT;
        tick <= toTick;
        tick += TICKS_PER_BEAT
      ) {
        playMetronomeClick(tick % barLength === 0, time(tick));
      }
    }

    // Tempo-synced effects (Bloopy Pump) on every eighth note: each effect
    // decides from its own "rate" whether to retrigger.
    for (
      let tick =
        (Math.floor(fromTick / EIGHTH_NOTE_TICKS) + 1) * EIGHTH_NOTE_TICKS;
      tick <= toTick;
      tick += EIGHTH_NOTE_TICKS
    ) {
      const when = time(tick);
      const { timeSignature, tempo } = timelineStore;
      trackAudioStore.notifyTrackEffectsBeatBoundary(
        tick,
        timeSignature,
        tempo,
        when,
      );
      audioBusStore.notifyMasterEffectsBeatBoundary(
        tick,
        timeSignature,
        tempo,
        when,
      );
    }
  };

  // Notes and clips already sounding at `tick` (started before it).
  const startHeldAt = (tick: number, time: number) => {
    for (const track of timelineStore.getPlayableTracks()) {
      for (const note of track.notes) {
        if (note.x < tick && note.x + note.w > tick) {
          scheduleNoteOn(track, note, time);
        }
      }
      if (track.instrument.type !== "audioTrack") continue;
      for (const clip of track.clips ?? []) {
        if (clip.x < tick && clip.x + clip.w > tick) {
          scheduleClipOn(track, clip, tick - clip.x, time);
        }
      }
    }
  };

  const scheduleAutomation = (until: number) => {
    const trackLanes = timelineStore
      .getPlayableTracks()
      .map((track) => ({
        trackId: track.id,
        lanes: (track.automationLanes ?? []).filter((l) => l.points.length),
      }))
      .filter(({ lanes }) => lanes.length > 0);
    const masterLanes = timelineStore.masterAutomationLanes.filter(
      (l) => l.points.length,
    );

    while (automationScheduledUntil + AUTOMATION_STEP_SECONDS <= until) {
      automationScheduledUntil += AUTOMATION_STEP_SECONDS;
      const when = automationScheduledUntil;
      if (endTime !== null && when > endTime) return;
      const tick = positionAtTime(when);

      for (const { trackId, lanes } of trackLanes) {
        for (const lane of lanes) {
          const value = getAutomationValueAt(lane.points, tick);
          trackAudioStore.applyAutomation(trackId, lane.target, value, when);
        }
      }
      for (const lane of masterLanes) {
        const value = getAutomationValueAt(lane.points, tick);
        audioBusStore.applyMasterAutomation(lane.target, value, when);
      }
    }
  };

  // Stops every held note/clip at `time` (loop end).
  const stopHeldAt = (time: number) => {
    for (const entry of scheduledNotes.values()) {
      if (entry.offTime === null) scheduleNoteOff(entry, time);
    }
    for (const entry of scheduledClips.values()) {
      if (entry.offTime === null) scheduleClipOff(entry, time);
    }
  };

  const pruneFinished = (now: number) => {
    for (const [key, entry] of scheduledNotes) {
      if (entry.offTime !== null && entry.offTime < now) {
        scheduledNotes.delete(key);
      }
    }
    for (const [key, entry] of scheduledClips) {
      if (entry.offTime !== null && entry.offTime < now) {
        scheduledClips.delete(key);
      }
    }
    while (segments.length > 1 && segments[1].startTime <= now - 1) {
      segments.shift();
    }
  };

  const reachLoopEnd = () => {
    endTime = null;
    loopEnd.onReached();
  };

  // Scheduler tick: hands the engines everything due before now + lookahead.
  const scheduleAhead = () => {
    if (!isPlaying.value) return;
    const now = ctx().currentTime;

    if (endTime !== null) {
      if (now >= endTime) reachLoopEnd();
      return;
    }

    const horizon = now + LOOKAHEAD_SECONDS;
    // Bounded: a window spans at most one loop end in practice.
    for (let guard = 0; guard < 4; guard++) {
      const segment = currentSegment();
      const toTick = timeToTick(segment, horizon);
      if (toTick <= scheduledTick) break;

      const loopEndTick = loopEndPosition.value;
      if (toTick < loopEndTick) {
        scheduleRange(segment, scheduledTick, toTick);
        scheduledTick = toTick;
        break;
      }

      // Events exactly on the loop end belong to the next iteration's tick 0.
      scheduleRange(segment, scheduledTick, loopEndTick - EPSILON_TICKS);
      const loopEndTime = Math.max(tickToTime(segment, loopEndTick), now);
      stopHeldAt(loopEndTime);

      if (loopEnd.shouldStop()) {
        endTime = loopEndTime;
        scheduledTick = loopEndTick;
        break;
      }

      segments.push({
        startTime: loopEndTime,
        startTick: 0,
        ticksPerSec: segment.ticksPerSec,
      });
      scheduledTick = -EPSILON_TICKS;
      projectStore.markPlaybackLooped();
    }

    scheduleAutomation(horizon);
    pruneFinished(now);
  };

  const clock = createSchedulerClock(SCHEDULER_INTERVAL_MS, scheduleAhead);

  const flushUiEvents = (time: number) => {
    if (uiEvents.length === 0) return;
    const due: UiNoteEvent[] = [];
    const pending: UiNoteEvent[] = [];
    for (const event of uiEvents) {
      (event.time <= time ? due : pending).push(event);
    }
    if (due.length === 0) return;
    uiEvents = pending;
    due.sort((a, b) => a.time - b.time);
    for (const event of due) {
      if (event.type === "note-start") {
        emit(
          "note-start",
          event.note,
          event.noteName,
          event.tick,
          event.trackId,
        );
      } else {
        emit("note-end", event.note, event.noteName, event.tick, event.trackId);
      }
    }
  };

  // Display only: the cursor follows what is being heard.
  const animate = () => {
    if (!isPlaying.value) return;

    const time = heardTime();
    currentPosition.value = positionAtTime(time);
    flushUiEvents(time);
    if (endTime !== null && ctx().currentTime >= endTime) {
      reachLoopEnd();
      if (!isPlaying.value) return;
    }

    animationFrameId.value = requestAnimationFrame(animate);
  };

  // Starts scheduling from `tick`, heard at AudioContext time `time`.
  const beginAt = (tick: number, time: number) => {
    segments = [
      {
        startTime: time,
        startTick: tick,
        ticksPerSec: ticksPerSecond(timelineStore.tempo),
      },
    ];
    endTime = null;
    uiEvents = [];
    automationScheduledUntil = time - AUTOMATION_STEP_SECONDS;
    startHeldAt(tick, time);
    // Events exactly at `tick` are picked up by the first scheduleRange.
    scheduledTick = tick - EPSILON_TICKS;
    scheduleAhead();
  };

  // A tempo change applies from the first tick not scheduled yet.
  watch(
    () => timelineStore.tempo,
    (tempo) => {
      if (!isPlaying.value || segments.length === 0 || endTime !== null) return;
      const segment = currentSegment();
      segments.push({
        startTime: tickToTime(segment, scheduledTick),
        startTick: scheduledTick,
        ticksPerSec: ticksPerSecond(tempo),
      });
    },
  );

  // ============================================
  // Count-in
  // ============================================

  // Décompte d'une mesure avant un enregistrement (laisse le temps de se
  // préparer / de commencer à jouer au clavier MIDI) — actif seulement si le
  // métronome est activé, sinon `onReady` est appelé immédiatement.
  const isCountingIn = ref(false);
  const countInBeatsRemaining = ref(0);
  let countInTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const cancelCountIn = (): void => {
    if (countInTimeoutId) {
      clearTimeout(countInTimeoutId);
      countInTimeoutId = null;
    }
    isCountingIn.value = false;
    countInBeatsRemaining.value = 0;
  };

  const startWithCountIn = (onReady: () => void): void => {
    if (!timelineStore.metronomeEnabled) {
      onReady();
      return;
    }

    audioBusStore.ensureAudioContextResumed();
    const beatsPerBar = timelineStore.timeSignature.numerator;
    const beatSeconds = 60 / timelineStore.tempo;
    isCountingIn.value = true;

    // Clicks are scheduled on the audio clock; the timeouts only drive the
    // countdown display. Each beat shows its own count for its whole duration
    // (the last "1" stays until the end of the bar).
    const firstClickTime = ctx().currentTime + START_DELAY_SECONDS;
    for (let beat = 0; beat < beatsPerBar; beat++) {
      playMetronomeClick(beat === 0, firstClickTime + beat * beatSeconds);
    }

    const showBeat = (beat: number) => {
      countInBeatsRemaining.value = beatsPerBar - beat;
      countInTimeoutId = setTimeout(() => {
        if (beat + 1 >= beatsPerBar) {
          countInTimeoutId = null;
          isCountingIn.value = false;
          onReady();
        } else {
          showBeat(beat + 1);
        }
      }, beatSeconds * 1000);
    };
    showBeat(0);
  };

  // ============================================
  // Transport
  // ============================================

  // Stops now everything scheduled, including notes not started yet.
  const stopAllActiveNotes = () => {
    for (const { trackId, note } of scheduledNotes.values()) {
      trackAudioStore.stopNoteOnTrack(trackId, note.i);
    }
    scheduledNotes.clear();
  };

  const stopAllActiveClips = () => {
    for (const { trackId, clipId } of scheduledClips.values()) {
      trackAudioStore.stopClipOnTrack(trackId, clipId);
    }
    scheduledClips.clear();
  };

  const startPlayback = () => {
    if (isPlaying.value) return;
    audioLibraryStore.stopPreview();
    audioBusStore.ensureAudioContextResumed();

    currentPosition.value = checkpointPosition.value;
    isPlaying.value = true;
    beginAt(checkpointPosition.value, ctx().currentTime + START_DELAY_SECONDS);
    clock.start();

    animationFrameId.value = requestAnimationFrame(animate);
  };

  const haltAnimation = () => {
    isPlaying.value = false;
    clock.stop();
    endTime = null;
    uiEvents = [];
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
  };

  const stopPlayback = () => {
    cancelCountIn();
    haltAnimation();
    stopAllActiveNotes();
    currentPosition.value = checkpointPosition.value;
    stopAllActiveClips();
    onStop?.();
  };

  const togglePlayback = () => {
    if (isPlaying.value) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const setCheckpoint = (position: number) => {
    checkpointPosition.value = position;
    currentPosition.value = position;
    if (isPlaying.value) {
      stopAllActiveNotes();
      stopAllActiveClips();
      beginAt(position, ctx().currentTime + START_DELAY_SECONDS);
    }
  };

  onScopeDispose(() => {
    haltAnimation();
    clock.dispose();
  });

  return {
    isPlaying,
    currentPosition,
    checkpointPosition,
    cursorStyle,
    checkpointStyle,
    loopEndPosition,
    isCountingIn,
    countInBeatsRemaining,
    startPlayback,
    startWithCountIn,
    cancelCountIn,
    stopPlayback,
    togglePlayback,
    setCheckpoint,
    stopAllActiveNotes,
    stopAllActiveClips,
    haltAnimation,
  };
}
