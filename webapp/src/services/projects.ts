// services/projects.ts
import apiClient from "../lib/utils/apiClient";
import type { ProjectLinkPreview } from "../lib/utils/types";

// Module-level : partagé par tous les ProjectLinkRenderer (un même projet peut
// être lié plusieurs fois sur un feed), pas de doublon de requête en vol.
const previewCache = new Map<string, Promise<ProjectLinkPreview | null>>();

export const getProjectLinkPreview = (
  id: string,
): Promise<ProjectLinkPreview | null> => {
  let pending = previewCache.get(id);

  if (!pending) {
    pending = fetchProjectLinkPreview(id);
    previewCache.set(id, pending);
  }

  return pending;
};

const fetchProjectLinkPreview = async (
  id: string,
): Promise<ProjectLinkPreview | null> => {
  const { data, error } = await apiClient.get<{ body: ProjectLinkPreview }>(
    `/app/projects/${id}/link-preview`,
  );

  if (!data || error) {
    return null;
  }

  return data.body;
};
