import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";
import { updateDisponibilite } from "./utilisateurService.js";

function normalizeAffectation(data) {
    return {
        id: data.id,
        tacheId: data.tacheId,
        utilisateurId: data.utilisateurId,
        dateDeDebut: data.dateDeDebut,
        dateDeFin: data.dateDeFin ?? null,
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

    // Passer l'utilisateur en "Occuper"
    await updateDisponibilite(data.utilisateurId, "Occuper");

    return result;
}

export async function updateStatutAffectation(id, statutPersonnel) {
    return apiRequest(
        `${ENDPOINTS.affectationTaches}/${id}`,
        { method: "PATCH", body: JSON.stringify({ statutPersonnel }) },
        "Impossible de mettre à jour le statut."
    );
}

export async function supprimerAffectation(id, utilisateurId) {
    await apiRequest(
        `${ENDPOINTS.affectationTaches}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer l'affectation."
    );

    // Vérifier si l'utilisateur a d'autres affectations actives
    const autresAffectations = await apiRequest(
        `${ENDPOINTS.affectationTaches}?utilisateurId=${utilisateurId}`,
        {},
        "Impossible de vérifier les affectations restantes."
    );

    const encoreActif = autresAffectations.some(
        (a) => a.id !== id && ["En cours", "Non commencer"].includes(a.statutPersonnel)
    );

    // Repasser en "Disponible" seulement s'il n'a plus d'affectations actives
    if (!encoreActif) {
        await updateDisponibilite(utilisateurId, "Disponible");
    }
}