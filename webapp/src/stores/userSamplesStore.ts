import { defineStore } from "pinia";
import { ref } from "vue";
import type { AudioSample } from "../lib/utils/types";
import apiClient from "../lib/utils/apiClient";
import { useAudioLibraryStore } from "./audioLibraryStore";

const ALLOWED_AUDIO_MIMES = [
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

interface ApiUserSample {
  id: string;
  name: string;
  filename: string;
  size: number;
  duration: number;
  waveform: number[] | null;
  fullUrl: string;
  createdAt: string;
  usageCount?: number;
  lastUsedAt?: string | null;
}

interface StorageResponse {
  status: number;
  usedBytes: number;
  quotaBytes: number;
}

interface UploadResponse {
  status: number;
  message?: string;
  sample?: ApiUserSample;
  usedBytes: number;
  quotaBytes: number;
}

export interface SampleUsageProject {
  id: string;
  name: string;
  ownerName: string;
}

interface UsageResponse {
  status: number;
  projects: SampleUsageProject[];
}

const toAudioSample = (s: ApiUserSample): AudioSample => ({
  id: s.id,
  name: s.name,
  packId: "personal",
  folder: "personal",
  filename: s.filename,
  duration: s.duration,
  waveformData: s.waveform ?? undefined,
  fullUrl: s.fullUrl,
});

export const useUserSamplesStore = defineStore("userSamples", () => {
  const audioLibraryStore = useAudioLibraryStore();

  const mySamples = ref<AudioSample[]>([]);
  const sampleSizes = ref<Map<string, number>>(new Map());
  const usageCounts = ref<Map<string, number>>(new Map());
  const createdAtById = ref<Map<string, string>>(new Map());
  const lastUsedAtById = ref<Map<string, string | null>>(new Map());
  const usedBytes = ref(0);
  const quotaBytes = ref(0);
  const uploading = ref(false);

  const getSampleSize = (id: string): number => sampleSizes.value.get(id) ?? 0;
  const getUsageCount = (id: string): number => usageCounts.value.get(id) ?? 0;
  const getCreatedAt = (id: string): string | null =>
    createdAtById.value.get(id) ?? null;
  const getLastUsedAt = (id: string): string | null =>
    lastUsedAtById.value.get(id) ?? null;

  const fetchMySamples = async (): Promise<void> => {
    const result = await apiClient.get<{ samples: ApiUserSample[] }>(
      "/user/samples",
    );
    if (result.error || !result.data) return;

    // Réutilise l'instance déjà enregistrée dans audioLibraryStore si elle
    // existe (ex: déjà décodée, avec sa vraie durée) au lieu d'en recréer une
    // copie déconnectée : sinon la preview met à jour un objet que personne
    // n'affiche.
    mySamples.value = result.data.samples.map((apiSample) => {
      sampleSizes.value.set(apiSample.id, apiSample.size);
      usageCounts.value.set(apiSample.id, apiSample.usageCount ?? 0);
      createdAtById.value.set(apiSample.id, apiSample.createdAt);
      lastUsedAtById.value.set(apiSample.id, apiSample.lastUsedAt ?? null);

      const existing = audioLibraryStore.getSample(apiSample.id);
      if (existing) return existing;

      const sample = toAudioSample(apiSample);
      audioLibraryStore.restoreSamples({ [sample.id]: sample });
      return sample;
    });
  };

  const fetchStorageUsage = async (): Promise<void> => {
    const result = await apiClient.get<StorageResponse>(
      "/user/samples/storage",
    );
    if (result.error || !result.data) return;
    usedBytes.value = result.data.usedBytes;
    quotaBytes.value = result.data.quotaBytes;
  };

  const uploadSample = async (file: File): Promise<AudioSample | null> => {
    if (!ALLOWED_AUDIO_MIMES.includes(file.type)) {
      alert(`Type de fichier non supporté : ${file.type || file.name}`);
      return null;
    }

    if (
      quotaBytes.value > 0 &&
      usedBytes.value + file.size > quotaBytes.value
    ) {
      alert(
        "Quota de stockage dépassé. Supprimez des samples ou choisissez un fichier plus léger.",
      );
      return null;
    }

    uploading.value = true;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiClient.post<UploadResponse>(
        "/user/samples",
        formData,
      );

      if (result.error || !result.data?.sample) {
        alert(result.data?.message || "Échec de l'upload du sample.");
        return null;
      }

      const sample = toAudioSample(result.data.sample);
      mySamples.value.unshift(sample);
      sampleSizes.value.set(sample.id, result.data.sample.size);
      usageCounts.value.set(sample.id, 0);
      createdAtById.value.set(sample.id, result.data.sample.createdAt);
      lastUsedAtById.value.set(sample.id, null);
      usedBytes.value = result.data.usedBytes;
      quotaBytes.value = result.data.quotaBytes;
      audioLibraryStore.restoreSamples({ [sample.id]: sample });

      return sample;
    } finally {
      uploading.value = false;
    }
  };

  const fetchSampleUsage = async (
    id: string,
  ): Promise<SampleUsageProject[]> => {
    const result = await apiClient.get<UsageResponse>(
      `/user/samples/${id}/usage`,
    );
    if (result.error || !result.data) return [];
    return result.data.projects;
  };

  const deleteSample = async (id: string): Promise<void> => {
    const result = await apiClient.delete<StorageResponse>(
      `/user/samples/${id}`,
    );
    if (result.error) return;
    mySamples.value = mySamples.value.filter((s) => s.id !== id);
    sampleSizes.value.delete(id);
    usageCounts.value.delete(id);
    createdAtById.value.delete(id);
    lastUsedAtById.value.delete(id);
    if (result.data) {
      usedBytes.value = result.data.usedBytes;
      quotaBytes.value = result.data.quotaBytes;
    }
  };

  return {
    mySamples,
    usedBytes,
    quotaBytes,
    uploading,

    getSampleSize,
    getUsageCount,
    getCreatedAt,
    getLastUsedAt,
    fetchMySamples,
    fetchStorageUsage,
    uploadSample,
    fetchSampleUsage,
    deleteSample,
  };
});
