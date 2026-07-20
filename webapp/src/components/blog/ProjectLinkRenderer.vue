<script setup lang="ts">
import { computed } from "vue";

import { formatShortDate } from "../../lib/utils/dateFormatter";

const props = withDefaults(
  defineProps<{
    text?: string | null;
    authorFirstName?: string | null;
    authorLastName?: string | null;
    date?: string | null;
  }>(),
  {
    text: "",
    authorFirstName: null,
    authorLastName: null,
    date: null,
  },
);

const authorSuffix = computed(() => {
  const authorName = [props.authorFirstName, props.authorLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const formattedDate = props.date ? formatShortDate(props.date) : "";

  if (!authorName && !formattedDate) {
    return "";
  }

  if (authorName && formattedDate) {
    return ` - ${authorName} (${formattedDate})`;
  }

  return ` - ${authorName || formattedDate}`;
});

type Segment =
  | { type: "text"; content: string }
  | { type: "link"; label: string; url: string };

const segments = computed(() => buildSegments(props.text ?? ""));

function buildSegments(text: string): Segment[] {
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const bareUrlRegex = /(https?:\/\/[^\s]+)/g;

  const regex = markdownLinkRegex.test(text) ? markdownLinkRegex : bareUrlRegex;
  regex.lastIndex = 0;

  const result: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    const isMarkdownLink = match.length > 2;
    const rawLabel = match[1];
    const rawUrl = isMarkdownLink ? match[2] : match[1];

    result.push({
      type: "link",
      label: formatLinkLabel(rawLabel) + authorSuffix.value,
      url: rawUrl,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", content: text.slice(lastIndex) });
  }

  return result;
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
        v-if="segment.type === 'link'"
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

.project-card {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
