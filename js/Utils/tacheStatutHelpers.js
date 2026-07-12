/**
 * Calcule le statut global d'une tâche à partir du statut individuel
 * de chaque ouvrier assigné (affectation.statutPersonnel).
 *
 * - Si personne n'a commencé            → "A faire"
 * - Si tout le monde est validé          → "Valider"
 * - Si tout le monde a soumis sa partie
 *   (En attente ou déjà Valider)         → "En attente" (prêt pour revue du chef)
 * - Sinon (au moins un En cours/Renvoyer/Non commencer) → "En cours"
 */
export function calculerStatutGlobalTache(affectations) {
  if (!affectations || affectations.length === 0) return null;

  const statuts = affectations.map(a => a.statutPersonnel);

  if (statuts.every(s => s === "Non commencer")) return "A faire";
  if (statuts.every(s => s === "Valider" || s === "Terminer")) return "Valider";
  if (statuts.every(s => s === "En attente" || s === "Valider" || s === "Terminer")) return "En attente";
  return "En cours";
}