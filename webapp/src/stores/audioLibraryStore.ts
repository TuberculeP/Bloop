import { defineStore } from "pinia";
import { ref, markRaw } from "vue";
import type { AudioSample, SamplePack, SampleFolder } from "../lib/utils/types";
import { useAudioBusStore } from "./audioBusStore";
import { useSampleCacheStore } from "./sampleCacheStore";
import apiClient from "../lib/utils/apiClient";

type LoadingState = "idle" | "loading" | "ready" | "error";

interface ApiPack {
  id: string;
  slug: string;
  name: string;
  author: string | null;
  cover: string | null;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  folders?: ApiFolder[];
}

interface ApiFolder {
  id: string;
  name: string;
  order: number;
  packId: string;
}

interface ApiSample {
  id: string;
  name: string;
  filename: string;
  duration: number;
  waveform: number[] | null;
  folderId: string;
  previewUrl: string | null;
  fullUrl: string | null;
}

interface ApiResponse<T> {
  status: number;
  message: string;
  body: T;
}

interface PaginatedPacksResponse {
  packs: ApiPack[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useAudioLibraryStore = defineStore("audioLibrary", () => {
  const audioBusStore = useAudioBusStore();
  const cacheStore = useSampleCacheStore();

  const packs = ref<SamplePack[]>([]);
  const samples = ref<Map<string, AudioSample>>(new Map());
  const buffers = ref<Map<string, AudioBuffer>>(new Map());
  const loadingStates = ref<Map<string, LoadingState>>(new Map());
  const isInitialized = ref(false);

  const currentPackSlug = ref<string | null>(null);
  const currentFolderId = ref<string | null>(null);
  const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });

  const getSample = (sampleId: string): AudioSample | undefined => {
    return samples.value.get(sampleId);
  };

  const getSampleBuffer = (sampleId: string): AudioBuffer | undefined => {
    return buffers.value.get(sampleId);
  };

  const getLoadingState = (sampleId: string): LoadingState => {
    return loadingStates.value.get(sampleId) ?? "idle";
  };

  const getPack = (packId: string): SamplePack | undefined => {
    return packs.value.find((p) => p.id === packId);
  };

  const getAllPacks = (): SamplePack[] => {
    return packs.value;
  };

  const getFeaturedPacks = (): SamplePack[] => {
    return packs.value.filter((p) => p.featured);
  };

  const getAllSamples = (): AudioSample[] => {
    return Array.from(samples.value.values());
  };

  const generateWaveformData = (
    buffer: AudioBuffer,
    points: number = 128,
  ): number[] => {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / points);
    const waveform: number[] = [];

    for (let i = 0; i < points; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] ?? 0);
      }
      waveform.push(sum / blockSize);
    }

    const max = Math.max(...waveform, 0.001);
    return waveform.map((v) => v / max);
  };

  const loadSample = async (sampleId: string): Promise<AudioBuffer | null> => {
    const sample = samples.value.get(sampleId);
    if (!sample) {
      console.warn(`Sample not found: ${sampleId}`);
      return null;
    }

    if (buffers.value.has(sampleId)) {
      return buffers.value.get(sampleId)!;
    }

    if (loadingStates.value.get(sampleId) === "loading") {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const state = loadingStates.value.get(sampleId);
          if (state === "ready") {
            clearInterval(checkInterval);
            resolve(buffers.value.get(sampleId) ?? null);
          } else if (state === "error") {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 50);
      });
    }

    loadingStates.value.set(sampleId, "loading");

    try {
      await cacheStore.initialize();
      const cached = await cacheStore.get(sampleId);

      if (cached) {
        try {
          const audioBuffer = await audioBusStore.audioContext.decodeAudioData(
            cached.slice(0),
          );
          buffers.value.set(sampleId, markRaw(audioBuffer));
          sample.duration = audioBuffer.duration;
          sample.waveformData = generateWaveformData(audioBuffer);
          loadingStates.value.set(sampleId, "ready");
          return audioBuffer;
        } catch {
          // Cache corrompu, on continue avec fetch
        }
      }

      const response = await fetch(sample.fullUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      const SUPPORTED_CONTENT_TYPES = [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "audio/vnd.wave",
        "audio/ogg",
        "audio/flac",
        "audio/x-flac",
      ];
      if (!SUPPORTED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
        throw new Error(
          `Unsupported audio format: ${contentType || "unknown"}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();

      await cacheStore.set(sampleId, arrayBuffer);

      const audioBuffer = await audioBusStore.audioContext.decodeAudioData(
        arrayBuffer.slice(0),
      );

      buffers.value.set(sampleId, markRaw(audioBuffer));
      sample.duration = audioBuffer.duration;
      sample.waveformData = generateWaveformData(audioBuffer);
      loadingStates.value.set(sampleId, "ready");

      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load sample ${sampleId}:`, error);
      loadingStates.value.set(sampleId, "error");
      return null;
    }
  };

  const preloadPack = async (packId: string): Promise<void> => {
    const pack = getPack(packId);
    if (!pack) return;

    const allSamples: AudioSample[] = [];
    for (const folder of pack.folders) {
      allSamples.push(...folder.samples);
    }
    await Promise.all(allSamples.map((s) => loadSample(s.id)));
  };

  const preloadAllSamples = async (): Promise<void> => {
    const allSamples = getAllSamples();
    await Promise.all(allSamples.map((s) => loadSample(s.id)));
  };

  const fetchPacksFromApi = async (
    page = 1,
    limit = 50,
  ): Promise<SamplePack[]> => {
    const result = await apiClient.get<ApiResponse<PaginatedPacksResponse>>(
      `/samples/packs?page=${page}&limit=${limit}`,
    );

    if (result.error || !result.data?.body) {
      return [];
    }

    const { packs: apiPacks, pagination: pag } = result.data.body;
    pagination.value = pag;

    return apiPacks.map((ap) => ({
      id: ap.slug,
      name: ap.name,
      author: ap.author ?? undefined,
      featured: ap.featured,
      cover: ap.cover ?? undefined,
      folders: [],
    }));
  };

  const fetchPackDetails = async (slug: string): Promise<SamplePack | null> => {
    const result = await apiClient.get<ApiResponse<ApiPack>>(
      `/samples/packs/${slug}`,
    );

    if (result.error || !result.data?.body) {
      return null;
    }

    const ap = result.data.body;
    currentPackSlug.value = slug;

    const folders: SampleFolder[] = (ap.folders ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      samples: [],
    }));

    const pack: SamplePack = {
      id: ap.slug,
      name: ap.name,
      author: ap.author ?? undefined,
      featured: ap.featured,
      cover: ap.cover ?? undefined,
      folders,
    };

    const existingIndex = packs.value.findIndex((p) => p.id === slug);
    if (existingIndex >= 0) {
      packs.value[existingIndex] = pack;
    } else {
      packs.value.push(pack);
    }

    return pack;
  };

  const fetchFolderSamples = async (
    packSlug: string,
    folderId: string,
  ): Promise<AudioSample[]> => {
    const result = await apiClient.get<ApiResponse<ApiSample[]>>(
      `/samples/packs/${packSlug}/folders/${folderId}`,
    );

    if (result.error || !result.data?.body) {
      return [];
    }

    currentFolderId.value = folderId;

    const fetchedSamples: AudioSample[] = result.data.body.map((as) => ({
      id: as.id,
      name: as.name,
      packId: packSlug,
      folder: folderId,
      filename: as.filename,
      duration: as.duration,
      waveformData: as.waveform ?? undefined,
      fullUrl: as.fullUrl ?? "",
    }));

    for (const sample of fetchedSamples) {
      samples.value.set(sample.id, sample);
      if (!loadingStates.value.has(sample.id)) {
        loadingStates.value.set(sample.id, "idle");
      }
    }

    const pack = packs.value.find((p) => p.id === packSlug);
    if (pack) {
      const folder = pack.folders.find((f: any) => f.id === folderId);
      if (folder) {
        folder.samples = fetchedSamples;
      }
    }

    return fetchedSamples;
  };

  const initializeFromApi = async (): Promise<boolean> => {
    try {
      const fetchedPacks = await fetchPacksFromApi(1, 50);
      if (fetchedPacks.length === 0) {
        return false;
      }
      packs.value = fetchedPacks;
      return true;
    } catch {
      return false;
    }
  };

  const initialize = async (): Promise<void> => {
    if (isInitialized.value) return;
    await initializeFromApi();
    isInitialized.value = true;
  };

  const restoreSamples = (sampleMap: Record<string, AudioSample>): void => {
    for (const [sampleId, sample] of Object.entries(sampleMap)) {
      if (!samples.value.has(sampleId)) {
        samples.value.set(sampleId, sample);
        loadingStates.value.set(sampleId, "idle");
      }
    }
  };

  const previewingId = ref<string | null>(null);
  let previewSource: AudioBufferSourceNode | null = null;

  const stopPreview = (): void => {
    if (previewSource) {
      try {
        previewSource.stop();
        previewSource.disconnect();
      } catch {
        // already stopped
      }
      previewSource = null;
      previewingId.value = null;
    }
  };

  const startPreview = async (sample: AudioSample): Promise<void> => {
    stopPreview();
    const buffer = await loadSample(sample.id);
    if (!buffer) return;
    await audioBusStore.ensureAudioContextResumed();
    const source = audioBusStore.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioBusStore.inputBus);
    source.onended = () => {
      if (previewingId.value === sample.id) {
        previewingId.value = null;
        previewSource = null;
      }
    };
    source.start();
    previewingId.value = sample.id;
    previewSource = source;
  };

  // Enregistrement vocal live : 100% client, jamais envoyé au serveur.
  // Le sample vit en mémoire (blob: URL) et disparaît au rechargement de la page.
  const createLocalSampleFromRecording = async (
    blob: Blob,
    name: string,
  ): Promise<AudioSample | null> => {
    let audioBuffer: AudioBuffer;
    try {
      const arrayBuffer = await blob.arrayBuffer();
      audioBuffer =
        await audioBusStore.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("Failed to decode recording:", error);
      return null;
    }

    const id = `recording_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ext = blob.type.split(";")[0].split("/")[1] ?? "webm";

    const sample: AudioSample = {
      id,
      name,
      packId: "recordings",
      folder: "voice",
      filename: `${name}.${ext}`,
      duration: audioBuffer.duration,
      waveformData: generateWaveformData(audioBuffer),
      fullUrl: URL.createObjectURL(blob),
    };

    samples.value.set(id, sample);
    buffers.value.set(id, markRaw(audioBuffer));
    loadingStates.value.set(id, "ready");

    return sample;
  };

  return {
    packs,
    samples,
    isInitialized,
    pagination,
    currentPackSlug,
    currentFolderId,
    previewingId,

    getSample,
    getSampleBuffer,
    getLoadingState,
    getPack,
    getAllPacks,
    getFeaturedPacks,
    getAllSamples,

    loadSample,
    preloadPack,
    preloadAllSamples,
    initialize,
    startPreview,
    stopPreview,
    createLocalSampleFromRecording,

    fetchPacksFromApi,
    fetchPackDetails,
    fetchFolderSamples,
    restoreSamples,
  };
});
