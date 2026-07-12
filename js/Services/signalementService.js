import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";
import { getSession } from "../Utils/auth.js";

function normalizeSignalement(data) {
    return {
        id: data.id,
        cibleType: data.cibleType, // "Projet" | "Phase" | "Tache" | "Rapport"
        projetId: data.projetId ?? null,
        phaseId: data.phaseId ?? null,
        tacheId: data.tacheId ?? null,
        rapportId: data.rapportId ?? null,
        auteurId: data.auteurId ?? null,
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

export async function getSignalementsByPhase(phaseId) {
    return apiRequest(
        `${ENDPOINTS.signalements}?phaseId=${phaseId}`,
        {},
        "Impossible de charger les signalements de la phase."
    );
}

export async function getSignalementsByTache(tacheId) {
    return apiRequest(
        `${ENDPOINTS.signalements}?tacheId=${tacheId}`,
        {},
        "Impossible de charger les signalements de la tâche."
    );
}

export async function getSignalementsByRapport(rapportId) {
    return apiRequest(
        `${ENDPOINTS.signalements}?rapportId=${rapportId}`,
        {},
        "Impossible de charger les signalements du rapport."
    );
}

export async function createSignalement(data) {
    required(data.titre, "Le titre du signalement est obligatoire.");
    required(data.cibleType, "Le type de cible est obligatoire.");
    required(data.projetId, "Le projet est obligatoire.");

    const session = getSession();

    const signalement = normalizeSignalement({
        id: createId("signal"),
        auteurId: session?.id,
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