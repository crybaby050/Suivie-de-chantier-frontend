/**
 * Calcule la progression d'une phase à partir de ses tâches.
 * Moyenne de la progression de chaque tâche (0 si aucune tâche).
 */
export function calculerProgressionPhase(taches) {
  if (!taches || taches.length === 0) return 0;
  const total = taches.reduce((sum, t) => sum + (t.progression ?? 0), 0);
  return Math.round(total / taches.length);
}

/**
 * Calcule la progression d'un projet à partir de ses phases
 * (déjà enrichies d'une progression via calculerProgressionPhase).
 * Moyenne des progressions de phase (0 si aucune phase).
 */
export function calculerProgressionProjet(phasesAvecProgression) {
  if (!phasesAvecProgression || phasesAvecProgression.length === 0) return 0;
  const total = phasesAvecProgression.reduce((sum, p) => sum + (p.progression ?? 0), 0);
  return Math.round(total / phasesAvecProgression.length);
}