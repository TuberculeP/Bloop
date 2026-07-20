<script setup lang="ts">
const emit = defineEmits<{
  (e: "open-settings"): void;
}>();
</script>

<template>
  <div class="master-header">
    <div class="master-info">
      <span class="master-name">Master</span>
      <div class="master-controls">
        <button
          class="control-btn settings-btn"
          @click.stop="emit('open-settings')"
          title="Paramètres du bus master"
        >
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.master-header {
  padding: 8px 12px;
  background: var(--color-bg-daw-active);
  border-left: 4px solid var(--color-accent2);
  display: flex;
  align-items: center;
  height: 75px;
  box-sizing: border-box;
  position: sticky;
  left: 0;
  z-index: 1;
}

.master-info {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.master-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-white);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.master-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 3px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-accent3);
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-accent3-hover);
    color: var(--color-white);
  }
}
</style>
