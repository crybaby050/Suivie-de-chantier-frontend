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
        archive: data.archive ?? false,
    };
}

export async function getPhases() {
    const phases = await apiRequest(ENDPOINTS.phases, {}, "Impossible de charger les phases.");
    return phases.filter(p => !p.archive);
}

export async function getPhasesByProjet(projetId) {
    const phases = await apiRequest(
        `${ENDPOINTS.phases}?projetId=${projetId}`,
        {},
        "Impossible de charger les phases du projet."
    );
    return phases.filter(p => !p.archive);
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

// Archivage doux (n'efface jamais les données)
export async function archiverPhase(id) {
return apiRequest(
`${ENDPOINTS.phases}/${id}`,
        { method: "PATCH", body: JSON.stringify({ archive: true }) },
"Impossible d'archiver la phase."
    );
}

export async function restaurerPhase(id) {
return apiRequest(
`${ENDPOINTS.phases}/${id}`,
        { method: "PATCH", body: JSON.stringify({ archive: false }) },
"Impossible de restaurer la phase."
    );
}

export async function getPhasesArchiveesByProjet(projetId) {
const phases = await apiRequest(
`${ENDPOINTS.phases}?projetId=${projetId}`,
        {},
"Impossible de charger les phases archivées du projet."
    );
return phases.filter(p => p.archive === true);
}