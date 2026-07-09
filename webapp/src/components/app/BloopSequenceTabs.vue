<template>
  <div class="sequence-tabs-container">
    <!-- Header avec les onglets -->
    <div class="tabs-header">
      <div class="tabs-list">
        <!-- Onglets des séquences -->
        <div
          v-for="sequence in sequencerStore.project.sequences"
          :key="sequence.id"
          class="tab"
          :class="{
            active: sequence.id === sequencerStore.project.activeSequenceId,
          }"
          @click="selectSequence(sequence.id)"
          @contextmenu.prevent="showContextMenu($event, sequence)"
        >
          <span class="tab-name">{{ sequence.name }}</span>
          <button
            class="tab-close"
            @click.stop="deleteSequence(sequence.id)"
            v-if="sequencerStore.project.sequences.length > 1"
            title="Supprimer la séquence"
          >
            ×
          </button>
        </div>

        <!-- Bouton ajouter nouvelle séquence -->
        <button
          class="tab-add"
          @click="createNewSequence"
          title="Nouvelle séquence"
        >
          +
        </button>
      </div>

      <!-- Contrôles de projet -->
      <div class="project-controls">
        <input
          v-model="projectName"
          class="project-name-input"
          :class="{ 'has-changes': projectStore.hasUnsavedChanges }"
          @blur="updateProjectName"
          @keyup.enter="updateProjectName"
          placeholder="Nom du projet"
          :title="
            projectStore.hasUnsavedChanges
              ? 'Projet modifié (non sauvegardé)'
              : 'Nom du projet'
          "
        />
        <div
          class="save-status"
          v-if="projectStore.hasUnsavedChanges"
          title="Changements non sauvegardés"
        >
          ●
        </div>
        <button
          @click="exportProject"
          class="btn btn-sm btn-success"
          title="Exporter le projet"
        >
          💾 Exporter
        </button>
      </div>
    </div>

    <!-- Menu contextuel -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click="hideContextMenu"
    >
      <div
        class="context-item"
        @click="renameSequence(contextMenu.sequence?.id)"
      >
        ✏️ Renommer
      </div>
      <div
        class="context-item"
        @click="duplicateSequence(contextMenu.sequence?.id)"
      >
        📋 Dupliquer
      </div>
      <div
        v-if="sequencerStore.project.sequences.length > 1"
        class="context-item danger"
        @click="deleteSequence(contextMenu.sequence?.id)"
      >
        🗑️ Supprimer
      </div>
    </div>

    <!-- Modal de renommage -->
    <div v-if="renameModal.visible" class="modal-overlay" @click="cancelRename">
      <div class="modal" @click.stop>
        <h3>Renommer la séquence</h3>
        <input
          ref="renameInput"
          v-model="renameModal.newName"
          class="rename-input"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          placeholder="Nom de la séquence"
        />
        <div class="modal-buttons">
          <button @click="cancelRename" class="btn btn-secondary">
            Annuler
          </button>
          <button @click="confirmRename" class="btn btn-primary">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed } from "vue";
import { useSequencerStore } from "../../stores/sequencerStore";
import { useProjectStore } from "../../stores/projectStore";
import type { Sequence } from "../../lib/utils/types";

const sequencerStore = useSequencerStore();
const projectStore = useProjectStore();

// Nom du projet (computed pour synchro)
const projectName = computed({
  get: () => sequencerStore.project.projectName,
  set: (value: string) => {
    sequencerStore.project.projectName = value;
    sequencerStore.project.updatedAt = new Date();
  },
});

// Menu contextuel
const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  sequence: Sequence | null;
}>({
  visible: false,
  x: 0,
  y: 0,
  sequence: null,
});

// Modal de renommage
const renameModal = ref<{
  visible: boolean;
  sequenceId: string | null;
  newName: string;
}>({
  visible: false,
  sequenceId: null,
  newName: "",
});

const renameInput = ref<HTMLInputElement | null>(null);

// Sélectionner une séquence
const selectSequence = (sequenceId: string): void => {
  sequencerStore.setActiveSequence(sequenceId);
};

// Créer une nouvelle séquence
const createNewSequence = (): void => {
  sequencerStore.createSequence();
};

// Supprimer une séquence
const deleteSequence = (sequenceId: string | undefined): void => {
  if (!sequenceId) return;

  const sequence = sequencerStore.project.sequences.find(
    (s) => s.id === sequenceId,
  );
  if (!sequence) return;

  if (sequencerStore.project.sequences.length === 1) {
    alert("Impossible de supprimer la dernière séquence.");
    return;
  }

  if (
    confirm(
      `Êtes-vous sûr de vouloir supprimer la séquence "${sequence.name}" ?`,
    )
  ) {
    sequencerStore.deleteSequence(sequenceId);
  }
  hideContextMenu();
};

// Afficher le menu contextuel
const showContextMenu = (event: MouseEvent, sequence: Sequence): void => {
  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    sequence,
  };
};

// Cacher le menu contextuel
const hideContextMenu = (): void => {
  contextMenu.value.visible = false;
  contextMenu.value.sequence = null;
};

// Démarrer le renommage
const renameSequence = (sequenceId: string | undefined): void => {
  if (!sequenceId) return;

  const sequence = sequencerStore.project.sequences.find(
    (s) => s.id === sequenceId,
  );
  if (!sequence) return;

  renameModal.value = {
    visible: true,
    sequenceId,
    newName: sequence.name,
  };

  hideContextMenu();

  nextTick(() => {
    renameInput.value?.focus();
    renameInput.value?.select();
  });
};

// Confirmer le renommage
const confirmRename = (): void => {
  if (!renameModal.value.sequenceId || !renameModal.value.newName.trim())
    return;

  sequencerStore.renameSequence(
    renameModal.value.sequenceId,
    renameModal.value.newName.trim(),
  );
  cancelRename();
};

// Annuler le renommage
const cancelRename = (): void => {
  renameModal.value.visible = false;
  renameModal.value.sequenceId = null;
  renameModal.value.newName = "";
};

// Dupliquer une séquence
const duplicateSequence = (sequenceId: string | undefined): void => {
  if (!sequenceId) return;

  const newId = sequencerStore.duplicateSequence(sequenceId);
  if (newId) {
    sequencerStore.setActiveSequence(newId);
  }
  hideContextMenu();
};

// Mettre à jour le nom du projet (plus besoin car computed)
const updateProjectName = (): void => {
  // La mise à jour se fait automatiquement via le computed setter
};

// Exporter le projet
const exportProject = (): void => {
  sequencerStore.exportProject();
};

// Gestion des clics globaux pour fermer le menu contextuel
const handleGlobalClick = (event: MouseEvent): void => {
  if (contextMenu.value.visible) {
    hideContextMenu();
  }
};

onMounted(() => {
  document.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleGlobalClick);
});
</script>

<style scoped>
.sequence-tabs-container {
  background-color: #2a2a2a;
  border-bottom: 2px solid #333;
}

.tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  height: 50px;
}

.tabs-list {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #333;
  border: 1px solid #444;
  border-bottom: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  border-radius: 4px 4px 0 0;
  max-width: 200px;
}

.tab:hover {
  background-color: #3a3a3a;
}

.tab.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.tab-name {
  font-size: 14px;
  font-weight: 500;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab.active .tab-name {
  color: white;
}

.tab-close {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s;
}

.tab-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab.active .tab-close {
  color: rgba(255, 255, 255, 0.8);
}

.tab.active .tab-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.tab-add {
  background-color: #444;
  border: 1px solid #555;
  color: #ccc;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 16px;
  font-weight: bold;
}

.tab-add:hover {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.project-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project-name-input {
  background-color: #333;
  border: 1px solid #444;
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
  transition: border-color 0.2s;
}

.project-name-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.project-name-input.has-changes {
  border-color: var(--color-warning);
}

.save-status {
  color: var(--color-warning);
  font-size: 18px;
  line-height: 1;
  margin-left: 5px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
  font-size: 12px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-success {
  background-color: var(--color-validate);
  color: white;
}

.btn-success:hover {
  background-color: var(--color-validate-hover);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--color-secondary-hover);
}

/* Menu contextuel */
.context-menu {
  position: fixed;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 150px;
}

.context-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #ccc;
  transition: background-color 0.2s;
}

.context-item:hover {
  background-color: #3a3a3a;
}

.context-item.danger {
  color: var(--color-error);
}

.context-item.danger:hover {
  background-color: rgba(238, 53, 53, 0.1);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.modal h3 {
  margin: 0 0 15px 0;
  color: white;
  font-size: 16px;
}

.rename-input {
  width: 100%;
  background-color: #333;
  border: 1px solid #444;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 15px;
}

.rename-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .tabs-header {
    flex-direction: column;
    height: auto;
    padding: 10px;
    gap: 10px;
  }

  .project-controls {
    width: 100%;
    justify-content: center;
  }

  .project-name-input {
    width: 150px;
  }

  .tab {
    max-width: 120px;
  }
}
</style>
