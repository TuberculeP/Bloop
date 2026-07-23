import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { TimelineProject } from "../lib/utils/types";
import { useTrackAudioStore } from "./trackAudioStore";
import { useAudioLibraryStore } from "./audioLibraryStore";
import { useElementaryStore } from "./elementaryStore";
import { useAudioBusStore } from "./audioBusStore";
import { useStretchRenderCacheStore } from "./stretchRenderCacheStore";

type TaskStatus = "pending" | "loading" | "complete" | "error";
type PhaseStatus = "pending" | "loading" | "complete";

interface LoadingTask {
  id: string;
  type: "engine" | "instrument" | "sample" | "stretch";
  label: string;
  status: TaskStatus;
  trackId?: string;
}

interface LoadingPhase {
  id: string;
  name: string;
  tasks: LoadingTask[];
  status: PhaseStatus;
}

export const useDawLoadingStore = defineStore("dawLoading", () => {
  const phases = ref<LoadingPhase[]>([]);
  const isPreloading = ref(false);
  const isComplete = ref(false);
  const error = ref<string | null>(null);

  const currentPhase = computed(() =>
    phases.value.find((p) => p.status === "loading"),
  );

  const currentTask = computed(() => {
    const phase = currentPhase.value;
    if (!phase) return null;
    return phase.tasks.find((t) => t.status === "loading");
  });

  const statusText = computed(() => {
    const task = currentTask.value;
    if (!task) {
      const phase = currentPhase.value;
      return phase?.name || "Préparation...";
    }
    return task.label;
  });

  const overallProgress = computed(() => {
    const allTasks = phases.value.flatMap((p) => p.tasks);
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter((t) => t.status === "complete").length;
    return Math.round((completed / allTasks.length) * 100);
  });

  const allTasks = computed(() => phases.value.flatMap((p) => p.tasks));

  function buildPhases(project: TimelineProject): void {
    phases.value = [];
    const trackAudioStore = useTrackAudioStore();

    // Phase 1: Initialisation
    phases.value.push({
      id: "init",
      name: "Initialisation",
      status: "pending",
      tasks: [
        {
          id: "audio-context",
          type: "engine",
          label: "Audio Context",
          status: "pending",
        },
        {
          id: "elementary",
          type: "engine",
          label: "Elementary Audio",
          status: "pending",
        },
      ],
    });

    // Phase 2: Instruments - utilise engine.resourceKey pour dédupliquer
    const instrumentTasks: LoadingTask[] = [];
    const seenResources = new Set<string>();

    for (const track of project.tracks) {
      const engine = trackAudioStore.getEngine(track.id);
      if (!engine) continue;

      const resourceKey = engine.resourceKey;
      if (resourceKey && !seenResources.has(resourceKey)) {
        seenResources.add(resourceKey);
        instrumentTasks.push({
          id: resourceKey,
          type: "instrument",
          label: engine.resourceLabel,
          status: "pending",
          trackId: track.id,
        });
      }
    }

    if (instrumentTasks.length > 0) {
      phases.value.push({
        id: "instruments",
        name: "Chargement des instruments",
        status: "pending",
        tasks: instrumentTasks,
      });
    }

    // Phase 3: Samples audio
    const sampleTasks: LoadingTask[] = [];
    const seenSamples = new Set<string>();
    const audioLibraryStore = useAudioLibraryStore();

    const pushSampleTask = (sampleId: string): void => {
      if (seenSamples.has(sampleId)) return;
      seenSamples.add(sampleId);
      const sample = audioLibraryStore.getSample(sampleId);
      const label = sample?.name || sample?.filename || sampleId;
      sampleTasks.push({
        id: sampleId,
        type: "sample",
        label,
        status: "pending",
      });
    };

    for (const track of project.tracks) {
      if (track.instrument.type === "audioTrack" && track.clips) {
        for (const clip of track.clips) {
          pushSampleTask(clip.sampleId);
        }
      }

      if (
        track.instrument.type === "samplePlayer" &&
        track.instrument.sampleId
      ) {
        pushSampleTask(track.instrument.sampleId);
      }
    }

    if (sampleTasks.length > 0) {
      phases.value.push({
        id: "samples",
        name: "Chargement des samples",
        status: "pending",
        tasks: sampleTasks,
      });
    }

    // Phase 4: Pré-calcul des clips audio étirés (mode stretch) — rend
    // disponible un cache chaud dès l'ouverture du projet, pour un premier
    // play instantané (voir stretchRenderCacheStore.ts).
    const stretchTasks: LoadingTask[] = [];
    for (const track of project.tracks) {
      if (track.instrument.type !== "audioTrack" || !track.clips) continue;
      for (const clip of track.clips) {
        if (!clip.stretched) continue;
        const sample = audioLibraryStore.getSample(clip.sampleId);
        stretchTasks.push({
          id: clip.id,
          type: "stretch",
          label: `Étirement — ${sample?.name || sample?.filename || clip.sampleId}`,
          status: "pending",
        });
      }
    }

    if (stretchTasks.length > 0) {
      phases.value.push({
        id: "stretch-prerender",
        name: "Pré-calcul des boucles étirées",
        status: "pending",
        tasks: stretchTasks,
      });
    }
  }

  async function executeInitPhase(): Promise<void> {
    const phase = phases.value.find((p) => p.id === "init");
    if (!phase) return;

    phase.status = "loading";
    const audioBusStore = useAudioBusStore();
    const elementaryStore = useElementaryStore();

    // AudioContext
    const audioContextTask = phase.tasks.find((t) => t.id === "audio-context");
    if (audioContextTask) {
      audioContextTask.status = "loading";
      await audioBusStore.ensureAudioContextResumed();
      audioContextTask.status = "complete";
    }

    // Elementary
    const elementaryTask = phase.tasks.find((t) => t.id === "elementary");
    if (elementaryTask) {
      elementaryTask.status = "loading";
      if (!elementaryStore.isLoaded) {
        await elementaryStore.load();
      }
      elementaryTask.status = "complete";
    }

    phase.status = "complete";
  }

  async function executeInstrumentsPhase(): Promise<void> {
    const phase = phases.value.find((p) => p.id === "instruments");
    if (!phase) return;

    phase.status = "loading";
    const trackAudioStore = useTrackAudioStore();

    // Charger les instruments en parallèle
    const promises: Promise<void>[] = [];

    for (const task of phase.tasks) {
      task.status = "loading";

      const loadTask = async () => {
        try {
          if (task.trackId) {
            await trackAudioStore.preloadTrack(task.trackId);
          }
          task.status = "complete";
        } catch (e) {
          console.error(`[DawLoading] Failed to load ${task.label}:`, e);
          task.status = "error";
        }
      };

      promises.push(loadTask());
    }

    await Promise.all(promises);
    phase.status = "complete";
  }

  async function executeSamplesPhase(): Promise<void> {
    const phase = phases.value.find((p) => p.id === "samples");
    if (!phase) return;

    phase.status = "loading";
    const audioLibraryStore = useAudioLibraryStore();

    // Charger les samples séquentiellement pour éviter trop de requêtes parallèles
    for (const task of phase.tasks) {
      task.status = "loading";
      try {
        await audioLibraryStore.loadSample(task.id);
        task.status = "complete";
      } catch (e) {
        console.error(`[DawLoading] Failed to load sample ${task.label}:`, e);
        task.status = "error";
      }
    }

    phase.status = "complete";
  }

  async function executeStretchPrerenderPhase(
    project: TimelineProject,
  ): Promise<void> {
    const phase = phases.value.find((p) => p.id === "stretch-prerender");
    if (!phase) return;

    phase.status = "loading";
    const audioLibraryStore = useAudioLibraryStore();
    const audioBusStore = useAudioBusStore();
    const stretchRenderCacheStore = useStretchRenderCacheStore();

    // Rendus indépendants les uns des autres (samples déjà en cache mémoire
    // depuis la phase précédente) — en parallèle, comme executeInstrumentsPhase
    // ci-dessus, plutôt que séquentiel comme executeSamplesPhase (qui limite
    // volontairement les requêtes réseau concurrentes ; ici il n'y en a pas).
    const renderTasks: Promise<void>[] = [];

    for (const track of project.tracks) {
      if (track.instrument.type !== "audioTrack" || !track.clips) continue;
      for (const clip of track.clips) {
        if (!clip.stretched) continue;
        const task = phase.tasks.find((t) => t.id === clip.id);
        if (!task) continue;

        task.status = "loading";
        renderTasks.push(
          (async () => {
            try {
              const buffer = await audioLibraryStore.loadSample(clip.sampleId);
              if (buffer) {
                await stretchRenderCacheStore.ensureStretchedClipCached(
                  clip,
                  buffer,
                  project.tempo,
                  audioBusStore.audioContext,
                );
              }
              task.status = "complete";
            } catch (e) {
              console.error(
                `[DawLoading] Failed to prerender stretched clip ${clip.id}:`,
                e,
              );
              task.status = "error";
            }
          })(),
        );
      }
    }

    await Promise.all(renderTasks);
    phase.status = "complete";
  }

  async function preloadProject(project: TimelineProject): Promise<void> {
    if (isPreloading.value) return;

    isPreloading.value = true;
    isComplete.value = false;
    error.value = null;

    buildPhases(project);

    // Si aucune task (projet vide), compléter immédiatement
    if (phases.value.flatMap((p) => p.tasks).length === 0) {
      isComplete.value = true;
      isPreloading.value = false;
      return;
    }

    try {
      // Phase 1: Init
      await executeInitPhase();

      // Phase 2: Instruments
      await executeInstrumentsPhase();

      // Phase 3: Samples
      await executeSamplesPhase();

      // Phase 4: Pré-calcul des clips étirés
      await executeStretchPrerenderPhase(project);

      isComplete.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Erreur de chargement";
      console.error("[DawLoading] Preload failed:", e);
      // Même en cas d'erreur, on permet de continuer
      isComplete.value = true;
    } finally {
      isPreloading.value = false;
    }
  }

  function reset(): void {
    phases.value = [];
    isPreloading.value = false;
    isComplete.value = false;
    error.value = null;
  }

  return {
    phases,
    isPreloading,
    isComplete,
    error,
    currentPhase,
    currentTask,
    statusText,
    overallProgress,
    allTasks,
    preloadProject,
    reset,
  };
});
