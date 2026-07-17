import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Route pour lister tous les fichiers JSON de demo_projects
router.get("/projects", (_req, res) => {
  try {
    const demoProjectsPath = path.join(
      __dirname,
      "../../../public/demo_projects",
    );

    // Vérifier que le dossier existe
    if (!fs.existsSync(demoProjectsPath)) {
      return res.status(404).json({
        error: "Demo projects folder not found",
        path: demoProjectsPath,
      });
    }

    // Lire le contenu du dossier
    const files = fs.readdirSync(demoProjectsPath);

    // Filtrer uniquement les fichiers JSON et extraire les métadonnées
    const projects = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const filePath = path.join(demoProjectsPath, file);
        const stats = fs.statSync(filePath);

        // Essayer de lire les métadonnées du fichier JSON
        let metadata = {
          name: file.replace(".json", "").replace(/[-_]/g, " "),
          description: null as string | null,
          tempo: null as number | null,
          duration: null as number | null,
        };

        try {
          const content = fs.readFileSync(filePath, "utf8");
          const jsonData = JSON.parse(content);

          // Extraire les métadonnées si disponibles
          if (jsonData.metadata) {
            metadata = { ...metadata, ...jsonData.metadata };
          }

          // Calculer des informations automatiques
          if (jsonData.tempo) {
            metadata.tempo = jsonData.tempo;
          }

          if (jsonData.layout) {
            const noteCount = jsonData.layout.length;
            const maxPosition = Math.max(
              ...jsonData.layout.map((note: any) => note.x + note.w),
            );
            metadata.description =
              metadata.description ||
              `${noteCount} notes, ${Math.ceil(maxPosition / 4)} mesures`;
          }
        } catch (error) {
          console.warn(`Could not parse metadata for ${file}:`, error);
        }

        return {
          filename: file,
          ...metadata,
          size: stats.size,
          lastModified: stats.mtime,
          url: `/public/demo_projects/${file}`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      projects,
      total: projects.length,
    });
  } catch (error) {
    console.error("Error listing demo projects:", error);
    return res.status(500).json({
      error: "Failed to list demo projects",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
