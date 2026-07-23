import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";
import { getSession } from "../Utils/auth.js";

function normalizePhoto(data) {
    return {
        id: data.id,
        tacheId: data.tacheId,
        utilisateurId: data.utilisateurId,
        url: data.url,
        dateDeCreation: data.dateDeCreation ?? new Date().toISOString(),
    };
}

export async function getPhotosByTache(tacheId) {
    return apiRequest(
        `${ENDPOINTS.photos}?tacheId=${tacheId}`,
        {},
        "Impossible de charger les photos."
    );
}

export async function createPhoto(data) {
    required(data.url, "L'URL de la photo est obligatoire.");
    required(data.tacheId, "La tâche est obligatoire.");

    const session = getSession();

    const photo = normalizePhoto({
        id: createId("photo"),
        utilisateurId: session?.id,
        ...data,
    });

    return apiRequest(
        ENDPOINTS.photos,
        { method: "POST", body: JSON.stringify(photo) },
        "Impossible d'enregistrer la photo."
    );
}

export async function deletePhoto(id) {
    return apiRequest(
        `${ENDPOINTS.photos}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer la photo."
    );
}