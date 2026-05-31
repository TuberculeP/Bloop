import pg from "../config/db.config";
import { SamplePack } from "../config/entities/SamplePack";
import { SampleFolder } from "../config/entities/SampleFolder";
import { AudioSample } from "../config/entities/AudioSample";
import { listR2ObjectKeys, getR2Json, isR2Configured } from "./r2.service";
import { sanitizeFilename } from "../utils/sanitize";

const CDN_BASE_URL = process.env.CDN_BASE_URL;

interface PackMeta {
  name: string;
  author?: string;
  cover?: string;
  featured: boolean;
  isActive: boolean;
}

interface FolderMeta {
  name: string;
  order: number;
}

interface SampleMeta {
  name: string;
}

const AUDIO_EXTENSIONS = new Set([".wav", ".mp3", ".ogg", ".flac"]);

interface ParsedR2Keys {
  packSlugs: Set<string>;
  folderMetaKeys: Map<string, { slug: string; folderSafe: string }>;
  sampleAudioKeys: Map<
    string,
    { slug: string; folderSafe: string; filename: string }
  >;
}

function parseR2Keys(allKeys: string[]): ParsedR2Keys {
  const packSlugs = new Set<string>();
  const folderMetaKeys = new Map<
    string,
    { slug: string; folderSafe: string }
  >();
  const sampleAudioKeys = new Map<
    string,
    { slug: string; folderSafe: string; filename: string }
  >();

  for (const key of allKeys) {
    const parts = key.split("/");
    if (parts.length < 3 || parts[0] !== "samples") continue;

    const slug = parts[1];

    if (parts.length === 3 && parts[2] === "meta.json") {
      packSlugs.add(slug);
      continue;
    }

    if (parts.length === 4 && parts[3] === "meta.json") {
      folderMetaKeys.set(key, { slug, folderSafe: parts[2] });
      continue;
    }

    if (parts.length === 4) {
      const filename = parts[3];
      const dotIdx = filename.lastIndexOf(".");
      if (dotIdx === -1) continue;
      const ext = filename.slice(dotIdx).toLowerCase();
      if (AUDIO_EXTENSIONS.has(ext)) {
        sampleAudioKeys.set(key, { slug, folderSafe: parts[2], filename });
      }
    }
  }

  return { packSlugs, folderMetaKeys, sampleAudioKeys };
}

export async function syncFromR2(): Promise<void> {
  if (!isR2Configured()) {
    console.log("[R2Sync] R2 not configured, skipping.");
    return;
  }

  console.log("[R2Sync] Starting sync...");

  const packRepo = pg.getRepository(SamplePack);
  const folderRepo = pg.getRepository(SampleFolder);
  const sampleRepo = pg.getRepository(AudioSample);

  let allKeys: string[];
  try {
    allKeys = await listR2ObjectKeys("samples/");
  } catch (err) {
    console.error("[R2Sync] Failed to list R2 keys:", err);
    return;
  }

  const { packSlugs, folderMetaKeys, sampleAudioKeys } = parseR2Keys(allKeys);

  // ---- PACKS ----

  const existingPacks = await packRepo.find();
  const packBySlug = new Map(existingPacks.map((p) => [p.slug, p]));

  for (const slug of packSlugs) {
    if (packBySlug.has(slug)) continue;

    const meta = await getR2Json<PackMeta>(`samples/${slug}/meta.json`).catch(
      () => null,
    );
    if (!meta) {
      console.warn(`[R2Sync] No meta.json for pack ${slug}, skipping.`);
      continue;
    }

    try {
      const entity = Object.assign(new SamplePack(), {
        slug,
        name: meta.name,
        author: meta.author ?? null,
        cover: meta.cover ?? null,
        featured: meta.featured,
        isActive: meta.isActive,
      });
      const saved = await packRepo.save(entity);
      packBySlug.set(slug, saved);
      console.log(`[R2Sync] Created pack: ${slug}`);
    } catch (err) {
      console.error(`[R2Sync] Failed to create pack ${slug}:`, err);
    }
  }

  for (const pack of existingPacks) {
    if (!packSlugs.has(pack.slug)) {
      try {
        await packRepo.remove(pack);
        packBySlug.delete(pack.slug);
        console.log(`[R2Sync] Deleted pack: ${pack.slug}`);
      } catch (err) {
        console.error(`[R2Sync] Failed to delete pack ${pack.slug}:`, err);
      }
    }
  }

  // ---- FOLDERS ----

  const existingFolders = await folderRepo.find({ relations: ["pack"] });

  // Index: "{slug}/{folderSafe}" → SampleFolder
  const folderByKey = new Map<string, SampleFolder>();
  for (const f of existingFolders) {
    folderByKey.set(`${f.pack.slug}/${sanitizeFilename(f.name)}`, f);
  }

  const r2FolderKeys = new Set(
    [...folderMetaKeys.values()].map((v) => `${v.slug}/${v.folderSafe}`),
  );

  for (const [metaKey, { slug, folderSafe }] of folderMetaKeys) {
    const naturalKey = `${slug}/${folderSafe}`;
    if (folderByKey.has(naturalKey)) continue;

    const pack = packBySlug.get(slug);
    if (!pack) continue;

    const meta = await getR2Json<FolderMeta>(metaKey).catch(() => null);
    if (!meta) {
      console.warn(`[R2Sync] No meta for folder ${metaKey}, skipping.`);
      continue;
    }

    try {
      const folderEntity = Object.assign(new SampleFolder(), {
        name: meta.name,
        order: meta.order,
        packId: pack.id,
      });
      const saved = await folderRepo.save(folderEntity);
      folderByKey.set(naturalKey, saved);
      console.log(`[R2Sync] Created folder: ${slug}/${meta.name}`);
    } catch (err) {
      console.error(`[R2Sync] Failed to create folder ${metaKey}:`, err);
    }
  }

  for (const [key, folder] of folderByKey) {
    const [slug] = key.split("/");
    if (!packSlugs.has(slug)) continue; // pack deletion handles cascade
    if (!r2FolderKeys.has(key)) {
      try {
        await folderRepo.remove(folder);
        console.log(`[R2Sync] Deleted folder: ${key}`);
      } catch (err) {
        console.error(`[R2Sync] Failed to delete folder ${key}:`, err);
      }
    }
  }

  // ---- SAMPLES ----

  const existingSamples = await sampleRepo.find({
    relations: ["folder", "folder.pack"],
  });

  // Index: "samples/{slug}/{folderSafe}/{filename}" → AudioSample
  const sampleByAudioKey = new Map<string, AudioSample>();
  for (const s of existingSamples) {
    const slug = s.folder.pack.slug;
    const folderSafe = sanitizeFilename(s.folder.name);
    sampleByAudioKey.set(`samples/${slug}/${folderSafe}/${s.filename}`, s);
  }

  for (const [audioKey, { slug, folderSafe, filename }] of sampleAudioKeys) {
    if (sampleByAudioKey.has(audioKey)) continue;

    const folder = folderByKey.get(`${slug}/${folderSafe}`);
    if (!folder) {
      console.warn(`[R2Sync] No folder for sample ${audioKey}, skipping.`);
      continue;
    }

    const jsonKey = audioKey.replace(/\.[^.]+$/, ".json");
    const meta = await getR2Json<SampleMeta>(jsonKey).catch(() => null);

    const displayName =
      meta?.name ?? filename.replace(/\.[^.]+$/, "").replace(/^\d+-/, "");
    const fullUrl = CDN_BASE_URL ? `${CDN_BASE_URL}/${audioKey}` : "";

    try {
      const sampleEntity = Object.assign(new AudioSample(), {
        name: displayName,
        filename,
        duration: 0,
        folderId: folder.id,
        fullUrl,
        previewUrl: fullUrl,
      });
      await sampleRepo.save(sampleEntity);
      console.log(`[R2Sync] Created sample: ${audioKey}`);
    } catch (err) {
      console.error(`[R2Sync] Failed to create sample ${audioKey}:`, err);
    }
  }

  const freshSamples = await sampleRepo.find({
    relations: ["folder", "folder.pack"],
  });
  for (const s of freshSamples) {
    const slug = s.folder.pack.slug;
    const folderSafe = sanitizeFilename(s.folder.name);
    const expectedKey = `samples/${slug}/${folderSafe}/${s.filename}`;
    if (!sampleAudioKeys.has(expectedKey)) {
      try {
        await sampleRepo.remove(s);
        console.log(`[R2Sync] Deleted sample: ${expectedKey}`);
      } catch (err) {
        console.error(`[R2Sync] Failed to delete sample ${s.id}:`, err);
      }
    }
  }

  console.log("[R2Sync] Sync complete.");
}
