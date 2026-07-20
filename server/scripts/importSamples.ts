/**
 * Script one-shot pour migrer le manifest.json vers la DB
 * Usage: cd server && npx ts-node scripts/importSamples.ts
 */
import "reflect-metadata";
import "dotenv/config";
import pg from "../src/config/db.config";
import { SamplePack } from "../src/config/entities/SamplePack";
import { SampleFolder } from "../src/config/entities/SampleFolder";
import { AudioSample } from "../src/config/entities/AudioSample";
import * as fs from "fs";
import * as path from "path";

interface ManifestSample {
  id: string;
  name: string;
  filename: string;
}

interface ManifestFolder {
  name: string;
  samples: ManifestSample[];
}

interface ManifestPack {
  id: string;
  name: string;
  author?: string;
  cover?: string;
  featured?: boolean;
  folders: ManifestFolder[];
}

interface Manifest {
  packs: ManifestPack[];
}

async function importManifest() {
  await pg.initialize();

  const manifestPath = path.resolve(
    __dirname,
    "../../webapp/public/samples/manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    console.error("Manifest not found at:", manifestPath);
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  const packRepo = pg.getRepository(SamplePack);
  const folderRepo = pg.getRepository(SampleFolder);
  const sampleRepo = pg.getRepository(AudioSample);

  console.log("Clearing existing sample data...");
  await sampleRepo.delete({});
  await folderRepo.delete({});
  await packRepo.delete({});

  let totalSamples = 0;

  for (const mp of manifest.packs) {
    console.log(`\nImporting pack: ${mp.name}...`);

    const pack = packRepo.create({
      slug: mp.id,
      name: mp.name,
      author: mp.author ?? null,
      cover: mp.cover ?? null,
      featured: mp.featured ?? false,
    });
    await packRepo.save(pack);

    for (let i = 0; i < mp.folders.length; i++) {
      const mf = mp.folders[i];

      const folder = folderRepo.create({
        name: mf.name,
        order: i,
        packId: pack.id,
      });
      await folderRepo.save(folder);

      for (const ms of mf.samples) {
        const sample = sampleRepo.create({
          name: ms.name,
          filename: ms.filename,
          duration: 0,
          folderId: folder.id,
          previewUrl: null,
          fullUrl: null,
        });
        await sampleRepo.save(sample);
        totalSamples++;
      }

      console.log(`  - Folder "${mf.name}": ${mf.samples.length} samples`);
    }
  }

  console.log(`\n✓ Import complete!`);
  console.log(`  - ${manifest.packs.length} packs`);
  console.log(`  - ${totalSamples} samples total`);

  await pg.destroy();
  process.exit(0);
}

importManifest().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
