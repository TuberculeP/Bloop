// Globals de l'AudioWorkletGlobalScope, absents de la lib DOM de TypeScript.
// Ce fichier ne concerne que fm-synth-processor.ts (le seul module exécuté
// dans ce scope).
export {};

declare global {
  const sampleRate: number;

  class AudioWorkletProcessor {
    readonly port: MessagePort;
    constructor(options?: AudioWorkletNodeOptions);
    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>,
    ): boolean;
  }

  function registerProcessor(
    name: string,
    processorCtor: new (
      options?: AudioWorkletNodeOptions,
    ) => AudioWorkletProcessor,
  ): void;
}
