import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";

export async function getMembres() {
    return apiRequest(ENDPOINTS.projetMembres, {}, "Impossible de charger les membres.");
}

export async function getMembresByProjet(projetId) {
    return apiRequest(
        `${ENDPOINTS.projetMembres}?projetId=${projetId}`,
        {},
        "Impossible de charger les membres du projet."
    );
}

export async function ajouterMembre(projetId, utilisateurId) {
    required(projetId, "Le projet est obligatoire.");
    required(utilisateurId, "L'utilisateur est obligatoire.");

    const membre = {
        id: createId("pm"),
        projetId,
        utilisateurId,
        dateAjout: new Date().toISOString(),
    };

    return apiRequest(
        ENDPOINTS.projetMembres,
        { method: "POST", body: JSON.stringify(membre) },
        "Impossible d'ajouter le membre au projet."
    );
}

export async function retirerMembre(id) {
    return apiRequest(
        `${ENDPOINTS.projetMembres}/${id}`,
        { method: "DELETE" },
        "Impossible de retirer le membre du projet."
    );
}