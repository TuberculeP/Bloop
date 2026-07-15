import { ref, computed } from "vue";
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

/**
 * Moteur de playback : boucle rAF, déclenchement des notes/clips, métronome, automation.
 * `onLoopEnd` renvoie `true` quand l'appelant (export) a pris la main sur la fin de boucle,
 * ce qui évite une dépendance circulaire avec useTimelineExport.
 * `onStop` est invoqué à chaque stopPlayback, pour laisser useTimelineVoiceRecording
 * finaliser un enregistrement en cours sans dépendance circulaire non plus.
 */
export function useTimelinePlaybackEngine(
  emit: PlaybackEmit,
  colWidth: () => number,
  trackHeaderWidth: number,
  onLoopEnd: () => boolean,
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
  const playbackStartTime = ref(0);
  const animationFrameId = ref<number | null>(null);

  const activeNotes = ref<Map<string, { trackId: string; noteId: string }>>(
    new Map(),
  );
  const activeClips = ref<Map<string, { trackId: string; clip: AudioClip }>>(
    new Map(),
  );

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

  const tryStartNote = (
    track: Track,
    note: MidiNote,
    intPosition: number,
    isDue: (noteStart: number, noteEnd: number) => boolean,
  ) => {
    const noteKey = `${track.id}_${note.i}`;
    if (activeNotes.value.has(noteKey)) return;

    const noteStart = note.x;
    const noteEnd = note.x + note.w;
    if (!isDue(noteStart, noteEnd)) return;

    const noteName = noteIndexToName(note.y);
    trackAudioStore.playNoteOnTrack(track.id, noteName, note.i);
    activeNotes.value.set(noteKey, { trackId: track.id, noteId: note.i });
    emit("note-start", note, noteName, intPosition, track.id);
  };

  // Playback - lit directement les notes des tracks (plus de clips).
  // À TICKS_PER_BEAT=96, une frame (~16ms à 60fps) peut avancer de plusieurs
  // ticks : on déclenche donc tout note-start/note-end dont le tick tombe dans
  // la plage (fromExclusive, toInclusive] traversée depuis la frame précédente,
  // plutôt qu'une égalité stricte sur le seul tick courant (qui en raterait
  // la plupart).
  const playNotesAtPosition = (fromExclusive: number, toInclusive: number) => {
    for (const track of timelineStore.getPlayableTracks()) {
      for (const note of track.notes) {
        tryStartNote(
          track,
          note,
          toInclusive,
          (noteStart) => noteStart > fromExclusive && noteStart <= toInclusive,
        );

        const noteKey = `${track.id}_${note.i}`;
        const noteEnd = note.x + note.w;
        if (
          noteEnd > fromExclusive &&
          noteEnd <= toInclusive &&
          activeNotes.value.has(noteKey)
        ) {
          const noteName = noteIndexToName(note.y);
          trackAudioStore.stopNoteOnTrack(track.id, note.i);
          activeNotes.value.delete(noteKey);
          emit("note-end", note, noteName, toInclusive, track.id);
        }
      }
    }
  };

  const playClipsAtPosition = (position: number) => {
    const intPosition = Math.floor(position);

    for (const track of timelineStore.getPlayableTracks()) {
      if (track.instrument.type !== "audioTrack") continue;

      for (const clip of track.clips ?? []) {
        const clipKey = `${track.id}_${clip.id}`;
        const clipStart = clip.x;
        const clipEnd = clip.x + clip.w;

        if (intPosition >= clipStart && intPosition < clipEnd) {
          if (!activeClips.value.has(clipKey)) {
            const offsetInClip = intPosition - clipStart;
            trackAudioStore.playClipOnTrack(track.id, clip, offsetInClip);
            activeClips.value.set(clipKey, { trackId: track.id, clip });
          }
        }

        if (intPosition >= clipEnd && activeClips.value.has(clipKey)) {
          trackAudioStore.stopClipOnTrack(track.id, clip.id);
          activeClips.value.delete(clipKey);
        }
      }
    }
  };

  // Métronome - clic direct sur la destination audio, indépendant du bus master
  // (pas d'EQ/reverb, et non capturé par l'export audio)
  const playMetronomeClick = (accent: boolean) => {
    const ctx = audioBusStore.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = accent ? 1500 : 1000;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  };

  // Même logique de plage que playNotesAtPosition : on cherche le dernier
  // tick de temps (multiple de TICKS_PER_BEAT) tombant dans (fromExclusive,
  // toInclusive], plutôt qu'une égalité stricte sur le seul tick courant.
  const maybePlayMetronomeAt = (fromExclusive: number, toInclusive: number) => {
    if (!timelineStore.metronomeEnabled) return;
    const lastBeatTick =
      Math.floor(toInclusive / TICKS_PER_BEAT) * TICKS_PER_BEAT;
    if (lastBeatTick <= fromExclusive) return;
    const barLength = ticksPerBar(timelineStore.timeSignature);
    playMetronomeClick(lastBeatTick % barLength === 0);
  };

  const stopAllActiveNotes = () => {
    for (const [, { trackId, noteId }] of activeNotes.value) {
      trackAudioStore.stopNoteOnTrack(trackId, noteId);
    }
    activeNotes.value.clear();
  };

  const stopAllActiveClips = () => {
    for (const [, { trackId, clip }] of activeClips.value) {
      trackAudioStore.stopClipOnTrack(trackId, clip.id);
    }
    activeClips.value.clear();
  };

  const triggerNotesAtPosition = (position: number) => {
    const intPosition = Math.floor(position);

    for (const track of timelineStore.getPlayableTracks()) {
      for (const note of track.notes) {
        tryStartNote(
          track,
          note,
          intPosition,
          (noteStart, noteEnd) =>
            intPosition >= noteStart && intPosition < noteEnd,
        );
      }
    }
  };

  const applyAutomationAtPosition = (position: number) => {
    for (const track of timelineStore.getPlayableTracks()) {
      for (const lane of track.automationLanes ?? []) {
        if (lane.points.length === 0) continue;
        const value = getAutomationValueAt(lane.points, position);
        trackAudioStore.applyAutomation(track.id, lane.target, value);
      }
    }
    for (const lane of timelineStore.masterAutomationLanes) {
      if (lane.points.length === 0) continue;
      const value = getAutomationValueAt(lane.points, position);
      audioBusStore.applyMasterAutomation(lane.target, value);
    }
  };

  const animate = () => {
    if (!isPlaying.value) return;

    const elapsed = (performance.now() - playbackStartTime.value) / 1000;
    const stepsPerSecond = ticksPerSecond(timelineStore.tempo);
    let newPosition = checkpointPosition.value + elapsed * stepsPerSecond;
    let prevIntPosition = Math.floor(currentPosition.value);

    if (newPosition >= loopEndPosition.value) {
      if (onLoopEnd()) return;

      stopAllActiveNotes();
      stopAllActiveClips();
      newPosition = 0;
      // Le tick 0 est un nouveau départ, pas la suite du tick précédent (fin
      // de boucle) : sans ce reset, la plage (prevIntPosition, 0] serait
      // toujours vide/invalide et couperait le clic de métronome du downbeat.
      prevIntPosition = -1;
      playbackStartTime.value =
        performance.now() + (checkpointPosition.value / stepsPerSecond) * 1000;
      triggerNotesAtPosition(newPosition);
      projectStore.markPlaybackLooped();
    }

    const newIntPosition = Math.floor(newPosition);

    currentPosition.value = newPosition;

    if (newIntPosition !== prevIntPosition) {
      playNotesAtPosition(prevIntPosition, newIntPosition);
      playClipsAtPosition(newPosition);
      maybePlayMetronomeAt(prevIntPosition, newIntPosition);
    }

    applyAutomationAtPosition(newPosition);

    animationFrameId.value = requestAnimationFrame(animate);
  };

  const startPlayback = () => {
    if (isPlaying.value) return;
    audioLibraryStore.stopPreview();
    audioBusStore.ensureAudioContextResumed();

    currentPosition.value = checkpointPosition.value;
    isPlaying.value = true;
    playbackStartTime.value = performance.now();

    triggerNotesAtPosition(currentPosition.value);
    playClipsAtPosition(currentPosition.value);
    maybePlayMetronomeAt(currentPosition.value - 1, currentPosition.value);

    animationFrameId.value = requestAnimationFrame(animate);
  };

  const haltAnimation = () => {
    isPlaying.value = false;
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
  };

  const stopPlayback = () => {
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
    if (isPlaying.value) {
      stopAllActiveNotes();
      stopAllActiveClips();
      currentPosition.value = position;
      playbackStartTime.value = performance.now();
      triggerNotesAtPosition(position);
    } else {
      currentPosition.value = position;
    }
  };

  return {
    isPlaying,
    currentPosition,
    checkpointPosition,
    cursorStyle,
    checkpointStyle,
    loopEndPosition,
    startPlayback,
    stopPlayback,
    togglePlayback,
    setCheckpoint,
    stopAllActiveNotes,
    stopAllActiveClips,
    haltAnimation,
  };
}
