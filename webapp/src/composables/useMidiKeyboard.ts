import { ref, onBeforeUnmount } from "vue";

export function useMidiKeyboard() {
  const isSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.requestMIDIAccess === "function";

  const inputs = ref<MIDIInput[]>([]);
  const selectedInputId = ref<string | null>(null);
  const error = ref<string | null>(null);

  let midiAccess: MIDIAccess | null = null;
  let currentInput: MIDIInput | null = null;
  const noteOnCallbacks: Array<(pitch: number, velocity: number) => void> = [];
  const noteOffCallbacks: Array<(pitch: number) => void> = [];

  const handleMessage = (event: MIDIMessageEvent): void => {
    const data = event.data;
    if (!data) return;
    const [statusByte, pitch, velocity] = data;
    const status = statusByte & 0xf0;
    if (status === 0x90 && velocity > 0) {
      noteOnCallbacks.forEach((cb) => cb(pitch, velocity));
    } else if (status === 0x80 || status === 0x90) {
      noteOffCallbacks.forEach((cb) => cb(pitch));
    }
  };

  const attachToSelectedInput = (): void => {
    if (currentInput) {
      currentInput.onmidimessage = null;
      currentInput = null;
    }
    if (!midiAccess || !selectedInputId.value) return;
    const matches: MIDIInput[] = [];
    midiAccess.inputs.forEach((input) => {
      if (input.id === selectedInputId.value) matches.push(input);
    });
    currentInput = matches[0] ?? null;
    if (currentInput) currentInput.onmidimessage = handleMessage;
  };

  const populateInputs = (): void => {
    if (!midiAccess) return;
    const list: MIDIInput[] = [];
    midiAccess.inputs.forEach((input) => list.push(input));
    inputs.value = list;

    const stillExists = inputs.value.some(
      (input) => input.id === selectedInputId.value,
    );
    if (!stillExists) {
      selectedInputId.value = inputs.value[0]?.id ?? null;
    }
    attachToSelectedInput();
  };

  const requestAccess = async (): Promise<void> => {
    if (!isSupported) {
      error.value = "L'accès MIDI n'est pas supporté par ce navigateur.";
      return;
    }
    if (midiAccess) {
      populateInputs();
      return;
    }
    try {
      midiAccess = await navigator.requestMIDIAccess();
      error.value = null;
      midiAccess.onstatechange = populateInputs;
      populateInputs();
    } catch {
      error.value = "Accès MIDI refusé ou indisponible.";
    }
  };

  const selectInput = (id: string): void => {
    selectedInputId.value = id;
    attachToSelectedInput();
  };

  onBeforeUnmount(() => {
    if (currentInput) currentInput.onmidimessage = null;
    if (midiAccess) midiAccess.onstatechange = null;
  });

  const onNoteOn = (
    cb: (pitch: number, velocity: number) => void,
  ): (() => void) => {
    noteOnCallbacks.push(cb);
    return () => {
      const index = noteOnCallbacks.indexOf(cb);
      if (index > -1) noteOnCallbacks.splice(index, 1);
    };
  };

  const onNoteOff = (cb: (pitch: number) => void): (() => void) => {
    noteOffCallbacks.push(cb);
    return () => {
      const index = noteOffCallbacks.indexOf(cb);
      if (index > -1) noteOffCallbacks.splice(index, 1);
    };
  };

  return {
    isSupported,
    inputs,
    selectedInputId,
    error,
    requestAccess,
    selectInput,
    onNoteOn,
    onNoteOff,
  };
}
