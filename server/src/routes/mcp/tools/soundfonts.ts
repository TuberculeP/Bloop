import { getSoundfontNames } from "smplr";

const SOUNDFONTS = getSoundfontNames();

export const listSoundfontsTool = {
  name: "list_soundfonts",
  description:
    "List all available soundfonts for MIDI instrument tracks (smplr instrument type). Use the soundfont name in SmplrConfig when creating tracks.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  async execute(_args: Record<string, unknown>) {
    return SOUNDFONTS;
  },
};
