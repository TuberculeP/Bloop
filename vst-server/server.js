import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { spawn } from "child_process";
import osc from "osc";

const PORT = 8080;
const SAMPLE_RATE = 48000;
const CHUNK_SIZE = 512;
const CHUNK_INTERVAL_MS = 10;

const VST_PATHS = {
  surge: "/usr/lib/vst3/Surge XT.vst3",
  vital: "/usr/lib/vst3/Vital.vst3",
  dexed: "/usr/lib/vst3/Dexed.vst3",
  "tal-noisemaker": "/usr/lib/vst3/TAL-NoiseMaker.vst3",
};

// ─── Synthetic audio (fallback, per-session) ──────────────────────────────────

class SynthSession {
  constructor() {
    this.notes = new Map();
  }

  noteOn(note, velocity) {
    const frequency = 440 * Math.pow(2, (note - 69) / 12);
    this.notes.set(note, {
      frequency,
      velocity: velocity / 127,
      phase: 0,
      attack: 0,
      release: 0,
    });
  }

  noteOff(note) {
    const n = this.notes.get(note);
    if (n) n.release = 1;
  }

  generate() {
    const samples = new Float32Array(CHUNK_SIZE);
    const toRemove = [];

    for (const [note, data] of this.notes) {
      const { frequency, velocity } = data;
      for (let i = 0; i < CHUNK_SIZE; i++) {
        const t = data.phase / SAMPLE_RATE;
        data.phase++;
        data.attack = Math.min(1, data.attack + 0.001);
        let env = data.attack;

        if (data.release > 0) {
          data.release = Math.max(0, data.release - 0.002);
          env *= data.release;
          if (data.release <= 0) {
            toRemove.push(note);
            break;
          }
        }

        const sine = Math.sin(2 * Math.PI * frequency * t);
        const saw = 2 * ((frequency * t) % 1) - 1;
        samples[i] = Math.max(
          -1,
          Math.min(1, samples[i] + (sine * 0.7 + saw * 0.3) * velocity * env * 0.3),
        );
      }
    }

    for (const note of toRemove) this.notes.delete(note);
    return samples;
  }

  dispose() {
    this.notes.clear();
  }
}

// ─── Carla backend (real VSTs via JACK) ───────────────────────────────────────

class CarlaBackend {
  constructor() {
    this.type = "carla";
    this.osc = null;
    this.clients = new Set();
    this.nextPluginId = 0;
  }

  async init() {
    this.osc = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: 0,
      remoteAddress: "127.0.0.1",
      remotePort: 22752,
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("OSC timeout")), 3000);
      this.osc.on("ready", () => {
        clearTimeout(timeout);
        resolve();
      });
      this.osc.on("error", reject);
      this.osc.open();
    });

    this._startAudioCapture();
  }

  _startAudioCapture() {
    // Create a ffmpeg JACK client named "vst-capture"
    const ffmpeg = spawn("ffmpeg", [
      "-nostats", "-loglevel", "error",
      "-f", "jack", "-i", "vst-capture",
      "-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "1",
      "pipe:1",
    ]);

    // Connect Carla's output to ffmpeg's input once both are ready
    setTimeout(() => {
      spawn("jack_connect", ["Carla:audio-out1", "vst-capture:input_1"], { stdio: "ignore" });
      spawn("jack_connect", ["Carla:audio-out2", "vst-capture:input_2"], { stdio: "ignore" });
    }, 3000);

    let remainder = Buffer.alloc(0);
    const bytesPerChunk = CHUNK_SIZE * 4;

    ffmpeg.stdout.on("data", (chunk) => {
      const data = Buffer.concat([remainder, chunk]);
      let offset = 0;

      while (offset + bytesPerChunk <= data.length) {
        const audioChunk = data.subarray(offset, offset + bytesPerChunk);
        for (const ws of this.clients) {
          if (ws.readyState === WebSocket.OPEN) ws.send(audioChunk);
        }
        offset += bytesPerChunk;
      }

      remainder = data.subarray(offset);
    });

    ffmpeg.on("error", (err) => {
      console.error("[Carla] ffmpeg error:", err.message);
    });
  }

  // Plugin slot is always 0 since we pre-load Surge XT via project file
  allocatePluginId() {
    return 0;
  }

  loadPlugin(_pluginId, vstId) {
    console.log(`[Carla] Plugin pre-loaded via project file: ${vstId}`);
  }

  noteOn(pluginId, note, velocity) {
    this.osc.send({
      address: `/Carla/${pluginId}/note_on`,
      args: [
        { type: "i", value: 0 },
        { type: "i", value: note },
        { type: "i", value: velocity },
      ],
    });
  }

  noteOff(pluginId, note) {
    this.osc.send({
      address: `/Carla/${pluginId}/note_off`,
      args: [
        { type: "i", value: 0 },
        { type: "i", value: note },
        { type: "i", value: 0 },
      ],
    });
  }

  addClient(ws) {
    this.clients.add(ws);
  }

  removeClient(ws) {
    this.clients.delete(ws);
  }
}

// ─── Synth backend (always available) ────────────────────────────────────────

class SynthBackend {
  constructor() {
    this.type = "synth";
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

class Session {
  constructor(ws, sessionId, backend) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.backend = backend;
    this.vstId = null;
    this.pluginId = null;
    this.synth = backend.type === "synth" ? new SynthSession() : null;
    this.audioInterval = null;
  }

  loadVst(vstId, preset) {
    this.vstId = vstId;

    if (this.backend.type === "carla") {
      this.pluginId = this.backend.allocatePluginId();
      this.backend.loadPlugin(this.pluginId, vstId);
    }

    this.ws.send(JSON.stringify({ type: "vst_loaded", vstId }));
    console.log(`[Session ${this.sessionId}] Loaded ${vstId} (backend: ${this.backend.type})`);

    if (this.synth && !this.audioInterval) {
      this.audioInterval = setInterval(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          this.dispose();
          return;
        }
        this.ws.send(this.synth.generate().buffer);
      }, CHUNK_INTERVAL_MS);
    }
  }

  noteOn(note, velocity) {
    this.synth?.noteOn(note, velocity);
    if (this.backend.type === "carla" && this.pluginId !== null) {
      this.backend.noteOn(this.pluginId, note, velocity);
    }
  }

  noteOff(note) {
    this.synth?.noteOff(note);
    if (this.backend.type === "carla" && this.pluginId !== null) {
      this.backend.noteOff(this.pluginId, note);
    }
  }

  dispose() {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    this.synth?.dispose();
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function detectBackend() {
  try {
    const backend = new CarlaBackend();
    await backend.init();
    console.log("[Server] Carla backend ready");
    return backend;
  } catch (err) {
    console.log(`[Server] Carla unavailable (${err.message}), using synth fallback`);
    return new SynthBackend();
  }
}

const backend = await detectBackend();

const httpServer = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", backend: backend.type }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server: httpServer });
const sessions = new Map();

wss.on("connection", (ws) => {
  let session = null;

  if (backend.type === "carla") backend.addClient(ws);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      switch (msg.type) {
        case "load_vst":
          if (!session) {
            session = new Session(ws, msg.sessionId, backend);
            sessions.set(msg.sessionId, session);
          }
          session.loadVst(msg.vstId, msg.preset);
          break;
        case "note_on":
          session?.noteOn(msg.note, msg.velocity ?? 100);
          break;
        case "note_off":
          session?.noteOff(msg.note);
          break;
      }
    } catch (e) {
      console.error("[WS] Parse error:", e);
    }
  });

  ws.on("close", () => {
    if (backend.type === "carla") backend.removeClient(ws);
    if (session) {
      session.dispose();
      sessions.delete(session.sessionId);
      session = null;
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`VST Stream Server — port ${PORT} — backend: ${backend.type}`);
});

process.on("SIGINT", () => {
  for (const session of sessions.values()) session.dispose();
  wss.close();
  process.exit(0);
});
