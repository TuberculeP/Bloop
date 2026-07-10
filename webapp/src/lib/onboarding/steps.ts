export type OnboardingStepId =
  | "create-project"
  | "add-track"
  | "add-instrument"
  | "open-settings"
  | "select-instrument"
  | "close-settings"
  | "add-notes"
  | "rename-project"
  | "play"
  | "save"
  | "export";

export interface OnboardingStep {
  id: OnboardingStepId;
  route: "app-main" | "app-sequencer";
  selector: string;
  /** Sélecteur réellement highlighté une fois l'élément apparu dynamiquement, si différent de `selector`. */
  expandedSelector?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "create-project",
    route: "app-main",
    selector: ".new-project-btn",
    title: "Créez votre premier projet",
    description: "Cliquez ici pour démarrer un nouveau projet musical.",
    side: "bottom",
  },
  {
    id: "add-track",
    route: "app-sequencer",
    selector: ".add-track-wrapper",
    title: "Ajoutez une piste",
    description: "Cliquez sur « Ajouter »",
    side: "bottom",
  },
  {
    id: "add-instrument",
    route: "app-sequencer",
    selector: ".instrument-menu",
    title: "Ajoutez une piste",
    description:
      "Choisissez « Sampler », l'instrument le plus simple pour démarrer.",
    side: "bottom",
  },
  {
    id: "open-settings",
    route: "app-sequencer",
    selector: ".track-settings-btn",
    title: "Réglez votre instrument",
    description: "Cliquez sur l'icône ⚙️ de la piste pour ouvrir ses réglages.",
    side: "top",
  },
  {
    id: "select-instrument",
    route: "app-sequencer",
    selector: ".instrument-select",
    title: "Choisissez la flûte",
    description:
      "Sélectionnez « flute » dans la liste pour changer le son de la piste.",
    side: "left",
  },
  {
    id: "close-settings",
    route: "app-sequencer",
    selector: ".close-settings-btn",
    title: "Fermez le panneau",
    description: "Cliquez sur la croix pour revenir à votre piste.",
    side: "left",
  },
  {
    id: "add-notes",
    route: "app-sequencer",
    selector: ".track-row",
    expandedSelector: ".piano-grid-canvas",
    title: "Ouvrez le piano roll",
    description:
      "Double-cliquez sur la piste pour ouvrir le piano roll, puis cliquez 3 fois sur la grille pour poser vos premières notes.",
    side: "top",
  },
  {
    id: "rename-project",
    route: "app-sequencer",
    selector: ".project-name",
    title: "Donnez un nom à votre projet",
    description: "Double-cliquez sur « Nouveau Projet » pour le renommer.",
    side: "bottom",
  },
  {
    id: "play",
    route: "app-sequencer",
    selector: ".play-btn",
    title: "Écoutez votre création",
    description:
      "Cliquez sur Play pour écouter votre morceau au fur et à mesure.",
    side: "bottom",
  },
  {
    id: "save",
    route: "app-sequencer",
    selector: ".save-project-btn",
    title: "Sauvegardez votre travail",
    description: "Cliquez sur Sauvegarder pour ne rien perdre.",
    side: "bottom",
  },
  {
    id: "export",
    route: "app-sequencer",
    selector: ".export-audio-btn",
    title: "Exportez votre morceau",
    description: "Cliquez sur Exporter pour générer le fichier audio final.",
    side: "bottom",
  },
];
