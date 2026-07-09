import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";

function normalizeSignalement(data) {
    return {
        id: data.id,
        projetId: data.projetId,
        phaseId: data.phaseId ?? null,
        tacheId: data.tacheId ?? null,
        titre: String(data.titre).trim(),
        description: String(data.description ?? "").trim(),
        dateDeSignalement: data.dateDeSignalement ?? new Date().toISOString(),
        statut: data.statut ?? "En traitement",
    };
}

export async function getSignalements() {
    return apiRequest(ENDPOINTS.signalements, {}, "Impossible de charger les signalements.");
}

export async function getSignalementsByProjet(projetId) {
    return apiRequest(
        `${ENDPOINTS.signalements}?projetId=${projetId}`,
        {},
        "Impossible de charger les signalements du projet."
    );
}

export async function createSignalement(data) {
    required(data.titre, "Le titre du signalement est obligatoire.");
    required(data.projetId, "Le projet est obligatoire.");

    const signalement = normalizeSignalement({
        id: createId("signal"),
        ...data,
    });

    return apiRequest(
        ENDPOINTS.signalements,
        { method: "POST", body: JSON.stringify(signalement) },
        "Impossible de créer le signalement."
    );
}

export async function updateStatutSignalement(id, statut) {
    return apiRequest(
        `${ENDPOINTS.signalements}/${id}`,
        { method: "PATCH", body: JSON.stringify({ statut }) },
        "Impossible de mettre à jour le statut."
    );
}

export async function deleteSignalement(id) {
    return apiRequest(
        `${ENDPOINTS.signalements}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer le signalement."
    );
}