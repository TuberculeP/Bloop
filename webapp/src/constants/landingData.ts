// Landing Page Constants and Configuration
import type { HeroStat, MockupTrack, AnimationConfig } from "../types/landing";

export const LANDING_CONFIG = {
  // Animation defaults
  animations: {
    hero: {
      duration: 0.8,
      delay: 0.1,
      stagger: 0.05,
      ease: "power3.out",
    },
    scroll: {
      duration: 0.8,
      stagger: 0.1,
      ease: "power2.out",
    },
  } as Record<string, AnimationConfig>,

  // Scroll trigger defaults
  scrollTrigger: {
    start: "top 80%",
    end: "top 50%",
    scrub: false,
  },

  // Parallax settings
  parallax: {
    layer0Speed: 0.1,
    layer1Speed: 0.2,
    layer2Speed: 0.35,
    layer3Speed: 0.5,
  },
};

export const LANDING_STATS: HeroStat[] = [
  { value: "+20k", raw: 20000, suffix: "+", label: "Créateurs" },
  { value: "100%", raw: 100, suffix: "%", label: "Cloud" },
  { value: "infinity", label: "Possibilités" },
];

export const MOCKUP_TRACKS: MockupTrack[] = [
  {
    name: "Drums",
    color: "#ffd269",
    blocks: [
      { start: 5, width: 25 },
      { start: 35, width: 30 },
      { start: 70, width: 25 },
    ],
  },
  {
    name: "Bass",
    color: "#91a5f9",
    blocks: [
      { start: 10, width: 20 },
      { start: 40, width: 35 },
    ],
  },
  {
    name: "Synth",
    color: "#7cc8f5",
    blocks: [
      { start: 0, width: 15 },
      { start: 20, width: 25 },
      { start: 55, width: 40 },
    ],
  },
  {
    name: "Vocals",
    color: "#c891f9",
    blocks: [
      { start: 25, width: 20 },
      { start: 55, width: 25 },
      { start: 85, width: 15 },
    ],
  },
];

export const TRUST_AVATARS = [
  "https://i.pravatar.cc/150?img=1",
  "https://i.pravatar.cc/150?img=5",
  "https://i.pravatar.cc/150?img=8",
  "https://i.pravatar.cc/150?img=12",
];

// Scroll animation configurations
export const SCROLL_ANIMATIONS = {
  fadeInUp: {
    from: { opacity: 0, y: 50 },
    to: { opacity: 1, y: 0 },
  },
  fadeInScale: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1 },
  },
  slideInLeft: {
    from: { opacity: 0, x: -50 },
    to: { opacity: 1, x: 0 },
  },
  slideInRight: {
    from: { opacity: 0, x: 50 },
    to: { opacity: 1, x: 0 },
  },
};
