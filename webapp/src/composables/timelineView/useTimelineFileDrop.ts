import { ref } from "vue";
import { useTimelineStore } from "../../stores/timelineStore";
import { getDefaultConfigForType } from "../../lib/audio/instrumentFactory";
import { useSampleFileDrop } from "../useSampleFileDrop";

/** Drop de fichiers audio depuis l'OS directement sur la timeline : crée une piste audio et y place les samples. */
export function useTimelineFileDrop(
  colWidth: number,
  trackHeaderWidth: number,
) {
  const timelineStore = useTimelineStore();
  const { placeFilesOnTrack } = useSampleFileDrop();

  const isDragOverTimeline = ref(false);
  const tracksContainerRef = ref<HTMLElement | null>(null);

  const handleTracksContainerDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    isDragOverTimeline.value = true;
  };

  const handleTracksContainerDragLeave = (): void => {
    isDragOverTimeline.value = false;
  };

  const handleTracksContainerDrop = async (event: DragEvent): Promise<void> => {
    event.preventDefault();
    isDragOverTimeline.value = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const rect = tracksContainerRef.value?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor(
      (event.clientX - rect.left - trackHeaderWidth) / colWidth,
    );

    const trackId = timelineStore.createTrack(
      getDefaultConfigForType("audioTrack"),
    );
    await placeFilesOnTrack(files, trackId, x);
  };

  return {
    isDragOverTimeline,
    tracksContainerRef,
    handleTracksContainerDragOver,
    handleTracksContainerDragLeave,
    handleTracksContainerDrop,
  };
}
