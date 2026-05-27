import pg from "../../../config/db.config";
import { SamplePack } from "../../../config/entities/SamplePack";
import { AudioSample } from "../../../config/entities/AudioSample";

export const listSamplePacksTool = {
  name: "list_sample_packs",
  description:
    "List available audio sample packs in bloop. Returns packs with their folders (id, name). Use folder IDs with list_samples to get individual samples.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  async execute(_args: Record<string, unknown>) {
    const packRepo = pg.getRepository(SamplePack);
    const packs = await packRepo.find({ relations: ["folders"] });
    return packs.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      author: p.author,
      folders: (p.folders || []).map((f) => ({ id: f.id, name: f.name })),
    }));
  },
};

export const listSamplesTool = {
  name: "list_samples",
  description:
    "List audio samples in a specific folder of a sample pack. Returns sample IDs, names and durations. Use sampleId in audio clip definitions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      packSlug: {
        type: "string",
        description: "The pack slug (from list_sample_packs)",
      },
      folderId: {
        type: "string",
        description: "The folder ID (from list_sample_packs)",
      },
    },
    required: ["packSlug", "folderId"],
  },
  async execute(args: Record<string, unknown>) {
    const { folderId } = args as { packSlug: string; folderId: string };
    const sampleRepo = pg.getRepository(AudioSample);
    const samples = await sampleRepo.find({
      where: { folder: { id: folderId } },
    });
    return samples.map((s) => ({
      id: s.id,
      name: s.name,
      duration: s.duration,
    }));
  },
};
