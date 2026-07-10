import { ref, onBeforeUnmount } from "vue";

export type RecorderState = "idle" | "recording" | "stopped" | "error";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

export function useVoiceRecorder() {
  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const state = ref<RecorderState>("idle");
  const elapsedMs = ref(0);
  const level = ref(0);
  const error = ref<string | null>(null);
  const previewUrl = ref<string | null>(null);
  const lastBlob = ref<Blob | null>(null);
  const lastMimeType = ref<string>("audio/webm");
  const devices = ref<MediaDeviceInfo[]>([]);
  const selectedDeviceId = ref<string | null>(null);

  let permissionPrimed = false;

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let startedAt = 0;
  let timerHandle: ReturnType<typeof setInterval> | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let levelFrame: number | null = null;

  const cleanupStream = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (levelFrame !== null) {
      cancelAnimationFrame(levelFrame);
      levelFrame = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
      analyser = null;
    }
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  };

  const monitorLevel = () => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const normalized = (value - 128) / 128;
        sumSquares += normalized * normalized;
      }
      level.value = Math.min(1, Math.sqrt(sumSquares / data.length) * 4);
      levelFrame = requestAnimationFrame(tick);
    };
    levelFrame = requestAnimationFrame(tick);
  };

  const clearPreview = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
    lastBlob.value = null;
  };

  const loadDevices = async (): Promise<void> => {
    if (!isSupported) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      devices.value = list.filter((d) => d.kind === "audioinput");
      const stillExists = devices.value.some(
        (d) => d.deviceId === selectedDeviceId.value,
      );
      if (!stillExists) {
        selectedDeviceId.value = devices.value[0]?.deviceId ?? null;
      }
    } catch {
      // ignore, device list stays empty
    }
  };

  const requestPermission = async (): Promise<void> => {
    if (!isSupported || permissionPrimed) return;
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      tempStream.getTracks().forEach((track) => track.stop());
      permissionPrimed = true;
    } catch {
      // Permission will be requested again (and surfaced) on start()
    }
    await loadDevices();
  };

  if (isSupported) {
    navigator.mediaDevices.addEventListener?.("devicechange", loadDevices);
  }

  const buildAudioConstraints = (): MediaStreamConstraints => ({
    audio: selectedDeviceId.value
      ? { deviceId: { exact: selectedDeviceId.value } }
      : true,
  });

  const start = async (): Promise<void> => {
    if (!isSupported) {
      error.value =
        "L'enregistrement audio n'est pas supporté sur ce navigateur.";
      state.value = "error";
      return;
    }

    error.value = null;
    clearPreview();
    chunks = [];

    try {
      stream = await navigator.mediaDevices.getUserMedia(
        buildAudioConstraints(),
      );
      permissionPrimed = true;
    } catch {
      error.value = "Accès au microphone refusé ou indisponible.";
      state.value = "error";
      return;
    }

    await loadDevices();

    const mimeType = pickSupportedMimeType();
    lastMimeType.value = mimeType ?? "audio/webm";
    recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: lastMimeType.value });
      lastBlob.value = blob;
      previewUrl.value = URL.createObjectURL(blob);
    };

    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    monitorLevel();

    recorder.start();
    startedAt = Date.now();
    elapsedMs.value = 0;
    timerHandle = setInterval(() => {
      elapsedMs.value = Date.now() - startedAt;
    }, 100);

    state.value = "recording";
  };

  const stop = (): void => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    cleanupStream();
    state.value = "stopped";
  };

  const reset = (): void => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    cleanupStream();
    clearPreview();
    elapsedMs.value = 0;
    level.value = 0;
    error.value = null;
    state.value = "idle";
  };

  onBeforeUnmount(() => {
    cleanupStream();
    clearPreview();
    if (isSupported) {
      navigator.mediaDevices.removeEventListener?.("devicechange", loadDevices);
    }
  });

  return {
    isSupported,
    state,
    elapsedMs,
    level,
    error,
    previewUrl,
    lastBlob,
    lastMimeType,
    devices,
    selectedDeviceId,
    start,
    stop,
    reset,
    requestPermission,
  };
}
