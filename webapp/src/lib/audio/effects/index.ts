// Types
export type {
  EffectInstance,
  EffectParamDescriptor,
  EffectParamMeta,
} from "./types";
export type { EffectDefinition } from "./registry";

// Registry
export {
  registerEffect,
  getEffectDefinition,
  listEffectDefinitions,
  createEffectInstance,
} from "./registry";

// Chain
export { EffectChain } from "./effectChain";

// Enregistrement des effets intégrés au chargement du module
import { registerEffect } from "./registry";
import { eq5Definition } from "./eq5";
import { reverbDefinition } from "./reverb";
import { compressorDefinition } from "./compressor";
import { limiterDefinition } from "./limiter";
import { overdriveDefinition } from "./overdrive";
import { bloopyPumpDefinition } from "./bloopyPump";

registerEffect(eq5Definition);
registerEffect(reverbDefinition);
registerEffect(compressorDefinition);
registerEffect(limiterDefinition);
registerEffect(overdriveDefinition);
registerEffect(bloopyPumpDefinition);
