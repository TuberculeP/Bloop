export type OnboardingStepId =
  | "create-project"
  | "add-track"
  | "add-notes"
  | "add-instrument";

export interface OnboardingStep {
  id: OnboardingStepId;
  route: "app-main" | "app-sequencer";
  selector: string;
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
    description: "Choisissez un instrument (Synth, Sampler...).",
    side: "bottom",
  },
  {
    id: "add-notes",
    route: "app-sequencer",
    selector: ".track-row",
    title: "Ouvrez le piano roll",
    description:
      "Double-cliquez sur la piste pour ouvrir le piano roll, puis cliquez 3 fois sur la grille pour poser vos premières notes.",
    side: "top",
  },
];
