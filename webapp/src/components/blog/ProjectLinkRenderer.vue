<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    text?: string | null;
  }>(),
  {
    text: "",
  },
);

const projectLinks = computed(() => extractProjectLinks(props.text ?? ""));

function extractProjectLinks(text: string) {
  const links: Array<{ label: string; url: string }> = [];
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const bareUrlRegex = /(https?:\/\/[^\s]+)/g;

  let match: RegExpExecArray | null;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const [, rawLabel, rawUrl] = match;
    links.push({
      label: formatLinkLabel(rawLabel),
      url: rawUrl,
    });
  }

  if (links.length === 0) {
    while ((match = bareUrlRegex.exec(text)) !== null) {
      const rawUrl = match[1];
      links.push({
        label: formatLinkLabel(rawUrl),
        url: rawUrl,
      });
    }
  }

  return links;
}

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
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];

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
  <div v-if="projectLinks.length" class="renderer">
    <a
      v-for="link in projectLinks"
      :key="link.url"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      class="project-card"
    >
      {{ link.label }}
    </a>
  </div>

  <div v-else class="renderer">
    {{ props.text }}
  </div>
</template>

<style scoped>
.renderer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.project-card {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 10px;
  text-decoration: none;
  background: #3d2540;
  border: 1px solid #6e4670;
  color: white;
  font-weight: 600;
}
</style>