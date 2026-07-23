<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="!isComplete" class="daw-loading-overlay">
        <div class="loading-card">
          <div class="mascot-section">
            <img
              src="../../assets/stan_waiting.svg"
              class="mascot-img"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div class="logo-section">
            <span class="logo-text">bloop</span>
          </div>

          <div class="progress-section">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${overallProgress}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ overallProgress }}%</span>
          </div>

          <div class="status-section">
            <span v-if="currentPhase" class="current-phase">
              {{ currentPhase.name }}
            </span>
            <span class="current-task">{{ statusText }}</span>
          </div>

          <details v-if="showDebug" class="debug-section">
            <summary>Détails</summary>
            <div class="task-list">
              <div
                v-for="task in allTasks"
                :key="task.id"
                class="task-item"
                :class="task.status"
              >
                <span class="task-status-icon">{{
                  statusIcon(task.status)
                }}</span>
                <span class="task-label">{{ task.label }}</span>
              </div>
            </div>
          </details>

          <div v-if="error" class="error-section">
            <span class="error-text">{{ error }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useDawLoadingStore } from "../../stores/dawLoadingStore";

const props = withDefaults(
  defineProps<{
    showDebug?: boolean;
  }>(),
  {
    showDebug: false,
  },
);

const dawLoadingStore = useDawLoadingStore();
const {
  isComplete,
  currentPhase,
  statusText,
  overallProgress,
  allTasks,
  error,
} = storeToRefs(dawLoadingStore);

function statusIcon(status: string): string {
  switch (status) {
    case "complete":
      return "✓";
    case "loading":
      return "◌";
    case "error":
      return "✗";
    default:
      return "○";
  }
}
</script>

<style scoped lang="scss">
.daw-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-card {
  background: rgba(26, 14, 21, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  padding: 40px;
  min-width: 360px;
  max-width: 90vw;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mascot-section {
  display: flex;
  justify-content: center;
}

.mascot-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.logo-section {
  text-align: center;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  /* stylelint-disable-next-line color-no-hex -- teinte de dégradé décorative, propre à ce logo */
  background: linear-gradient(135deg, var(--color-accent2) 0%, #ff6f91 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: pulse-logo 2s ease-in-out infinite;
}

@keyframes pulse-logo {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  /* stylelint-disable-next-line color-no-hex -- teinte de dégradé décorative, propre à cette barre de progression */
  background: linear-gradient(90deg, var(--color-accent2), #ff6f91);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  min-width: 40px;
  text-align: right;
}

.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.current-phase {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.current-task {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.debug-section {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--color-accent3-rgb), 0.3);

  summary {
    cursor: pointer;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 12px;

    &:hover {
      color: rgba(255, 255, 255, 0.6);
    }
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);

  &.complete {
    color: var(--color-status-success);
  }

  &.loading {
    color: var(--color-accent2);
  }

  &.error {
    color: var(--color-status-error);
  }
}

.task-status-icon {
  width: 16px;
  text-align: center;
}

.task-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-section {
  padding: 12px;
  background: rgba(var(--color-status-error-rgb), 0.1);
  border: 1px solid rgba(var(--color-status-error-rgb), 0.3);
  border-radius: var(--radius-md);
}

.error-text {
  font-size: 13px;
  color: var(--color-status-error);
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
