import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";
import { getSession } from "../Utils/auth.js";

function normalizeRapport(data) {
    return {
        id: data.id,
        projetId: data.projetId,
        auteurId: data.auteurId,
        date: data.date,
        contenu: String(data.contenu ?? "").trim(),
        statutRapport: data.statutRapport ?? "Brouillon",
        photos: data.photos ?? [],
        supprime: data.supprime ?? false,
    };
}

export async function getRapports() {
    const rapports = await apiRequest(
        ENDPOINTS.rapports,
        {},
        "Impossible de charger les rapports."
    );
    // Exclure les rapports soft-deleted
    return rapports.filter(r => !r.supprime);
}

export async function getRapportsByProjet(projetId) {
    const rapports = await apiRequest(
        `${ENDPOINTS.rapports}?projetId=${projetId}`,
        {},
        "Impossible de charger les rapports du projet."
    );
    return rapports.filter(r => !r.supprime);
}

export async function getRapport(id) {
    return apiRequest(
        `${ENDPOINTS.rapports}/${id}`,
        {},
        "Impossible de charger le rapport."
    );
}

export async function createRapport(data) {
    required(data.contenu, "Le contenu du rapport est obligatoire.");
    required(data.projetId, "Le projet est obligatoire.");

    const session = getSession();

    const rapport = normalizeRapport({
        id: createId("rapport"),
        auteurId: session?.id,
        date: new Date().toISOString().split("T")[0],
        ...data,
    });

    return apiRequest(
        ENDPOINTS.rapports,
        { method: "POST", body: JSON.stringify(rapport) },
        "Impossible de créer le rapport."
    );
}

export async function updateRapport(id, data) {
    required(data.contenu, "Le contenu du rapport est obligatoire.");

    return apiRequest(
        `${ENDPOINTS.rapports}/${id}`,
        { method: "PATCH", body: JSON.stringify(normalizeRapport({ id, ...data })) },
        "Impossible de modifier le rapport."
    );
}

export async function publierRapport(id, rapport) {
    return apiRequest(
        `${ENDPOINTS.rapports}/${id}`,
        { method: "PATCH", body: JSON.stringify({ statutRapport: "Publié" }) },
        "Impossible de publier le rapport."
    );
}

export async function ajouterPhotoRapport(id, url, rapport) {
    const photos = [...(rapport.photos ?? []), url];
    return apiRequest(
        `${ENDPOINTS.rapports}/${id}`,
        { method: "PATCH", body: JSON.stringify({ photos }) },
        "Impossible d'ajouter la photo."
    );
}

export async function supprimerPhotoRapport(id, url, rapport) {
    const photos = (rapport.photos ?? []).filter(p => p !== url);
    return apiRequest(
        `${ENDPOINTS.rapports}/${id}`,
        { method: "PATCH", body: JSON.stringify({ photos }) },
        "Impossible de supprimer la photo."
    );
}

// Soft delete
export async function supprimerRapport(id) {
    return apiRequest(
        `${ENDPOINTS.rapports}/${id}`,
        { method: "PATCH", body: JSON.stringify({ supprime: true }) },
        "Impossible de supprimer le rapport."
    );
}