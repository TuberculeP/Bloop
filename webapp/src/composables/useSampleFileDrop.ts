import { useAudioLibraryStore } from "../stores/audioLibraryStore";
import { useUserSamplesStore } from "../stores/userSamplesStore";
import { useTimelineStore } from "../stores/timelineStore";
import { useTrackHistoryStore } from "../stores/trackHistoryStore";

export function useSampleFileDrop() {
  const audioLibraryStore = useAudioLibraryStore();
  const userSamplesStore = useUserSamplesStore();
  const timelineStore = useTimelineStore();
  const trackHistoryStore = useTrackHistoryStore();

  const isAudioFile = (file: File): boolean => file.type.startsWith("audio/");

  const placeFilesOnTrack = async (
    files: FileList | File[],
    trackId: string,
    startCol: number,
  ): Promise<void> => {
    let cursor = Math.max(0, startCol);

    for (const file of Array.from(files)) {
      if (!isAudioFile(file)) continue;

      const sample = await userSamplesStore.uploadSample(file);
      if (!sample) continue;

      await audioLibraryStore.loadSample(sample.id);
      const loadedSample = audioLibraryStore.getSample(sample.id);
      if (!loadedSample) continue;

      const stepsPerSecond = (timelineStore.tempo / 60) * 4;
      const durationInSteps = Math.max(
        1,
        Math.ceil(loadedSample.duration * stepsPerSecond),
      );

      trackHistoryStore.recordAddClip(
        trackId,
        { sampleId: sample.id, x: cursor, w: durationInSteps, startOffset: 0 },
        loadedSample,
      );

      cursor += durationInSteps;
    }
  };

  return { isAudioFile, placeFilesOnTrack };
}
