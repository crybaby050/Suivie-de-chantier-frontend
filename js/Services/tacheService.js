import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required, requireNonNegativeNumber } from "../Utils/validators.js";

function normalizeTache(data) {
    return {
        id: data.id,
        phaseId: data.phaseId,
        titre: String(data.titre).trim(),
        description: String(data.description ?? "").trim(),
        progression: Number(data.progression ?? 0),
        dateDeDebut: data.dateDeDebut,
        dateDeFin: data.dateDeFin,
        statutTache: data.statutTache ?? "A faire",
    };
}

export async function getTaches() {
    return apiRequest(ENDPOINTS.taches, {}, "Impossible de charger les tâches.");
}

export async function getTachesByPhase(phaseId) {
    return apiRequest(
        `${ENDPOINTS.taches}?phaseId=${phaseId}`,
        {},
        "Impossible de charger les tâches de la phase."
    );
}

export async function createTache(data) {
    required(data.titre, "Le titre de la tâche est obligatoire.");
    required(data.phaseId, "La phase est obligatoire.");

    const tache = normalizeTache({
        id: createId("tache"),
        ...data,
    });

    return apiRequest(
        ENDPOINTS.taches,
        { method: "POST", body: JSON.stringify(tache) },
        "Impossible de créer la tâche."
    );
}

export async function updateTache(id, data) {
    required(data.titre, "Le titre de la tâche est obligatoire.");

    return apiRequest(
        `${ENDPOINTS.taches}/${id}`,
        { method: "PATCH", body: JSON.stringify(normalizeTache({ id, ...data })) },
        "Impossible de modifier la tâche."
    );
}

export async function updateProgression(id, progression) {
    requireNonNegativeNumber(progression, "La progression doit être un nombre positif.");

    const pct = Math.min(100, Math.max(0, Number(progression)));
    const statutTache = pct === 100 ? "Terminer" : pct > 0 ? "En cours" : "A faire";

    return apiRequest(
        `${ENDPOINTS.taches}/${id}`,
        {
            method: "PATCH",
            body: JSON.stringify({ progression: pct, statutTache }),
        },
        "Impossible de mettre à jour la progression."
    );
}

export async function deleteTache(id) {
    return apiRequest(
        `${ENDPOINTS.taches}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer la tâche."
    );
}