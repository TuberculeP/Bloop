// Mapping du clavier physique de l'ordinateur vers des notes de piano.
// Basé sur `KeyboardEvent.code` (position physique de la touche) plutôt que
// `event.key` (caractère produit) : la même touche physique déclenche donc
// la même note quelle que soit la disposition clavier de l'OS (AZERTY,
// QWERTY, QWERTZ...).
export const BASE_MIDI_NOTE = 60; // C4, note jouée par la touche la plus basse (Z)

export const CODE_TO_SEMITONE_OFFSET: Record<string, number> = {
  // Rangée du bas (touches lettres) = blanches, rangée du milieu (juste
  // au-dessus, en quinconce) = noires : reproduit l'agencement physique d'un
  // clavier de piano. Pas de touche noire entre E-F et B-C (comme sur un
  // vrai piano), donc F et K de la rangée du milieu restent inutilisés.
  KeyZ: 0, // C
  KeyS: 1, // C#
  KeyX: 2, // D
  KeyD: 3, // D#
  KeyC: 4, // E
  KeyV: 5, // F
  KeyG: 6, // F#
  KeyB: 7, // G
  KeyH: 8, // G#
  KeyN: 9, // A
  KeyJ: 10, // A#
  KeyM: 11, // B
  Comma: 12, // C
  KeyL: 13, // C#
  Period: 14, // D
  Semicolon: 15, // D#
  Slash: 16, // E

  // Même principe une octave au-dessus : rangée du haut (lettres) = blanches,
  // rangée des chiffres = noires (Digit4/Digit8 inutilisés, mêmes trous
  // E-F/B-C).
  KeyQ: 12, // C
  Digit2: 13, // C#
  KeyW: 14, // D
  Digit3: 15, // D#
  KeyE: 16, // E
  KeyR: 17, // F
  Digit5: 18, // F#
  KeyT: 19, // G
  Digit6: 20, // G#
  KeyY: 21, // A
  Digit7: 22, // A#
  KeyU: 23, // B
  KeyI: 24, // C
  Digit9: 25, // C#
  KeyO: 26, // D
  Digit0: 27, // D#
  KeyP: 28, // E
};
