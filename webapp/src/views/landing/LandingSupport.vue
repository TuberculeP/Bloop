<template>
  <LandingLayout>
    <LandingHeader />
    <main class="support-page">
      <div class="support-container">
        <header class="support-header">
          <div class="support-ref">
            <span class="support-ref-tick" aria-hidden="true"></span>
            <span>Support</span>
          </div>

          <h1 class="support-title">Besoin d'aide&nbsp;?</h1>

          <p class="support-intro">
            Tu trouveras sûrement ta réponse ci-dessous. Sinon, on est là pour
            t'aider.
          </p>
        </header>

        <section class="support-section">
          <h2 class="support-section-title">Questions fréquentes</h2>
          <div class="faq-list">
            <details class="faq-item">
              <summary>Est-ce que Bloop est vraiment gratuit ?</summary>
              <p>
                Oui. La bibliothèque de sons, les instruments et les
                fonctionnalités de base sont 100% gratuits, sans carte bancaire
                nécessaire.
              </p>
            </details>
            <details class="faq-item">
              <summary>Dois-je installer un logiciel ?</summary>
              <p>
                Non, Bloop fonctionne directement dans ton navigateur. Aucune
                installation requise.
              </p>
            </details>
            <details class="faq-item">
              <summary>
                Puis-je utiliser Bloop sans expérience musicale ?
              </summary>
              <p>
                Complètement. L'interface a été pensée pour être comprise en
                quelques minutes, même si tu n'as jamais fait de musique avant.
              </p>
            </details>
            <details class="faq-item">
              <summary>Comment fonctionne le remix communautaire ?</summary>
              <p>
                Quand tu publies un projet, les autres membres de la communauté
                peuvent le reprendre et créer leur propre version à partir du
                tien.
              </p>
            </details>
            <details class="faq-item">
              <summary>Mes créations m'appartiennent-elles ?</summary>
              <p>
                Oui, tu restes propriétaire de ce que tu crées. Consulte nos
                <router-link to="/cgu">CGU</router-link> pour le détail.
              </p>
            </details>
          </div>
        </section>

        <section class="support-contact">
          <h2>Pas trouvé ta réponse ?</h2>
          <p>Écris-nous, on répond rapidement.</p>
          <div class="contact-actions">
            <a href="mailto:support@bloop.com" class="contact-btn primary">
              Nous écrire
            </a>
            <a
              href="https://www.instagram.com/bloop_music/"
              target="_blank"
              rel="noopener"
              class="contact-btn"
            >
              Nous rejoindre sur Instagram
            </a>
          </div>
        </section>
      </div>
    </main>
    <LandingFooter />
  </LandingLayout>
</template>

<script setup lang="ts">
import LandingLayout from "../../layouts/LandingLayout.vue";
import LandingHeader from "../../components/landing/LandingHeader.vue";
import LandingFooter from "../../components/landing/LandingFooter.vue";
</script>

<style scoped>
.support-page {
  color: var(--color-white);
  padding: 8rem 0 6rem;
}

.support-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.support-header {
  text-align: center;
}

.support-ref {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Courier New", monospace;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1.5rem;
}

.support-ref-tick {
  width: 10px;
  height: 1px;
  background: var(--color-accent);
}

.support-title {
  font-size: clamp(2.25rem, 4.5vw, 3.25rem);
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.support-intro {
  font-size: 1.15rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.65);
}

.support-section-title {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-white);
  margin-bottom: 1.5rem;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.faq-item {
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  transition: border-color 0.3s ease;
}

.faq-item:hover {
  border-color: rgba(255, 210, 105, 0.25);
}

.faq-item summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--color-white);
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary::after {
  content: "+";
  font-size: 1.25rem;
  color: var(--color-accent);
  transition: transform 0.3s ease;
  flex-shrink: 0;
  margin-left: 1rem;
}

.faq-item[open] summary::after {
  transform: rotate(45deg);
}

.faq-item p {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
}

.faq-item p a {
  color: var(--color-accent);
  text-decoration: underline;
}

.support-contact {
  text-align: center;
  padding: 32px;
  background: linear-gradient(
    135deg,
    rgba(255, 210, 105, 0.08) 0%,
    rgba(145, 165, 249, 0.05) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
}

.support-contact h2 {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-white);
  margin-bottom: 0.5rem;
}

.support-contact p {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5rem;
}

.contact-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.contact-btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.contact-btn.primary {
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent-hover) 100%
  );
  color: var(--color-black);
}

.contact-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 210, 105, 0.3);
}

.contact-btn:not(.primary) {
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-white);
}

.contact-btn:not(.primary):hover {
  border-color: rgba(255, 210, 105, 0.5);
  color: var(--color-accent);
}

@media (max-width: 768px) {
  .support-page {
    padding: 6rem 0 4rem;
  }

  .support-container {
    padding: 0 1.5rem;
    gap: 3rem;
  }

  .contact-actions {
    flex-direction: column;
  }
}
</style>
