<template>
  <LandingLayout>
    <LandingHeader />
    <main class="legal-page">
      <div class="legal-container">
        <div class="legal-header">
          <div class="legal-ref">
            <span class="legal-ref-tick" aria-hidden="true"></span>
            <span>Document juridique</span>
            <span v-if="props.data.lastUpdated" class="legal-ref-sep">·</span>
            <span v-if="props.data.lastUpdated">
              MàJ {{ props.data.lastUpdated }}
            </span>
          </div>

          <h1 class="legal-title">{{ props.data.documentTitle }}</h1>

          <p v-if="props.data.intro" class="legal-intro">
            {{ props.data.intro }}
          </p>
        </div>

        <div class="legal-sections">
          <section
            v-for="section in props.data.sections"
            :id="`section-${section.id}`"
            :key="section.id"
          >
            <h2 class="legal-section-title">
              <span class="section-number">
                Art. {{ String(section.id).padStart(2, "0") }}
              </span>
              <span class="section-name">{{ section.title }}</span>
            </h2>

            <div class="legal-section-content">
              <template v-if="hasContent(section)">
                <p v-for="(paragraph, idx) in section.paragraphs" :key="idx">
                  {{ paragraph }}
                </p>
                <ul
                  v-if="section.list && section.list.length"
                  class="legal-list"
                >
                  <li v-for="(item, idx) in section.list" :key="idx">
                    {{ item }}
                  </li>
                </ul>
              </template>
              <p v-else class="legal-empty">Section à compléter.</p>
            </div>
          </section>

          <section id="section-editeur" class="legal-section">
            <h2 class="legal-section-title">
              <span class="section-name">Éditeur</span>
            </h2>
            <div class="legal-section-content legal-editor">
              <dl>
                <template v-for="(value, key) in editorFields" :key="key">
                  <dt>{{ key }}</dt>
                  <dd>{{ value || "—" }}</dd>
                </template>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </main>
    <LandingFooter />
  </LandingLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LandingLayout from "../../layouts/LandingLayout.vue";
import LandingHeader from "../../components/landing/LandingHeader.vue";
import LandingFooter from "../../components/landing/LandingFooter.vue";

const props = defineProps<{
  data: {
    documentTitle: string;
    shortName: string;
    lastUpdated?: string;
    intro?: string;
    sections: LegalSection[];
  };
}>();

interface LegalSection {
  id: string | number;
  title: string;
  paragraphs?: string[];
  list?: string[];
}

const hasContent = (section: LegalSection) =>
  !!section.paragraphs?.some((p) => p && p.trim().length > 0);

const editorFields = computed(() => ({
  Société: "Bloop",
  Adresse: "47 boulevard de Pesaro, 92000 Nanterre",
  "E-mail": "music@bloop.fr",
  "Directeur de publication": "Bloop",
  Hébergeur: "Coolify",
}));
</script>

<style scoped>
.legal-page {
  color: var(--color-white);
  padding: 8rem 0 6rem;
}

.legal-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 5rem;
}

.legal-header {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  justify-content: center;
  align-items: center;
}

.legal-ref {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Courier New", monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.legal-ref-tick {
  width: 10px;
  height: 1px;
  background: var(--color-accent);
}

.legal-ref-sep {
  color: rgba(255, 255, 255, 0.25);
}

.legal-title {
  font-size: clamp(2.25rem, 4.5vw, 3.5rem);
  font-weight: 500;
  line-height: 1.15;
  color: var(--color-white);
  margin-bottom: 1rem;
}

.legal-intro {
  font-size: 1.2rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.65);
}

.legal-sections {
  display: flex;
  flex-direction: column;
  gap: 5rem;
}

.legal-section-title {
  display: flex;
  align-items: baseline;
  gap: 0.85rem;
  font-size: 1.6rem;
  color: var(--color-white);
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 210, 105, 0.15);
}

.section-number {
  flex-shrink: 0;
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--color-accent);
}

.section-name {
  font-weight: 400;
}

.legal-section-content {
  font-size: 1.125rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.7);
}

.legal-section-content p {
  margin-bottom: 1rem;
}

.legal-section-content p:last-child {
  margin-bottom: 0;
}

.legal-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1rem;
}

.legal-list li {
  position: relative;
  padding-left: 1.25rem;
}

.legal-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
}

.legal-empty {
  font-style: italic;
  color: rgba(255, 255, 255, 0.35);
}

.legal-editor dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem 1.5rem;
}

.legal-editor dt {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
}

.legal-editor dd {
  font-size: 0.9rem;
  color: var(--color-white);
  margin: 0;
}

@media (max-width: 768px) {
  .legal-page {
    padding: 6rem 0 4rem;
  }

  .legal-container {
    padding: 0 1.5rem;
  }

  .legal-header {
    text-align: left;
  }

  .legal-editor dl {
    grid-template-columns: 1fr;
    gap: 0.2rem 0;
  }

  .legal-editor dt {
    margin-top: 0.75rem;
  }
}
</style>
