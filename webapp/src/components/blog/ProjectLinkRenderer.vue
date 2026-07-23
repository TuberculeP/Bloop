<script setup lang="ts">
import { reactive, watch } from "vue";

import { formatShortDate } from "../../lib/utils/dateFormatter";
import { getProjectLinkPreview } from "../../services/projects";
import type { ProjectLinkPreview } from "../../lib/utils/types";

const props = withDefaults(
  defineProps<{
    text?: string | null;
  }>(),
  {
    text: "",
  },
);

// Seuls ces hosts sont considérés comme des liens Bloop éligibles à l'enrichissement.
const BLOOP_HOSTS = [
  "localhost:3000",
  "staging.bloop-on.cloud",
  "bloop-on.cloud",
];

type Segment =
  | { type: "text"; content: string }
  | {
      type: "link";
      url: string;
      label: string;
      projectId: string | null;
      preview: ProjectLinkPreview | null;
    };

const segments = reactive<Segment[]>([]);

// Renvoie l'id du projet si l'URL pointe vers un des hosts Bloop, sinon null.
function resolveBloopProjectId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (!BLOOP_HOSTS.includes(parsedUrl.host)) return null;
    return parsedUrl.searchParams.get("projectId");
  } catch {
    return null;
  }
}

function buildSegments(text: string): Segment[] {
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const bareUrlRegex = /(https?:\/\/[^\s]+)/g;

  const result: Segment[] = [];
  let lastIndex = 0;

  const pushMatches = (regex: RegExp, isMarkdownLink: boolean) => {
    let match: RegExpExecArray | null;
    let found = false;

    while ((match = regex.exec(text)) !== null) {
      found = true;

      if (match.index > lastIndex) {
        result.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      const rawLabel = match[1];
      const rawUrl = isMarkdownLink ? match[2] : match[1];

      result.push({
        type: "link",
        url: rawUrl,
        label: formatLinkLabel(rawLabel),
        projectId: resolveBloopProjectId(rawUrl),
        preview: null,
      });

      lastIndex = match.index + match[0].length;
    }

    return found;
  };

  if (!pushMatches(markdownLinkRegex, true)) {
    pushMatches(bareUrlRegex, false);
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", content: text.slice(lastIndex) });
  }

  return result;
}

async function enrichSegments(target: Segment[]) {
  await Promise.all(
    target.map(async (segment) => {
      if (segment.type !== "link" || !segment.projectId) return;

      const preview = await getProjectLinkPreview(segment.projectId);
      // Projet introuvable ou privé : on laisse le lien brut tel quel.
      if (preview) {
        segment.preview = preview;
      }
    }),
  );
}

watch(
  () => props.text,
  (text) => {
    const built = buildSegments(text ?? "");
    segments.splice(0, segments.length, ...built);
    enrichSegments(segments);
  },
  { immediate: true },
);

function formatLinkLabel(rawLabel: string) {
  const cleaned = rawLabel
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^['"]|['"]$/g, "");

  if (!cleaned) {
    return "Voir le projet";
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return deriveLabelFromUrl(cleaned);
  }

  return cleaned;
}

function deriveLabelFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment) {
      return decodeURIComponent(lastSegment)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return parsedUrl.hostname.replace(/^www\./i, "");
  } catch {
    return "Voir le projet";
  }
}
</script>

<template>
  <div class="renderer">
    <template v-for="(segment, index) in segments" :key="index">
      <a
        v-if="segment.type === 'link' && segment.preview"
        :href="segment.url"
        target="_blank"
        rel="noopener noreferrer"
        class="project-card"
      >
        <img
          src="../../assets/logo/logo_background_yellow_compact.svg"
          alt=""
          class="project-card-icon"
        />
        {{ segment.preview.name }} - {{ segment.preview.owner.firstName }}
        {{ segment.preview.owner.lastName }} ({{
          formatShortDate(segment.preview.createdAt)
        }})
      </a>
      <a
        v-else-if="segment.type === 'link'"
        :href="segment.url"
        target="_blank"
        rel="noopener noreferrer"
        class="plain-link"
      >
        {{ segment.label }}
      </a>
      <template v-else>{{ segment.content }}</template>
    </template>
  </div>
</template>

<style scoped>
.renderer {
  margin-top: 8px;
  white-space: pre-wrap;
}

.plain-link {
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
}

.plain-link:hover {
  color: var(--color-accent-hover);
}

.project-card {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 3px 10px;
  border-radius: 8px;
  text-decoration: none;
  background: #3d2540;
  border: 1px solid #6e4670;
  color: white;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  vertical-align: middle;
  overflow-wrap: break-word;
  box-sizing: border-box;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.project-card:hover {
  background: #4d2f52;
  border-color: #8a5c8d;
}

.project-card-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
