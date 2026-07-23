import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";
import { updateDisponibilite } from "./utilisateurService.js";

function normalizeAffectation(data) {
  return {
    id:              data.id,
    tacheId:         data.tacheId,
    utilisateurId:   data.utilisateurId,
    dateDeDebut:     data.dateDeDebut,
    dateDeFin:       data.dateDeFin ?? null,
    statutPersonnel: data.statutPersonnel ?? "Non commencer",
  };
}

export async function getAffectationsByTache(tacheId) {
  return apiRequest(
    `${ENDPOINTS.affectationTaches}?tacheId=${tacheId}`,
    {},
    "Impossible de charger les affectations."
  );
}

export async function getAffectationsByUtilisateur(utilisateurId) {
  return apiRequest(
    `${ENDPOINTS.affectationTaches}?utilisateurId=${utilisateurId}`,
    {},
    "Impossible de charger les affectations de l'utilisateur."
  );
}

export async function affecterUtilisateur(data) {
  required(data.tacheId, "La tâche est obligatoire.");
  required(data.utilisateurId, "L'utilisateur est obligatoire.");

  const affectation = normalizeAffectation({
    id: createId("affect"),
    ...data,
  });

  const result = await apiRequest(
    ENDPOINTS.affectationTaches,
    { method: "POST", body: JSON.stringify(affectation) },
    "Impossible d'affecter l'utilisateur."
  );

  // Marquer l'ouvrier comme occupé dès l'affectation
  await updateDisponibilite(data.utilisateurId, "Occuper");

  return result;
}

export async function updateStatutAffectation(id, statutPersonnel) {
  // 1. Récupérer l'affectation AVANT la mise à jour pour avoir l'utilisateurId
  const affectations = await apiRequest(
    `${ENDPOINTS.affectationTaches}?id=${id}`,
    {},
    "Impossible de charger l'affectation."
  );
  const affectation = affectations?.[0];

  // 2. Mettre à jour le statut
  const result = await apiRequest(
    `${ENDPOINTS.affectationTaches}/${id}`,
    { method: "PATCH", body: JSON.stringify({ statutPersonnel }) },
    "Impossible de mettre à jour le statut."
  );

  // 3. Si le chef valide ("Valider"), vérifier si l'ouvrier peut être libéré
  if (statutPersonnel === "Valider" && affectation?.utilisateurId) {
    await verifierEtLibererOuvrier(affectation.utilisateurId, id);
  }

  return result;
}

export async function supprimerAffectation(id, utilisateurId) {
  await apiRequest(
    `${ENDPOINTS.affectationTaches}/${id}`,
    { method: "DELETE" },
    "Impossible de supprimer l'affectation."
  );

  // Vérifier si l'ouvrier a encore des affectations actives
  await verifierEtLibererOuvrier(utilisateurId, id);
}

// ─── Helper : libère l'ouvrier s'il n'a plus aucune affectation active ────────
async function verifierEtLibererOuvrier(utilisateurId, affectationIdExclue) {
  const toutesAffectations = await apiRequest(
    `${ENDPOINTS.affectationTaches}?utilisateurId=${utilisateurId}`,
    {},
    "Impossible de vérifier les affectations restantes."
  );

  // Statuts qui signifient que l'ouvrier est encore actif sur une tâche
  const STATUTS_ACTIFS = ["Non commencer", "En cours", "Renvoyer", "En attente"];

  const encoreActif = toutesAffectations.some(
    a => a.id !== affectationIdExclue && STATUTS_ACTIFS.includes(a.statutPersonnel)
  );

  if (!encoreActif) {
    await updateDisponibilite(utilisateurId, "Disponible");
  }
}