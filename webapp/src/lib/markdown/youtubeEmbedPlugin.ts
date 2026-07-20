import type MarkdownIt from "markdown-it";

const YOUTUBE_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?$/;

// Détecte un paragraphe composé d'un unique lien "nu" (texte du lien === href)
// pointant vers YouTube, et le remplace par un iframe embed. Les liens explicites
// ([Voir la vidéo](url)) ne sont pas concernés.
export function youtubeEmbedPlugin(md: MarkdownIt) {
  md.core.ruler.push("youtube_embed", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length - 2; i++) {
      if (tokens[i].type !== "paragraph_open") continue;

      const inline = tokens[i + 1];
      const close = tokens[i + 2];
      if (!inline || inline.type !== "inline" || !close) continue;

      const children = inline.children || [];
      const isBareLink =
        children.length === 3 &&
        children[0].type === "link_open" &&
        children[1].type === "text" &&
        children[2].type === "link_close";
      if (!isBareLink) continue;

      const href = children[0].attrGet("href") || "";
      const match = href.match(YOUTUBE_RE);
      if (!match || children[1].content.trim() !== href.trim()) continue;

      const embed = new state.Token("html_block", "", 0);
      embed.content = `<div class="yt-embed"><iframe src="https://www.youtube.com/embed/${match[1]}" title="YouTube video" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      embed.map = tokens[i].map;
      tokens.splice(i, 3, embed);
    }
  });
}
