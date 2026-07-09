import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";

function normalizePhase(data) {
    return {
        id: data.id,
        projetId: data.projetId,
        libelle: String(data.libelle).trim(),
        ordre: Number(data.ordre ?? 1),
        dateDeDebut: data.dateDeDebut,
        dateDeFinPrevue: data.dateDeFinPrevue,
        statutPhase: data.statutPhase ?? "En attente",
    };
}

export async function getPhases() {
    return apiRequest(ENDPOINTS.phases, {}, "Impossible de charger les phases.");
}

export async function getPhasesByProjet(projetId) {
    return apiRequest(
        `${ENDPOINTS.phases}?projetId=${projetId}`,
        {},
        "Impossible de charger les phases du projet."
    );
}

export async function createPhase(data) {
    required(data.libelle, "Le libellé de la phase est obligatoire.");
    required(data.projetId, "Le projet est obligatoire.");

    const phase = normalizePhase({
        id: createId("phase"),
        ...data,
    });

    return apiRequest(
        ENDPOINTS.phases,
        { method: "POST", body: JSON.stringify(phase) },
        "Impossible de créer la phase."
    );
}

export async function updatePhase(id, data) {
    required(data.libelle, "Le libellé de la phase est obligatoire.");

    return apiRequest(
        `${ENDPOINTS.phases}/${id}`,
        { method: "PATCH", body: JSON.stringify(normalizePhase({ id, ...data })) },
        "Impossible de modifier la phase."
    );
}

export async function deletePhase(id) {
    return apiRequest(
        `${ENDPOINTS.phases}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer la phase."
    );
}