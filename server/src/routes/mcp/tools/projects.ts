import { randomUUID } from "crypto";
import pg from "../../../config/db.config";
import { Project } from "../../../config/entities/Project";
import { User } from "../../../config/entities/User";
import { syncSampleLinksForProject } from "../../../services/sampleProjectLinks.service";

const TRACK_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

async function fetchProject(projectId: string, userId: string) {
  const repo = pg.getRepository(Project);
  const project = await repo.findOne({
    where: { id: projectId, user: { id: userId } },
  });
  if (!project) throw new Error(`Project ${projectId} not found`);
  if (!project.mcpEnabled)
    throw new Error(`MCP access not enabled for project ${projectId}`);
  return project;
}

async function saveProject(project: Project, name: string, timeline: any) {
  project.name = name;
  project.data = {
    version: "bloop-mcp-v1",
    format: "timeline-v3",
    data: timeline,
  };
  const repo = pg.getRepository(Project);
  const saved = await repo.save(project);
  await syncSampleLinksForProject(saved.id, timeline);
  return saved;
}

export const listProjectsTool = {
  name: "list_projects",
  description:
    "List all bloop DAW projects accessible via MCP. Returns project IDs, names and timestamps. Use project IDs with other tools to read or modify projects.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  async execute(_args: Record<string, unknown>, user: User) {
    const repo = pg.getRepository(Project);
    const projects = await repo.find({
      where: { user: { id: user.id }, mcpEnabled: true },
      select: ["id", "name", "description", "createdAt", "updatedAt"],
      order: { updatedAt: "DESC" },
    });
    return projects;
  },
};

export const getProjectTool = {
  name: "get_project",
  description:
    "Get full details of a bloop DAW project including all tracks, notes, and audio clips. Returns the complete TimelineProject data structure.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "The project ID (from list_projects)",
      },
    },
    required: ["projectId"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const { projectId } = args as { projectId: string };
    const project = await fetchProject(projectId, user.id);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      data: project.data,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
};

export const createProjectTool = {
  name: "create_project",
  description:
    "Create a new bloop DAW project. Returns the created project ID. " +
    "Timeline positions are in ticks: 96 ticks = 1 beat. A bar = timeSignature.numerator * 96 ticks " +
    "(e.g. 384 ticks per bar in 4/4). cols is the total timeline length in ticks, e.g. 3072 = 8 bars at 4/4. " +
    "InstrumentConfig examples: {type:'smplr',soundfont:'acoustic_grand_piano'}, {type:'basicSynth',oscillatorType:'sine'}, {type:'audioTrack'}. " +
    "MidiNote format: {i:uuid, x:tick, y:pitch_index, w:duration_ticks} — y: 0=B7 (highest), 86=C0 (lowest), C4=39, D4=37, E4=35, F4=34, G4=32, A4=30, B4=28.",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Project name" },
      tempo: { type: "number", description: "BPM (e.g. 120)" },
      cols: {
        type: "number",
        description:
          "Total timeline length in ticks (96 ticks/beat). 3072 = 8 bars at 4/4.",
      },
      timeSignature: {
        type: "object",
        description:
          "Optional time signature, defaults to {numerator:4,denominator:4}. numerator: 1-32, denominator: 1|2|4|8|16|32.",
        properties: {
          numerator: { type: "number" },
          denominator: { type: "number" },
        },
      },
      subdivision: {
        type: "number",
        description:
          "Optional grid/snap resolution (steps per beat), defaults to 4. Common values: 1,2,3,4,6,8,12,16,24,32.",
      },
      tracks: {
        type: "array",
        description: "Initial tracks to create (can be empty array [])",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            instrument: {
              type: "object",
              description:
                "InstrumentConfig: {type:'smplr',soundfont:'...'} or {type:'basicSynth',oscillatorType:'sine'|'square'|'sawtooth'|'triangle'} or {type:'audioTrack'}",
            },
            color: {
              type: "string",
              description:
                "Hex color. Pick from: #ef4444 #f97316 #eab308 #22c55e #06b6d4 #3b82f6 #8b5cf6 #ec4899",
            },
            notes: {
              type: "array",
              description:
                "MidiNote array: [{i:uuid, x:tick_position, y:pitch_index, w:duration_ticks}]",
              items: { type: "object" },
            },
          },
          required: ["name", "instrument"],
        },
      },
    },
    required: ["name", "tempo", "cols"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const {
      name,
      tempo,
      cols,
      timeSignature = { numerator: 4, denominator: 4 },
      subdivision = 4,
      tracks: inputTracks = [],
    } = args as {
      name: string;
      tempo: number;
      cols: number;
      timeSignature?: { numerator: number; denominator: number };
      subdivision?: number;
      tracks?: Array<{
        name: string;
        instrument: any;
        color?: string;
        notes?: any[];
      }>;
    };

    const tracks = (inputTracks as any[]).map((t, index) => ({
      id: randomUUID(),
      name: t.name,
      instrument: t.instrument,
      color: t.color || TRACK_COLORS[index % TRACK_COLORS.length],
      volume: 80,
      reverb: 0,
      eqBands: [],
      muted: false,
      solo: false,
      order: index,
      notes: t.notes || [],
      clips: [],
      automationLanes: [],
    }));

    const timeline = {
      name,
      tracks,
      cols,
      tempo,
      timeSignature,
      subdivision,
      volume: 80,
      reverb: 0,
      version: "5.0",
    };

    const repo = pg.getRepository(Project);
    const project = repo.create({
      name,
      data: { version: "bloop-mcp-v1", format: "timeline-v3", data: timeline },
      user,
      mcpEnabled: true,
    });
    const saved = await repo.save(project);
    return { id: saved.id, name: saved.name, createdAt: saved.createdAt };
  },
};

export const updateProjectTool = {
  name: "update_project",
  description:
    "Update top-level project settings (name, tempo, cols, volume, reverb). Does not modify tracks — use add_track, remove_track, or set_track_notes for track modifications.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: { type: "string", description: "The project ID" },
      name: { type: "string", description: "New project name (optional)" },
      tempo: { type: "number", description: "New BPM (optional)" },
      cols: {
        type: "number",
        description: "New timeline length in ticks (optional, 96 ticks/beat)",
      },
      volume: { type: "number", description: "Master volume 0-100 (optional)" },
      reverb: { type: "number", description: "Master reverb 0-100 (optional)" },
    },
    required: ["projectId"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const { projectId, ...updates } = args as {
      projectId: string;
      name?: string;
      tempo?: number;
      cols?: number;
      volume?: number;
      reverb?: number;
    };

    const project = await fetchProject(projectId, user.id);
    const timeline = project.data.data;

    if (updates.name !== undefined) timeline.name = updates.name;
    if (updates.tempo !== undefined) timeline.tempo = updates.tempo;
    if (updates.cols !== undefined) timeline.cols = updates.cols;
    if (updates.volume !== undefined) timeline.volume = updates.volume;
    if (updates.reverb !== undefined) timeline.reverb = updates.reverb;

    const saved = await saveProject(
      project,
      updates.name ?? project.name,
      timeline,
    );
    return { id: saved.id, name: saved.name, updatedAt: saved.updatedAt };
  },
};

export const addTrackTool = {
  name: "add_track",
  description:
    "Add a new track to an existing project. " +
    "InstrumentConfig: {type:'smplr',soundfont:'acoustic_grand_piano'} for MIDI with soundfont, " +
    "{type:'basicSynth',oscillatorType:'sine'} for oscillator synth, {type:'audioTrack'} for audio clips. " +
    "MidiNote y-axis: 0=B7 (highest), 86=C0 (lowest). C4=39, D4=37, E4=35, F4=34, G4=32, A4=30, B4=28.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: { type: "string", description: "The project ID" },
      name: { type: "string", description: "Track name" },
      instrument: {
        type: "object",
        description:
          "InstrumentConfig object. Examples: {type:'smplr',soundfont:'acoustic_grand_piano'}, {type:'basicSynth',oscillatorType:'sine'}, {type:'audioTrack'}",
      },
      color: {
        type: "string",
        description:
          "Track color hex. Options: #ef4444 #f97316 #eab308 #22c55e #06b6d4 #3b82f6 #8b5cf6 #ec4899",
      },
      notes: {
        type: "array",
        description:
          "Initial MIDI notes: [{i:uuid, x:tick_position, y:pitch_index, w:duration_ticks}] (96 ticks/beat).",
        items: { type: "object" },
      },
    },
    required: ["projectId", "name", "instrument"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const {
      projectId,
      name,
      instrument,
      color,
      notes = [],
    } = args as {
      projectId: string;
      name: string;
      instrument: any;
      color?: string;
      notes?: any[];
    };

    const project = await fetchProject(projectId, user.id);
    const timeline = project.data.data;

    const newTrack = {
      id: randomUUID(),
      name,
      instrument,
      color:
        color || TRACK_COLORS[timeline.tracks.length % TRACK_COLORS.length],
      volume: 80,
      reverb: 0,
      eqBands: [],
      muted: false,
      solo: false,
      order: timeline.tracks.length,
      notes,
      clips: [],
      automationLanes: [],
    };

    timeline.tracks.push(newTrack);
    await saveProject(project, project.name, timeline);
    return { trackId: newTrack.id, name: newTrack.name, order: newTrack.order };
  },
};

export const removeTrackTool = {
  name: "remove_track",
  description: "Remove a track from a project by its ID.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: { type: "string", description: "The project ID" },
      trackId: { type: "string", description: "The track ID to remove" },
    },
    required: ["projectId", "trackId"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const { projectId, trackId } = args as {
      projectId: string;
      trackId: string;
    };

    const project = await fetchProject(projectId, user.id);
    const timeline = project.data.data;
    const before = timeline.tracks.length;

    timeline.tracks = timeline.tracks.filter((t: any) => t.id !== trackId);
    if (timeline.tracks.length === before)
      throw new Error(`Track ${trackId} not found in project ${projectId}`);

    timeline.tracks.forEach((t: any, i: number) => {
      t.order = i;
    });
    await saveProject(project, project.name, timeline);
    return { removed: trackId, tracksRemaining: timeline.tracks.length };
  },
};

export const setTrackNotesTool = {
  name: "set_track_notes",
  description:
    "Replace all MIDI notes on a track. This overwrites existing notes entirely. " +
    "MidiNote format: {i: uuid_string, x: tick_position, y: pitch_index, w: duration_ticks}. " +
    "Pitch y-axis: 0=B7 (highest), 86=C0 (lowest). " +
    "C4 (middle C) = y:39. Semitone relationships: C4=39, D4=37, E4=35, F4=34, G4=32, A4=30, B4=28, C5=27. " +
    "96 ticks = 1 beat, regardless of tempo. 1 bar = timeSignature.numerator * 96 ticks (384 in 4/4). " +
    "Generate unique UUIDs for each note's i field.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: { type: "string", description: "The project ID" },
      trackId: { type: "string", description: "The track ID" },
      notes: {
        type: "array",
        description:
          "Full notes array to set. Each note: {i: uuid, x: start_tick, y: pitch_index_0_to_86, w: duration_ticks}",
        items: {
          type: "object",
          properties: {
            i: { type: "string", description: "Unique note ID (UUID)" },
            x: { type: "number", description: "Start position in ticks" },
            y: {
              type: "number",
              description: "Pitch index 0-86 (0=B7, 86=C0, C4=39)",
            },
            w: {
              type: "number",
              description: "Duration in ticks (96 = 1 beat)",
            },
          },
          required: ["i", "x", "y", "w"],
        },
      },
    },
    required: ["projectId", "trackId", "notes"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const { projectId, trackId, notes } = args as {
      projectId: string;
      trackId: string;
      notes: any[];
    };

    const project = await fetchProject(projectId, user.id);
    const timeline = project.data.data;
    const track = timeline.tracks.find((t: any) => t.id === trackId);
    if (!track)
      throw new Error(`Track ${trackId} not found in project ${projectId}`);

    track.notes = notes;
    await saveProject(project, project.name, timeline);
    return { trackId, notesSet: notes.length };
  },
};

export const addAudioClipTool = {
  name: "add_audio_clip",
  description:
    "Add an audio clip to an audioTrack. The track's instrument must be {type:'audioTrack'}. " +
    "Use list_samples to get valid sampleIds. " +
    "AudioClip format: {id: uuid, sampleId: sample_uuid, x: start_tick, w: width_ticks, startOffset: 0}. " +
    "w (width) should match the sample duration converted to ticks: duration_ticks ≈ sample_duration_seconds * (tempo/60) * 96.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: { type: "string", description: "The project ID" },
      trackId: {
        type: "string",
        description: "The audio track ID (must be type audioTrack)",
      },
      sampleId: { type: "string", description: "Sample ID from list_samples" },
      x: {
        type: "number",
        description: "Start position in ticks on the timeline",
      },
      w: {
        type: "number",
        description:
          "Width in ticks (96 ticks/beat). Use sample_duration_seconds * (tempo/60) * 96 as a rough guide.",
      },
      startOffset: {
        type: "number",
        description: "Sample start offset in ticks (usually 0)",
      },
    },
    required: ["projectId", "trackId", "sampleId", "x", "w"],
  },
  async execute(args: Record<string, unknown>, user: User) {
    const {
      projectId,
      trackId,
      sampleId,
      x,
      w,
      startOffset = 0,
    } = args as {
      projectId: string;
      trackId: string;
      sampleId: string;
      x: number;
      w: number;
      startOffset?: number;
    };

    const project = await fetchProject(projectId, user.id);
    const timeline = project.data.data;
    const track = timeline.tracks.find((t: any) => t.id === trackId);
    if (!track)
      throw new Error(`Track ${trackId} not found in project ${projectId}`);

    if (track.instrument.type !== "audioTrack")
      throw new Error(
        `Track ${trackId} is not an audioTrack (it is ${track.instrument.type}). Only audioTrack type supports audio clips.`,
      );

    const clip = { id: randomUUID(), sampleId, x, w, startOffset };
    if (!track.clips) track.clips = [];
    track.clips.push(clip);

    await saveProject(project, project.name, timeline);
    return { clipId: clip.id, trackId, x, w };
  },
};
