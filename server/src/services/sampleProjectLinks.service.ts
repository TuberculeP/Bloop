import { In } from "typeorm";
import pg from "../config/db.config";
import { UserSample } from "../config/entities/UserSample";
import { UserSampleProjectLink } from "../config/entities/UserSampleProjectLink";

export async function syncSampleLinksForProject(
  projectId: string,
  timeline: any,
): Promise<void> {
  const referencedIds = new Set<string>();
  for (const track of timeline?.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip?.sampleId) referencedIds.add(clip.sampleId);
    }
  }

  const linkRepository = pg.getRepository(UserSampleProjectLink);
  const existingLinks = await linkRepository.find({ where: { projectId } });

  if (referencedIds.size === 0 && existingLinks.length === 0) return;

  // Les clips peuvent aussi référencer un AudioSample de la bibliothèque admin :
  // on ne matérialise le lien que pour les vrais UserSample.
  let validIds = new Set<string>();
  if (referencedIds.size > 0) {
    const rows = await pg.getRepository(UserSample).find({
      where: { id: In([...referencedIds]) },
      select: ["id"],
    });
    validIds = new Set(rows.map((r) => r.id));
  }

  const existingIds = new Set(existingLinks.map((l) => l.sampleId));
  const toAdd = [...validIds].filter((id) => !existingIds.has(id));
  const toRemove = existingLinks.filter((l) => !validIds.has(l.sampleId));

  if (toAdd.length) {
    await linkRepository.insert(
      toAdd.map((sampleId) => ({ sampleId, projectId })),
    );
  }
  if (toRemove.length) {
    await linkRepository.remove(toRemove);
  }
}
