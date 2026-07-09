import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";

export async function getUtilisateurs() {
    return apiRequest(
        ENDPOINTS.utilisateurs,
        {},
        "Impossible de charger les utilisateurs."
    );
}

export async function getUtilisateur(id) {
    return apiRequest(
        `${ENDPOINTS.utilisateurs}/${id}`,
        {},
        "Impossible de charger l'utilisateur."
    );
}

export async function getUtilisateursDisponibles() {
    return apiRequest(
        `${ENDPOINTS.utilisateurs}?statutDisponibilite=Disponible&roleGlobal=Ouvrier`,
        {},
        "Impossible de charger les ouvriers disponibles."
    );
}

export async function getOuvriers() {
    return apiRequest(
        `${ENDPOINTS.utilisateurs}?roleGlobal=Ouvrier`,
        {},
        "Impossible de charger les ouvriers."
    );
}

export async function getChefs() {
    return apiRequest(
        `${ENDPOINTS.utilisateurs}?roleGlobal=Chef de chantier`,
        {},
        "Impossible de charger les chefs de chantier."
    );
}

export async function updateDisponibilite(id, statutDisponibilite) {
    return apiRequest(
        `${ENDPOINTS.utilisateurs}/${id}`,
        {
            method: "PATCH",
            body: JSON.stringify({ statutDisponibilite }),
        },
        "Impossible de mettre à jour la disponibilité."
    );
}